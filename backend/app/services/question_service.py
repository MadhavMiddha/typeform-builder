"""Question service – business logic for question CRUD, ordering, options, and logic.

Keeps routers thin; all validation and state transitions live here.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.form import Form
from app.models.question import Question, VALID_QUESTION_TYPES
from app.models.question_logic import QuestionLogic
from app.models.question_option import QuestionOption
from app.services.exceptions import NotFoundError, ValidationError


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

VALID_OPERATORS = frozenset(
    {"equals", "not_equals", "contains", "greater_than", "less_than"}
)

# Types that get default options when created
_OPTION_TYPES = frozenset({"multiple_choice", "dropdown"})

# Default settings per question type
_DEFAULT_SETTINGS: Dict[str, Dict[str, Any]] = {
    "rating": {"rating_max": 5},
    "number": {},
    "short_text": {},
    "long_text": {},
    "email": {},
    "yes_no": {},
    "multiple_choice": {"allow_multiple": False},
    "dropdown": {},
}

_DEFAULT_OPTIONS = ["Option 1", "Option 2"]


def _now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _get_question_with_form_ownership(
    db: Session, question_id: int, user_id: int
) -> Question:
    """
    Fetch a question and verify the parent form is owned by user_id.
    Returns the Question or raises NotFoundError.
    """
    q = (
        db.execute(
            select(Question)
            .join(Form, Form.id == Question.form_id)
            .where(Question.id == question_id, Form.user_id == user_id)
            .options(
                selectinload(Question.options),
                selectinload(Question.logic_rules),
            )
        )
        .scalar_one_or_none()
    )
    if q is None:
        raise NotFoundError(f"Question {question_id} not found.")
    return q


def _get_form_or_404(db: Session, form_id: int, user_id: int) -> Form:
    form = db.get(Form, form_id)
    if form is None or form.user_id != user_id:
        raise NotFoundError(f"Form {form_id} not found.")
    return form


def _compact_positions(db: Session, form_id: int) -> None:
    """Re-number all questions in form_id to consecutive 1-based positions ordered by current position."""
    questions = (
        db.execute(
            select(Question)
            .where(Question.form_id == form_id)
            .order_by(Question.position)
        )
        .scalars()
        .all()
    )
    for idx, q in enumerate(questions, start=1):
        q.position = idx
    # No commit here – caller commits.


def _default_settings_for_type(question_type: str) -> Dict[str, Any]:
    return dict(_DEFAULT_SETTINGS.get(question_type, {}))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def add_question(
    db: Session,
    form_id: int,
    user_id: int,
    question_type: str,
    title: str = "",
    description: Optional[str] = None,
    required: bool = False,
    settings: Optional[Dict[str, Any]] = None,
    after_id: Optional[int] = None,
    before_id: Optional[int] = None,
) -> Question:
    """
    Add a new question to the form (appended at end or inserted after after_id).

    Sensible defaults:
    - multiple_choice / dropdown → creates two default options ("Option 1", "Option 2")
    - rating → sets rating_max=5 in settings
    - title defaults to the type label if not provided
    """
    _get_form_or_404(db, form_id, user_id)

    if question_type not in VALID_QUESTION_TYPES:
        raise ValidationError(
            f"Invalid question type: {question_type!r}.",
            {"type": f"Must be one of {list(VALID_QUESTION_TYPES)}."},
        )

    # Compute target position
    if before_id is not None:
        target_q = (
            db.execute(
                select(Question).where(Question.id == before_id, Question.form_id == form_id)
            ).scalar_one_or_none()
        )
        target_pos = target_q.position if target_q is not None else (
            db.scalar(select(func.max(Question.position)).where(Question.form_id == form_id)) or 0
        ) + 1
        subsequent = (
            db.execute(
                select(Question)
                .where(Question.form_id == form_id, Question.position >= target_pos)
                .order_by(Question.position.desc())
            ).scalars().all()
        )
        for sq in subsequent:
            sq.position += 1
    elif after_id is not None:
        target_q = (
            db.execute(
                select(Question).where(Question.id == after_id, Question.form_id == form_id)
            ).scalar_one_or_none()
        )
        if target_q is None:
            max_pos = db.scalar(
                select(func.max(Question.position)).where(Question.form_id == form_id)
            )
            target_pos = (max_pos or 0) + 1
        else:
            target_pos = target_q.position + 1
            # Shift subsequent questions up by 1
            subsequent = (
                db.execute(
                    select(Question)
                    .where(Question.form_id == form_id, Question.position >= target_pos)
                    .order_by(Question.position.desc())
                ).scalars().all()
            )
            for sq in subsequent:
                sq.position += 1
    else:
        max_pos = db.scalar(
            select(func.max(Question.position)).where(Question.form_id == form_id)
        )
        target_pos = (max_pos or 0) + 1

    # Merge default settings with caller-provided settings
    merged_settings = _default_settings_for_type(question_type)
    if settings:
        merged_settings.update(settings)

    # Default title if not provided
    effective_title = title if title else ""

    q = Question(
        form_id=form_id,
        position=target_pos,
        type=question_type,
        title=effective_title,
        description=description,
        required=required,
        settings=json.dumps(merged_settings) if merged_settings else None,
    )
    db.add(q)
    db.flush()  # get q.id

    # Add default options for choice types
    if question_type in _OPTION_TYPES:
        for idx, label in enumerate(_DEFAULT_OPTIONS, start=1):
            db.add(QuestionOption(question_id=q.id, label=label, position=idx))

    db.commit()

    # Return with relations
    return _get_question_with_form_ownership(db, q.id, user_id)


def update_question(
    db: Session,
    question_id: int,
    user_id: int,
    *,
    title: Optional[str] = None,
    description: Optional[str] = None,
    required: Optional[bool] = None,
    question_type: Optional[str] = None,
    settings: Optional[Dict[str, Any]] = None,
) -> Question:
    """
    Partial-update a question.

    If *question_type* changes:
    - settings are reset to defaults for the new type
    - all existing options are deleted; default options are added for choice types

    Otherwise settings are merged (shallow) with existing settings.
    """
    q = _get_question_with_form_ownership(db, question_id, user_id)

    type_changed = question_type is not None and question_type != q.type

    if type_changed:
        if question_type not in VALID_QUESTION_TYPES:
            raise ValidationError(
                f"Invalid question type: {question_type!r}.",
                {"type": f"Must be one of {list(VALID_QUESTION_TYPES)}."},
            )
        q.type = question_type
        new_settings = _default_settings_for_type(question_type)
        q.settings = json.dumps(new_settings) if new_settings else None

        # Delete old options
        db.execute(
            QuestionOption.__table__.delete().where(  # type: ignore[attr-defined]
                QuestionOption.question_id == question_id
            )
        )
        # Add defaults for new type if it's a choice type
        if question_type in _OPTION_TYPES:
            for idx, label in enumerate(_DEFAULT_OPTIONS, start=1):
                db.add(QuestionOption(question_id=question_id, label=label, position=idx))
    else:
        # Merge settings
        if settings is not None:
            existing: Dict[str, Any] = json.loads(q.settings) if q.settings else {}
            existing.update(settings)
            q.settings = json.dumps(existing) if existing else None

    if title is not None:
        q.title = title
    if description is not None:
        q.description = description
    if required is not None:
        q.required = required

    q.updated_at = _now_utc()
    db.commit()

    return _get_question_with_form_ownership(db, question_id, user_id)


def delete_question(db: Session, question_id: int, user_id: int) -> None:
    """
    Delete a question then re-compact positions so they remain consecutive.
    """
    q = _get_question_with_form_ownership(db, question_id, user_id)
    form_id = q.form_id
    db.delete(q)
    db.flush()
    _compact_positions(db, form_id)
    db.commit()


def reorder_questions(
    db: Session,
    form_id: int,
    user_id: int,
    ordered_ids: List[int],
) -> List[Question]:
    """
    Reorder questions by supplying the complete ordered list of question ids.

    Validates that *ordered_ids* is exactly the set of question ids belonging
    to the form. Updates positions in a single transaction.
    """
    _get_form_or_404(db, form_id, user_id)

    existing_questions = (
        db.execute(select(Question).where(Question.form_id == form_id))
        .scalars()
        .all()
    )
    existing_ids = {q.id for q in existing_questions}
    provided_ids = set(ordered_ids)

    if provided_ids != existing_ids:
        missing = existing_ids - provided_ids
        extra = provided_ids - existing_ids
        msg_parts = []
        if missing:
            msg_parts.append(f"missing ids: {sorted(missing)}")
        if extra:
            msg_parts.append(f"unknown ids: {sorted(extra)}")
        raise ValidationError(
            "ordered_ids must match the form's question ids exactly. " + "; ".join(msg_parts),
            {"ordered_ids": "; ".join(msg_parts)},
        )

    id_to_q = {q.id: q for q in existing_questions}
    for new_pos, qid in enumerate(ordered_ids, start=1):
        id_to_q[qid].position = new_pos

    db.commit()

    return sorted(existing_questions, key=lambda q: q.position)


def replace_options(
    db: Session,
    question_id: int,
    user_id: int,
    option_labels: List[str],
) -> Question:
    """
    Replace ALL options for a question with the provided labels.

    Rules:
    - 2 ≤ len(option_labels) ≤ 20
    - Positions reassigned 1..n
    - Existing option ids are preserved where the label matches the same position
      (best-effort; simplifies frontend diff without breaking existing answer_options refs)
    """
    q = _get_question_with_form_ownership(db, question_id, user_id)

    if len(option_labels) < 2:
        raise ValidationError(
            "A question must have at least 2 options.",
            {"options": "Minimum 2 options required."},
        )
    if len(option_labels) > 20:
        raise ValidationError(
            "A question may have at most 20 options.",
            {"options": "Maximum 20 options allowed."},
        )

    # Build a map of existing options by position for id preservation
    existing_by_pos = {opt.position: opt for opt in q.options}

    # Determine which existing options to reuse vs. delete
    to_delete_ids = set(opt.id for opt in q.options)

    new_options: List[QuestionOption] = []
    for idx, label in enumerate(option_labels, start=1):
        existing = existing_by_pos.get(idx)
        if existing and existing.label == label:
            # Preserve the id – just keep it, remove from delete set
            to_delete_ids.discard(existing.id)
            existing.position = idx
            new_options.append(existing)
        else:
            # Create a new option
            opt = QuestionOption(question_id=question_id, label=label, position=idx)
            db.add(opt)
            new_options.append(opt)

    # Delete options that are no longer present
    for opt_id in to_delete_ids:
        opt = db.get(QuestionOption, opt_id)
        if opt:
            db.delete(opt)

    q.updated_at = _now_utc()
    db.commit()

    return _get_question_with_form_ownership(db, question_id, user_id)


def replace_logic(
    db: Session,
    question_id: int,
    user_id: int,
    logic_rules: List[Dict[str, Any]],
) -> Question:
    """
    Stub that validates and persists logic rules for a question.

    Validates:
    - operator is one of the 5 allowed values
    - jump_to_question_id (if given) refers to a question in the same form
    - jump_to_end must be bool
    - each rule has exactly one destination (jump_to_question_id xor jump_to_end=True)

    Replaces ALL logic rules for the question.
    """
    q = _get_question_with_form_ownership(db, question_id, user_id)

    # Validate all rules before making any changes
    form_question_ids = set(
        db.execute(
            select(Question.id).where(Question.form_id == q.form_id)
        )
        .scalars()
        .all()
    )

    for i, rule in enumerate(logic_rules):
        operator = rule.get("operator")
        if operator not in VALID_OPERATORS:
            raise ValidationError(
                f"Rule {i}: invalid operator {operator!r}.",
                {"operator": f"Must be one of {sorted(VALID_OPERATORS)}."},
            )
        jump_to = rule.get("jump_to_question_id")
        jump_end = bool(rule.get("jump_to_end", False))

        if jump_to is not None and jump_end:
            raise ValidationError(
                f"Rule {i}: cannot set both jump_to_question_id and jump_to_end.",
                {"jump": "Choose one destination."},
            )
        if jump_to is not None and jump_to not in form_question_ids:
            raise ValidationError(
                f"Rule {i}: jump_to_question_id {jump_to} not in this form.",
                {"jump_to_question_id": f"Question {jump_to} not found in form."},
            )

    # Delete existing logic rules
    for rule in q.logic_rules:
        db.delete(rule)
    db.flush()

    # Insert new rules
    for rule in logic_rules:
        db.add(
            QuestionLogic(
                question_id=question_id,
                operator=rule["operator"],
                value=rule.get("value"),
                jump_to_question_id=rule.get("jump_to_question_id"),
                jump_to_end=bool(rule.get("jump_to_end", False)),
            )
        )

    q.updated_at = _now_utc()
    db.commit()

    return _get_question_with_form_ownership(db, question_id, user_id)
