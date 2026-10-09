"""Efficient creator-side response aggregation and export."""
from __future__ import annotations

import csv
import io
import json
import math
import ast
from datetime import datetime, timedelta, timezone
from collections.abc import Iterator
from typing import Any

from sqlalchemy import String, case, cast, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.answer import Answer
from app.models.answer_option import AnswerOption
from app.models.form import Form
from app.models.question import Question
from app.models.response import Response
from app.models.question_option import QuestionOption
from app.schemas.results import (
    QuestionSummary,
    ResultsAnswerRead,
    ResultsListItem,
    ResultsPage,
    ResultsResponseRead,
    ResultsSummary,
)
from app.services.exceptions import NotFoundError


def _form(db: Session, form_id: int, user_id: int) -> Form:
    form = db.execute(select(Form).where(Form.id == form_id, Form.user_id == user_id)).scalar_one_or_none()
    if form is None:
        raise NotFoundError(f"Form {form_id} not found.")
    return form


def list_responses(
    db: Session, form_id: int, user_id: int, page: int = 1, page_size: int = 25,
    status: str | None = None,
    q: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    sort: str | None = None,
) -> ResultsPage:
    _form(db, form_id, user_id)
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    filters = [Response.form_id == form_id]
    if status in ("partial", "completed"):
        filters.append(Response.status == status)
    if from_date:
        filters.append(Response.started_at >= from_date)
    if to_date:
        filters.append(Response.started_at <= to_date)
    if q and q.strip():
        q_term = f"%{q.strip()}%"
        # Search responses matching answers value_text or question email
        matching_rids = select(Answer.response_id).where(Answer.value_text.ilike(q_term))
        filters.append((cast(Response.id, String).ilike(q_term)) | (Response.id.in_(matching_rids)))

    total = db.scalar(select(func.count(Response.id)).where(*filters)) or 0
    answer_count = func.count(Answer.id)
    preview = func.substr(func.coalesce(func.max(Answer.value_text), ""), 1, 120)
    answer_value = func.coalesce(
        Answer.value_text,
        cast(Answer.value_number, String),
        case((Answer.value_bool.is_(True), "Yes"), (Answer.value_bool.is_(False), "No"), else_=""),
    )
    previews = func.json_group_object(cast(Answer.question_id, String), func.substr(answer_value, 1, 120))

    order_clause = func.coalesce(Response.submitted_at, Response.started_at).desc()
    if sort == "asc":
        order_clause = func.coalesce(Response.submitted_at, Response.started_at).asc()

    rows = db.execute(
        select(
            Response,
            answer_count.label("answer_count"),
            preview.label("answer_preview"),
            previews.label("answer_previews"),
        )
        .outerjoin(Answer, Answer.response_id == Response.id)
        .where(*filters)
        .group_by(Response.id)
        .order_by(order_clause, Response.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    def parse_previews(value: Any) -> dict[str, str]:
        if not value:
            return {}
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            try:
                parsed = ast.literal_eval(value)
            except (ValueError, SyntaxError):
                return {}
        return {str(key): str(item) for key, item in parsed.items()} if isinstance(parsed, dict) else {}

    items = [
        ResultsListItem(
            id=response.id, status=response.status, started_at=response.started_at,
            submitted_at=response.submitted_at, answer_count=int(count or 0),
            answer_preview=str(preview_value) if preview_value else None,
            answer_previews=parse_previews(previews_value),
        )
        for response, count, preview_value, previews_value in rows
    ]
    return ResultsPage(
        items=items, page=page, page_size=page_size, total=total,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


def get_response(db: Session, form_id: int, response_id: int, user_id: int) -> ResultsResponseRead:
    _form(db, form_id, user_id)
    response = db.execute(
        select(Response)
        .where(Response.id == response_id, Response.form_id == form_id)
        .options(selectinload(Response.answers).selectinload(Answer.answer_options))
    ).scalar_one_or_none()
    if response is None:
        raise NotFoundError(f"Response {response_id} not found.")
    answer_ids = [answer.id for answer in response.answers]
    option_labels: dict[int, str] = {}
    if answer_ids:
        option_rows = db.execute(
            select(AnswerOption.answer_id, QuestionOption.label)
            .join(QuestionOption, QuestionOption.id == AnswerOption.option_id)
            .where(AnswerOption.answer_id.in_(answer_ids))
        ).all()
        option_labels = {option_id: label for option_id, label in option_rows}
    question_ids = [answer.question_id for answer in response.answers]
    titles = {}
    if question_ids:
        titles = dict(db.execute(select(Question.id, Question.title).where(Question.id.in_(question_ids))).all())
    answers = [
        ResultsAnswerRead(
            id=answer.id, question_id=answer.question_id, question_title=titles.get(answer.question_id),
            value_text=answer.value_text, value_number=answer.value_number, value_bool=answer.value_bool,
            chosen_option_ids=[x.option_id for x in answer.answer_options],
            chosen_options=[option_labels[x.option_id] for x in answer.answer_options if x.option_id in option_labels],
        )
        for answer in response.answers
    ]
    return ResultsResponseRead(
        id=response.id, form_id=response.form_id, status=response.status,
        started_at=response.started_at, submitted_at=response.submitted_at, answers=answers,
    )


def delete_response(db: Session, form_id: int, response_id: int, user_id: int) -> None:
    _form(db, form_id, user_id)
    response = db.execute(
        select(Response).where(Response.id == response_id, Response.form_id == form_id)
    ).scalar_one_or_none()
    if response is None:
        raise NotFoundError(f"Response {response_id} not found.")
    db.delete(response)
    db.commit()


def get_summary(
    db: Session,
    form_id: int,
    user_id: int,
    days: int = 14,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    status: str | None = None,
) -> ResultsSummary:
    _form(db, form_id, user_id)
    abandoned_cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=30)

    resp_filters = [Response.form_id == form_id]
    if status in ("completed", "partial"):
        resp_filters.append(Response.status == status)
    if from_date:
        resp_filters.append(Response.started_at >= from_date)
    if to_date:
        resp_filters.append(Response.started_at <= to_date)

    total, completed, abandoned = db.execute(
        select(
            func.count(Response.id),
            func.sum(case((Response.status == "completed", 1), else_=0)),
            func.sum(
                case(
                    (Response.status == "partial", case((Response.started_at < abandoned_cutoff, 1), else_=0)),
                    else_=0,
                )
            ),
        )
        .where(*resp_filters)
    ).one()
    total = int(total or 0)
    completed = int(completed or 0)
    questions = db.scalars(
        select(Question).where(Question.form_id == form_id)
        .options(selectinload(Question.options)).order_by(Question.position)
    ).all()
    result: list[QuestionSummary] = []

    matching_response_ids = select(Response.id).where(*resp_filters)

    for question in questions:
        answered = db.scalar(
            select(func.count(Answer.id)).join(Response, Response.id == Answer.response_id)
            .where(Answer.question_id == question.id, Response.id.in_(matching_response_ids))
        ) or 0
        summary = QuestionSummary(
            question_id=question.id, title=question.title, type=question.type,
            answered_count=int(answered), skipped_count=max(0, total - int(answered)),
        )
        if question.type in ("multiple_choice", "dropdown"):
            counts = dict(db.execute(
                select(QuestionOption.id, func.count(AnswerOption.answer_id))
                .outerjoin(AnswerOption, AnswerOption.option_id == QuestionOption.id)
                .outerjoin(Answer, Answer.id == AnswerOption.answer_id)
                .outerjoin(Response, Response.id == Answer.response_id)
                .where(QuestionOption.question_id == question.id)
                .where(Response.id.in_(matching_response_ids) | (Response.id.is_(None)))
                .group_by(QuestionOption.id)
            ).all())
            summary.choices = [
                {"option_id": option.id, "label": option.label, "count": int(counts.get(option.id, 0))}
                for option in sorted(question.options, key=lambda x: x.position)
            ]
            summary.percentages = [
                {**choice, "percentage": round(choice["count"] / int(answered) * 100, 2) if answered else 0}
                for choice in summary.choices
            ]
        elif question.type in ("rating", "number"):
            num_values = [
                float(val) for val, in db.execute(
                    select(Answer.value_number).join(Response, Response.id == Answer.response_id)
                    .where(Answer.question_id == question.id, Response.id.in_(matching_response_ids), Answer.value_number.is_not(None))
                    .order_by(Answer.value_number)
                ).all()
            ]
            if num_values:
                n = len(num_values)
                mean_val = sum(num_values) / n
                summary.average = round(mean_val, 2)
                summary.minimum = min(num_values)
                summary.maximum = max(num_values)
                # Median
                if n % 2 == 1:
                    summary.median = round(num_values[n // 2], 2)
                else:
                    summary.median = round((num_values[n // 2 - 1] + num_values[n // 2]) / 2.0, 2)
                # Sample standard deviation (n - 1)
                if n > 1:
                    variance = sum((x - mean_val) ** 2 for x in num_values) / (n - 1)
                    summary.std_dev = round(math.sqrt(variance), 2)
                else:
                    summary.std_dev = 0.0

            if question.type == "rating":
                raw_distribution = dict(db.execute(
                    select(Answer.value_number, func.count(Answer.id)).join(Response, Response.id == Answer.response_id)
                    .where(Answer.question_id == question.id, Response.id.in_(matching_response_ids), Answer.value_number.is_not(None))
                    .group_by(Answer.value_number).order_by(Answer.value_number)
                ).all())
                try:
                    rating_max = int(json.loads(question.settings or "{}").get("rating_max", 5))
                except (TypeError, ValueError, json.JSONDecodeError):
                    rating_max = 5
                summary.distribution = {
                    str(value): int(raw_distribution.get(value, 0))
                    for value in range(1, rating_max + 1)
                }
        elif question.type == "yes_no":
            summary.yes_count = int(db.scalar(
                select(func.count(Answer.id)).join(Response, Response.id == Answer.response_id)
                .where(Answer.question_id == question.id, Response.id.in_(matching_response_ids), Answer.value_bool.is_(True))
            ) or 0)
            summary.no_count = int(db.scalar(
                select(func.count(Answer.id)).join(Response, Response.id == Answer.response_id)
                .where(Answer.question_id == question.id, Response.id.in_(matching_response_ids), Answer.value_bool.is_(False))
            ) or 0)
        elif question.type in ("short_text", "long_text", "email"):
            summary.latest_answers = [
                value for value, in db.execute(
                    select(Answer.value_text).join(Response, Response.id == Answer.response_id)
                    .where(Answer.question_id == question.id, Response.id.in_(matching_response_ids), Answer.value_text.is_not(None))
                    .order_by(Response.submitted_at.desc(), Response.id.desc()).limit(5)
                ).all()
            ]
        result.append(summary)

    days_count = max(1, min(90, days))
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start_day = (now - timedelta(days=days_count - 1)).date()
    daily_rows = db.execute(
        select(func.date(Response.submitted_at), func.count(Response.id))
        .where(Response.form_id == form_id, Response.status == "completed",
               Response.submitted_at.is_not(None),
               Response.submitted_at >= datetime.combine(start_day, datetime.min.time()))
        .group_by(func.date(Response.submitted_at))
    ).all()
    daily = {str(day): int(count) for day, count in daily_rows}
    responses_per_day = [
        {"date": str(start_day + timedelta(days=index)), "count": daily.get(str(start_day + timedelta(days=index)), 0)}
        for index in range(days_count)
    ]
    average_time = db.scalar(
        select(func.avg(func.julianday(Response.submitted_at) - func.julianday(Response.started_at)) * 86400)
        .where(Response.form_id == form_id, Response.status == "completed",
               Response.submitted_at.is_not(None))
    )
    return ResultsSummary(
        total_responses=total, completed_responses=completed,
        partial_responses=total - completed,
        abandoned_responses=int(abandoned or 0),
        completion_rate=round(completed / total * 100, 2) if total else 0.0,
        questions=result, average_time_seconds=round(float(average_time), 2) if average_time is not None else None,
        responses_per_day=responses_per_day,
    )


def _csv_safe(value: Any) -> str:
    """Prefix formula-injection characters with an apostrophe."""
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@") else text


def _fmt_dt(value: datetime | None) -> str:
    """Format a datetime as 'YYYY-MM-DD HH:mm:ss' (no T, no Z, no fractions)."""
    if value is None:
        return ""
    return value.strftime("%Y-%m-%d %H:%M:%S")


def _collect_export_rows(
    db: Session,
    form_id: int,
    user_id: int,
    *,
    ids: list[int] | None = None,
    status: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    q: str | None = None,
) -> tuple[Form, list[Question], list[dict[str, Any]]]:
    """Validate ownership, fetch questions, and collect all rows as dicts."""
    form = _form(db, form_id, user_id)
    questions = list(db.scalars(
        select(Question).where(Question.form_id == form_id)
        .options(selectinload(Question.options)).order_by(Question.position)
    ).all())

    filters: list[Any] = [Response.form_id == form_id]
    if ids:
        filters.append(Response.id.in_(ids))
    if status in ("completed", "partial"):
        filters.append(Response.status == status)
    elif not ids:
        # Default: only completed when no specific ids filter
        filters.append(Response.status == "completed")
    if from_date:
        filters.append(Response.started_at >= from_date)
    if to_date:
        filters.append(Response.started_at <= to_date)
    if q and q.strip():
        q_term = f"%{q.strip()}%"
        matching_rids = select(Answer.response_id).where(Answer.value_text.ilike(q_term))
        filters.append(Response.id.in_(matching_rids))

    rows = db.execute(
        select(
            Response.id, Response.status, Response.started_at, Response.submitted_at,
            Answer.question_id, Answer.value_text, Answer.value_number, Answer.value_bool,
            QuestionOption.label,
        )
        .outerjoin(Answer, Answer.response_id == Response.id)
        .outerjoin(AnswerOption, AnswerOption.answer_id == Answer.id)
        .outerjoin(QuestionOption, QuestionOption.id == AnswerOption.option_id)
        .where(*filters)
        .order_by(
            func.coalesce(Response.submitted_at, Response.started_at).desc(),
            Response.id.desc(), Answer.id, QuestionOption.position, AnswerOption.option_id,
        )
    ).yield_per(500)

    result_rows: list[dict[str, Any]] = []
    current_id: int | None = None
    current_row: dict[str, Any] = {}
    values: dict[int, str] = {}

    def _flush() -> None:
        result_rows.append({
            "id": current_row["id"], "status": current_row["status"],
            "started_at": current_row["started_at"], "submitted_at": current_row["submitted_at"],
            "values": dict(values),
        })

    for response_id, resp_status, started_at, submitted_at, question_id, value_text, value_number, value_bool, option_label in rows:
        if current_id is not None and response_id != current_id:
            _flush()
            values = {}
        if current_id != response_id:
            current_id = response_id
            current_row = {"id": response_id, "status": resp_status, "started_at": started_at, "submitted_at": submitted_at}
        if question_id is None:
            continue
        if value_text is not None:
            values[question_id] = value_text
        elif value_number is not None:
            v = value_number
            values[question_id] = str(int(v) if v == int(v) else v)
        elif value_bool is not None:
            values[question_id] = "Yes" if value_bool else "No"
        elif option_label is not None:
            values[question_id] = (
                f"{values[question_id]}, {option_label}" if question_id in values else option_label
            )

    if current_id is not None:
        _flush()

    return form, questions, result_rows


def _build_headers(questions: list[Question]) -> list[str]:
    return ["#"] + [q.title for q in questions] + ["Response Type", "Start Date", "Submit Date", "Ending"]


def _row_cells(form: Form, questions: list[Question], row: dict[str, Any]) -> list[str]:
    cells = [str(row["id"])]
    for q in questions:
        cells.append(row["values"].get(q.id, ""))
    cells.append(row["status"].capitalize())
    cells.append(_fmt_dt(row["started_at"]))
    cells.append(_fmt_dt(row["submitted_at"]) if row["submitted_at"] else "")
    cells.append((form.thank_you_title or "") if row["status"] == "completed" else "")
    return cells


def export_csv(
    db: Session,
    form_id: int,
    user_id: int,
    *,
    ids: list[int] | None = None,
    status: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    q: str | None = None,
) -> Iterator[str]:
    """Stream a UTF-8-with-BOM CSV with new column layout (Part G.4)."""
    form, questions, data_rows = _collect_export_rows(
        db, form_id, user_id, ids=ids, status=status, from_date=from_date, to_date=to_date, q=q)
    headers = _build_headers(questions)
    output = io.StringIO()
    output.write("\ufeff")  # UTF-8 BOM
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow([_csv_safe(h) for h in headers])
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)
    for row in data_rows:
        writer.writerow([_csv_safe(c) for c in _row_cells(form, questions, row)])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)


def export_xlsx(
    db: Session,
    form_id: int,
    user_id: int,
    *,
    ids: list[int] | None = None,
    status: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    q: str | None = None,
) -> bytes:
    """Build an XLSX workbook in memory with bold frozen header and auto-sized columns."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill
    from openpyxl.utils import get_column_letter

    form, questions, data_rows = _collect_export_rows(
        db, form_id, user_id, ids=ids, status=status, from_date=from_date, to_date=to_date, q=q)
    headers = _build_headers(questions)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Responses"
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(fill_type="solid", fgColor="F5F5F5")
    ws.freeze_panes = "A2"
    for row_idx, row in enumerate(data_rows, start=2):
        for col_idx, value in enumerate(_row_cells(form, questions, row), start=1):
            ws.cell(row=row_idx, column=col_idx, value=value)
    for col_cells in ws.columns:
        max_len = max((len(str(cell.value or "")) for cell in col_cells), default=0)
        ws.column_dimensions[get_column_letter(col_cells[0].column)].width = min(max_len + 2, 60)
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()
