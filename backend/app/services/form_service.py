"""Form service – all business logic for form CRUD and lifecycle.

Routers must remain thin (HTTP only); everything here is pure Python + SQLAlchemy.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import List

from nanoid import generate as nanoid_generate
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.form import Form
from app.models.question import Question
from app.models.question_option import QuestionOption
from app.models.question_logic import QuestionLogic
from app.models.response import Response
from app.services.exceptions import ConflictError, NotFoundError


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _nanoid() -> str:
    """Generate a 10-character URL-safe nanoid."""
    return nanoid_generate(size=10)


def _get_form_or_404(db: Session, form_id: int, user_id: int) -> Form:
    """Fetch form, raising NotFoundError if it doesn't exist or isn't owned by user_id."""
    form = db.get(Form, form_id)
    if form is None or form.user_id != user_id:
        raise NotFoundError(f"Form {form_id} not found.")
    return form


def _now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def list_forms(db: Session, user_id: int) -> List[Form]:
    """
    Return all forms for *user_id* with a pre-computed response_count attribute.

    Uses a single aggregate subquery – no N+1.
    """
    response_count_subq = (
        select(
            Response.form_id,
            func.count(Response.id).label("cnt"),
        )
        .group_by(Response.form_id)
        .subquery()
    )

    rows = (
        db.execute(
            select(Form, func.coalesce(response_count_subq.c.cnt, 0).label("response_count"))
            .outerjoin(response_count_subq, Form.id == response_count_subq.c.form_id)
            .where(Form.user_id == user_id)
            .order_by(Form.updated_at.desc())
        )
        .all()
    )

    result: List[Form] = []
    for form_row, count in rows:
        form_row.response_count = int(count)  # type: ignore[attr-defined]
        result.append(form_row)
    return result


def create_form(db: Session, user_id: int, title: str | None = None) -> Form:
    """Create a new draft form with sensible defaults."""
    form = Form(
        user_id=user_id,
        public_id=_nanoid(),
        title=title or "Untitled form",
        status="draft",
        welcome_title="Welcome to this form",
        welcome_description="We'd love to hear from you. It only takes a minute.",
        welcome_button_label="Start",
        thank_you_title="Thanks for completing this form!",
        thank_you_message="Your response has been recorded.",
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


def get_form(db: Session, form_id: int, user_id: int) -> Form:
    """
    Return a form with questions, options, and logic eager-loaded.
    Questions are ordered by position.
    """
    form = (
        db.execute(
            select(Form)
            .where(Form.id == form_id, Form.user_id == user_id)
            .options(
                selectinload(Form.questions).options(
                    selectinload(Question.options),
                    selectinload(Question.logic_rules),
                )
            )
        )
        .scalar_one_or_none()
    )
    if form is None:
        raise NotFoundError(f"Form {form_id} not found.")
    return form


def update_form(
    db: Session,
    form_id: int,
    user_id: int,
    *,
    title: str | None = None,
    welcome_title: str | None = None,
    welcome_description: str | None = None,
    welcome_button_label: str | None = None,
    thank_you_title: str | None = None,
    thank_you_message: str | None = None,
    theme: dict | None = None,
) -> Form:
    """Partial-update a form's metadata fields. Only provided (non-None sentinel)
    fields are written. The caller must pass explicit ``None`` via the schema's
    model_fields_set mechanism; see the router."""
    form = _get_form_or_404(db, form_id, user_id)

    if title is not None:
        form.title = title
    if welcome_title is not None:
        form.welcome_title = welcome_title
    if welcome_description is not None:
        form.welcome_description = welcome_description
    if welcome_button_label is not None:
        form.welcome_button_label = welcome_button_label
    if thank_you_title is not None:
        form.thank_you_title = thank_you_title
    if thank_you_message is not None:
        form.thank_you_message = thank_you_message
    if theme is not None:
        form.theme = json.dumps(theme)

    form.updated_at = _now_utc()
    db.commit()
    db.refresh(form)
    return form


def delete_form(db: Session, form_id: int, user_id: int) -> None:
    """Delete a form and all its children (CASCADE handled by FK constraints)."""
    form = _get_form_or_404(db, form_id, user_id)
    db.delete(form)
    db.commit()


def duplicate_form(db: Session, form_id: int, user_id: int) -> Form:
    """
    Deep-copy a form: questions, options, and logic are all copied with fresh ids.
    Logic jump_to_question_id pointers are remapped to the new question ids.
    Responses are NOT copied.
    The copy has status=draft and a new public_id.
    """
    source = get_form(db, form_id, user_id)  # eager-loaded

    new_form = Form(
        user_id=user_id,
        public_id=_nanoid(),
        title=f"{source.title} (copy)",
        status="draft",
        welcome_title=source.welcome_title,
        welcome_description=source.welcome_description,
        welcome_button_label=source.welcome_button_label,
        thank_you_title=source.thank_you_title,
        thank_you_message=source.thank_you_message,
        theme=source.theme,
    )
    db.add(new_form)
    db.flush()  # get new_form.id without committing

    # Map old question id → new question id for remapping logic
    old_to_new_qid: dict[int, int] = {}

    for old_q in sorted(source.questions, key=lambda q: q.position):
        new_q = Question(
            form_id=new_form.id,
            position=old_q.position,
            type=old_q.type,
            title=old_q.title,
            description=old_q.description,
            required=old_q.required,
            settings=old_q.settings,
        )
        db.add(new_q)
        db.flush()  # get new_q.id

        old_to_new_qid[old_q.id] = new_q.id

        for opt in sorted(old_q.options, key=lambda o: o.position):
            new_opt = QuestionOption(
                question_id=new_q.id,
                label=opt.label,
                position=opt.position,
            )
            db.add(new_opt)

    db.flush()

    # Re-add logic rules with remapped jump_to_question_id
    for old_q in source.questions:
        new_qid = old_to_new_qid[old_q.id]
        for rule in old_q.logic_rules:
            new_jump = old_to_new_qid.get(rule.jump_to_question_id) if rule.jump_to_question_id else None
            new_rule = QuestionLogic(
                question_id=new_qid,
                operator=rule.operator,
                value=rule.value,
                jump_to_question_id=new_jump,
                jump_to_end=rule.jump_to_end,
            )
            db.add(new_rule)

    db.commit()
    # Return with eager-load
    return get_form(db, new_form.id, user_id)


def publish_form(db: Session, form_id: int, user_id: int) -> Form:
    """
    Publish a form. Requires at least one question.
    Raises ConflictError if there are no questions.
    Idempotent: publishing an already-published form is a no-op.
    """
    form = _get_form_or_404(db, form_id, user_id)

    question_count = db.scalar(
        select(func.count()).where(Question.form_id == form_id)
    )
    if not question_count:
        raise ConflictError(
            "Cannot publish a form with no questions.",
            code="EMPTY_FORM",
        )

    if form.status != "published":
        form.status = "published"
        form.published_at = _now_utc()
        form.updated_at = _now_utc()
        db.commit()
        db.refresh(form)

    return form


def unpublish_form(db: Session, form_id: int, user_id: int) -> Form:
    """Set the form back to draft. Idempotent."""
    form = _get_form_or_404(db, form_id, user_id)

    if form.status != "draft":
        form.status = "draft"
        form.updated_at = _now_utc()
        db.commit()
        db.refresh(form)

    return form
