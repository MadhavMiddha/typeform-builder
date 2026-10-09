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
) -> ResultsPage:
    _form(db, form_id, user_id)
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    filters = [Response.form_id == form_id]
    if status in ("partial", "completed"):
        filters.append(Response.status == status)
    total = db.scalar(select(func.count(Response.id)).where(*filters)) or 0
    answer_count = func.count(Answer.id)
    preview = func.substr(func.coalesce(func.max(Answer.value_text), ""), 1, 120)
    answer_value = func.coalesce(
        Answer.value_text,
        cast(Answer.value_number, String),
        case((Answer.value_bool.is_(True), "Yes"), (Answer.value_bool.is_(False), "No"), else_=""),
    )
    previews = func.json_group_object(cast(Answer.question_id, String), func.substr(answer_value, 1, 120))
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
        .order_by(func.coalesce(Response.submitted_at, Response.started_at).desc(), Response.id.desc())
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


def get_summary(db: Session, form_id: int, user_id: int) -> ResultsSummary:
    _form(db, form_id, user_id)
    abandoned_cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=30)
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
        .where(Response.form_id == form_id)
    ).one()
    total = int(total or 0)
    completed = int(completed or 0)
    questions = db.scalars(
        select(Question).where(Question.form_id == form_id)
        .options(selectinload(Question.options)).order_by(Question.position)
    ).all()
    result: list[QuestionSummary] = []
    for question in questions:
        answered = db.scalar(
            select(func.count(Answer.id)).join(Response, Response.id == Answer.response_id)
            .where(Answer.question_id == question.id, Response.form_id == form_id)
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
                .where((Response.form_id == form_id) | (Response.id.is_(None)))
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
        elif question.type == "rating":
            average, minimum, maximum = db.execute(
                select(func.avg(Answer.value_number), func.min(Answer.value_number), func.max(Answer.value_number))
                .join(Response, Response.id == Answer.response_id)
                .where(Answer.question_id == question.id, Response.form_id == form_id)
            ).one()
            summary.average = round(float(average), 2) if average is not None else None
            summary.minimum = float(minimum) if minimum is not None else None
            summary.maximum = float(maximum) if maximum is not None else None
            raw_distribution = dict(db.execute(
                select(Answer.value_number, func.count(Answer.id)).join(Response, Response.id == Answer.response_id)
                .where(Answer.question_id == question.id, Response.form_id == form_id)
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
                .where(Answer.question_id == question.id, Response.form_id == form_id, Answer.value_bool.is_(True))
            ) or 0)
            summary.no_count = int(db.scalar(
                select(func.count(Answer.id)).join(Response, Response.id == Answer.response_id)
                .where(Answer.question_id == question.id, Response.form_id == form_id, Answer.value_bool.is_(False))
            ) or 0)
        elif question.type == "number":
            minimum, average, maximum = db.execute(
                select(func.min(Answer.value_number), func.avg(Answer.value_number), func.max(Answer.value_number))
                .join(Response, Response.id == Answer.response_id)
                .where(Answer.question_id == question.id, Response.form_id == form_id)
            ).one()
            summary.minimum = float(minimum) if minimum is not None else None
            summary.average = round(float(average), 2) if average is not None else None
            summary.maximum = float(maximum) if maximum is not None else None
        elif question.type in ("short_text", "long_text", "email"):
            summary.latest_answers = [
                value for value, in db.execute(
                    select(Answer.value_text).join(Response, Response.id == Answer.response_id)
                    .where(Answer.question_id == question.id, Response.form_id == form_id, Answer.value_text.is_not(None))
                    .order_by(Response.submitted_at.desc(), Response.id.desc()).limit(5)
                ).all()
            ]
        result.append(summary)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start_day = (now - timedelta(days=13)).date()
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
        for index in range(14)
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
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@") else text


def export_csv(db: Session, form_id: int, user_id: int) -> Iterator[str]:
    _form(db, form_id, user_id)
    questions = db.scalars(
        select(Question).where(Question.form_id == form_id)
        .options(selectinload(Question.options)).order_by(Question.position)
    ).all()
    headers = ["submitted_at"] + [q.title for q in questions]
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow([_csv_safe(x) for x in headers])
    yield output.getvalue()
    output.seek(0); output.truncate(0)
    # Stream one ordered join instead of materializing response IDs and issuing
    # one relationship query per response. Multiple rows for an answer are
    # produced when it has multiple selected options and are folded below.
    rows = db.execute(
        select(
            Response.id,
            Response.submitted_at,
            Answer.question_id,
            Answer.value_text,
            Answer.value_number,
            Answer.value_bool,
            QuestionOption.label,
        )
        .outerjoin(Answer, Answer.response_id == Response.id)
        .outerjoin(AnswerOption, AnswerOption.answer_id == Answer.id)
        .outerjoin(QuestionOption, QuestionOption.id == AnswerOption.option_id)
        .where(Response.form_id == form_id, Response.status == "completed")
        .order_by(
            Response.submitted_at,
            Response.id,
            Answer.id,
            QuestionOption.position,
            AnswerOption.option_id,
        )
    ).yield_per(500)

    current_id: int | None = None
    submitted_at: datetime | None = None
    values: dict[int, str] = {}
    for response_id, response_submitted_at, question_id, value_text, value_number, value_bool, option_label in rows:
        if current_id is not None and response_id != current_id:
            writer.writerow([
                _csv_safe(x)
                for x in [submitted_at] + [values.get(q.id, "") for q in questions]
            ])
            yield output.getvalue()
            output.seek(0); output.truncate(0)
            values = {}
        current_id = response_id
        submitted_at = response_submitted_at
        if question_id is None:
            continue
        if value_text is not None:
            values[question_id] = value_text
        elif value_number is not None:
            values[question_id] = str(value_number)
        elif value_bool is not None:
            values[question_id] = str(value_bool).lower()
        elif option_label is not None:
            values[question_id] = (
                f"{values[question_id]}, {option_label}"
                if question_id in values else option_label
            )

    if current_id is not None:
        writer.writerow([
            _csv_safe(x)
            for x in [submitted_at] + [values.get(q.id, "") for q in questions]
        ])
        yield output.getvalue()
