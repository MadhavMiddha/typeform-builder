"""Response service – public form access and response submission."""
from __future__ import annotations

from datetime import datetime, timezone
import secrets
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models.answer import Answer
from app.models.answer_option import AnswerOption
from app.models.form import Form
from app.models.question import Question
from app.models.response import Response
from app.schemas.response import AnswerCreate
from app.services.exceptions import ConflictError, NotFoundError, ValidationError
from app.validators.answer_validators import AnswerValidationError, NormalisedAnswer, validate_answer


def _now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _load_form_by_public_id(
    db: Session,
    public_id: str,
    *,
    published_only: bool,
) -> Form:
    stmt = (
        select(Form)
        .where(Form.public_id == public_id)
        .options(
            selectinload(Form.questions).selectinload(Question.options),
            selectinload(Form.questions).selectinload(Question.logic_rules),
        )
    )
    if published_only:
        stmt = stmt.where(Form.status == "published")

    form = db.execute(stmt).scalar_one_or_none()
    if form is None:
        raise NotFoundError("Form not found.", code="FORM_NOT_FOUND")
    form.questions.sort(key=lambda q: q.position)
    return form


def get_public_form(db: Session, public_id: str) -> Form:
    return _load_form_by_public_id(db, public_id, published_only=True)


def get_form_preview(db: Session, form_id: int, user_id: int) -> Form:
    form = (
        db.execute(
            select(Form)
            .where(Form.id == form_id, Form.user_id == user_id)
            .options(
                selectinload(Form.questions).selectinload(Question.options),
                selectinload(Form.questions).selectinload(Question.logic_rules),
            )
        )
        .scalar_one_or_none()
    )
    if form is None:
        raise NotFoundError(f"Form {form_id} not found.")
    form.questions.sort(key=lambda q: q.position)
    return form


def start_response(db: Session, public_id: str) -> Response:
    form = get_public_form(db, public_id)
    response = Response(
        form_id=form.id,
        status="partial",
        token=secrets.token_urlsafe(32),
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    return response


def _load_response(db: Session, response_id: int) -> Response:
    """Load a response with its typed answers and selected options."""
    return db.execute(
        select(Response)
        .where(Response.id == response_id)
        .options(
            selectinload(Response.answers).selectinload(Answer.answer_options),
        )
    ).scalar_one()


def _normalise_settings(settings: Any) -> Dict[str, Any]:
    if settings is None:
        return {}
    if isinstance(settings, dict):
        return settings
    if isinstance(settings, str):
        import json

        try:
            parsed = json.loads(settings)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _rule_matches(rule: Any, value: Any) -> bool:
    actual = str(value if value is not None else "").lower()
    expected = str(rule.value if rule.value is not None else "").lower()
    if rule.operator == "equals":
        return expected in [str(item).lower() for item in value] if isinstance(value, list) else actual == expected
    if rule.operator == "not_equals":
        return expected not in [str(item).lower() for item in value] if isinstance(value, list) else actual != expected
    if rule.operator == "contains":
        return expected in [str(item).lower() for item in value] if isinstance(value, list) else expected in actual
    try:
        left, right = float(value), float(rule.value)
    except (TypeError, ValueError):
        return False
    return left > right if rule.operator == "greater_than" else left < right


def _visited_question_ids(form: Form, raw_answers: Dict[int, Any]) -> Set[int]:
    ordered = sorted(form.questions, key=lambda question: question.position)
    by_id = {question.id: question for question in ordered}
    visited: Set[int] = set()
    index = 0
    while 0 <= index < len(ordered):
        question = ordered[index]
        if question.id in visited:
            break
        visited.add(question.id)
        matching = next(
            (rule for rule in question.logic_rules if _rule_matches(rule, raw_answers.get(question.id))),
            None,
        )
        if matching and matching.jump_to_end:
            break
        if matching and matching.jump_to_question_id in by_id:
            index = next(i for i, item in enumerate(ordered) if item.id == matching.jump_to_question_id)
        else:
            index += 1
    return visited


def submit_response(
    db: Session,
    public_id: str,
    answers: List[AnswerCreate],
    response_id: Optional[str] = None,
) -> Response:
    form = get_public_form(db, public_id)
    questions_by_id: Dict[int, Question] = {q.id: q for q in form.questions}
    form_question_ids: Set[int] = set(questions_by_id.keys())

    if response_id is not None:
        response = db.execute(
            select(Response).where(
                Response.token == response_id,
                Response.form_id == form.id,
            )
        ).scalar_one_or_none()
        if response is None:
            raise NotFoundError("Response not found.")
        if response.status == "completed":
            raise ConflictError(
                "This response has already been submitted.",
                code="ALREADY_SUBMITTED",
            )
    else:
        response = None

    fields: Dict[str, str] = {}
    seen_question_ids: Set[int] = set()
    validated: Dict[int, NormalisedAnswer] = {}
    raw_answers = {item.question_id: item.value for item in answers}
    visited_ids = _visited_question_ids(form, raw_answers)

    for item in answers:
        qid = item.question_id
        if qid in seen_question_ids:
            fields[str(qid)] = "Duplicate answer for this question."
            continue
        seen_question_ids.add(qid)

        if qid not in form_question_ids:
            fields[str(qid)] = "Unknown question for this form."
            continue
        if qid not in visited_ids:
            continue

        question = questions_by_id[qid]
        option_ids = {opt.id for opt in question.options}
        settings = _normalise_settings(question.settings)

        try:
            validated[qid] = validate_answer(
                question.type,
                question.required,
                settings,
                item.value,
                option_ids,
            )
        except AnswerValidationError as exc:
            msg = next(iter(exc.fields.values()), "Invalid answer.")
            fields[str(qid)] = msg

    for question in form.questions:
        if not question.required or question.id not in visited_ids:
            continue
        q_title = question.title.rstrip(". \t") if question.title else "Untitled question"
        req_msg = f"Please fill in {q_title}"
        if question.id not in validated:
            if question.type in ("multiple_choice", "dropdown", "yes_no", "rating"):
                fields[str(question.id)] = "Please make a selection"
            else:
                fields[str(question.id)] = req_msg
            continue
        norm = validated[question.id]
        if question.type in ("multiple_choice", "dropdown"):
            if not norm.option_ids:
                fields[str(question.id)] = "Please make a selection"
        elif question.type in ("short_text", "long_text", "email"):
            if not norm.value_text:
                fields[str(question.id)] = req_msg
        elif question.type == "number":
            if norm.value_number is None:
                fields[str(question.id)] = req_msg
        elif question.type == "yes_no":
            if norm.value_bool is None:
                fields[str(question.id)] = "Please make a selection"
        elif question.type == "rating":
            if norm.value_number is None:
                fields[str(question.id)] = "Please make a selection"

    if fields:
        # Validation happens before any response or answer is written, so the
        # caller's transaction remains usable and existing answers are intact.
        raise ValidationError("Answer validation failed.", fields=fields)

    try:
        if response is None:
            response = Response(form_id=form.id, status="partial")
            db.add(response)
            db.flush()

        db.execute(delete(Answer).where(Answer.response_id == response.id))

        for qid, norm in validated.items():
            answer = Answer(
                response_id=response.id,
                question_id=qid,
                value_text=norm.value_text,
                value_number=norm.value_number,
                value_bool=norm.value_bool,
            )
            db.add(answer)
            db.flush()

            for option_id in norm.option_ids:
                db.add(AnswerOption(answer_id=answer.id, option_id=option_id))

        response.status = "completed"
        response.submitted_at = _now_utc()
        db.commit()
        return _load_response(db, response.id)
    except Exception:
        db.rollback()
        raise
