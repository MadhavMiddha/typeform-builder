"""
Answer validators – pure functions, no DB access.

Each function accepts the question object (or a settings dict) and a raw_value,
validates/normalises it, and either returns a normalised value or raises
a pydantic ValidationError with a structured ``fields`` payload.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set

from pydantic import ValidationError, field_validator
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

class _FieldError(Exception):
    """Carry field-level messages to be wrapped into the standard error shape."""

    def __init__(self, field: str, message: str) -> None:
        self.field = field
        self.message = message
        super().__init__(message)


def _require_non_empty(raw_value: Any, required: bool) -> bool:
    """Return True if value is considered empty.  Raise if required."""
    empty = raw_value is None or (isinstance(raw_value, str) and raw_value.strip() == "")
    if empty and required:
        raise _FieldError("value", "This field is required.")
    return empty


# ---------------------------------------------------------------------------
# Email regex (RFC-lite)
# ---------------------------------------------------------------------------
_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9_.+\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-.]+$"
)


# ---------------------------------------------------------------------------
# Per-type validators
# ---------------------------------------------------------------------------

def validate_short_text(raw_value: Any, required: bool, settings: Dict[str, Any]) -> Optional[str]:
    if _require_non_empty(raw_value, required):
        return None
    value = str(raw_value).strip()
    if len(value) > 255:
        raise _FieldError("value", "Answer must be 255 characters or fewer.")
    return value


def validate_long_text(raw_value: Any, required: bool, settings: Dict[str, Any]) -> Optional[str]:
    if _require_non_empty(raw_value, required):
        return None
    value = str(raw_value).strip()
    if len(value) > 5000:
        raise _FieldError("value", "Answer must be 5000 characters or fewer.")
    return value


def validate_email(raw_value: Any, required: bool, settings: Dict[str, Any]) -> Optional[str]:
    if _require_non_empty(raw_value, required):
        return None
    value = str(raw_value).strip().lower()
    if not _EMAIL_RE.match(value):
        raise _FieldError("value", "Please enter a valid email address.")
    return value


def validate_number(raw_value: Any, required: bool, settings: Dict[str, Any]) -> Optional[float]:
    if _require_non_empty(raw_value, required):
        return None
    try:
        num = float(raw_value)
    except (TypeError, ValueError):
        raise _FieldError("value", "Please enter a valid number.")
    min_val = settings.get("number_min")
    max_val = settings.get("number_max")
    if min_val is not None and num < float(min_val):
        raise _FieldError("value", f"Number must be at least {min_val}.")
    if max_val is not None and num > float(max_val):
        raise _FieldError("value", f"Number must be at most {max_val}.")
    return num


def validate_yes_no(raw_value: Any, required: bool, settings: Dict[str, Any]) -> Optional[bool]:
    if _require_non_empty(raw_value, required):
        return None
    if isinstance(raw_value, bool):
        return raw_value
    if isinstance(raw_value, str):
        if raw_value.lower() in ("true", "yes", "y", "1"):
            return True
        if raw_value.lower() in ("false", "no", "n", "0"):
            return False
    if isinstance(raw_value, int):
        return bool(raw_value)
    raise _FieldError("value", "Please answer Yes or No.")


def validate_rating(raw_value: Any, required: bool, settings: Dict[str, Any]) -> Optional[int]:
    if _require_non_empty(raw_value, required):
        return None
    try:
        rating = int(raw_value)
    except (TypeError, ValueError):
        raise _FieldError("value", "Rating must be a whole number.")
    rating_max = int(settings.get("rating_max", 5))
    if not (3 <= rating_max <= 10):
        rating_max = 5
    if not (1 <= rating <= rating_max):
        raise _FieldError("value", f"Rating must be between 1 and {rating_max}.")
    return rating


def validate_multiple_choice(
    raw_value: Any,
    required: bool,
    settings: Dict[str, Any],
    valid_option_ids: Set[int],
) -> Optional[List[int]]:
    """Return a sorted list of chosen option ids."""
    empty = raw_value is None or raw_value == [] or raw_value == ""
    if empty and required:
        raise _FieldError("value", "Please select at least one option.")
    if empty:
        return None

    allow_multiple = settings.get("allow_multiple", True)

    if isinstance(raw_value, (int, str)):
        ids = [raw_value]
    elif isinstance(raw_value, list):
        ids = raw_value
    else:
        raise _FieldError("value", "Invalid option selection.")

    try:
        id_ints: List[int] = [int(i) for i in ids]
    except (TypeError, ValueError):
        raise _FieldError("value", "Option ids must be integers.")

    unknown = set(id_ints) - valid_option_ids
    if unknown:
        raise _FieldError("value", f"Unknown option id(s): {sorted(unknown)}.")

    if not allow_multiple and len(id_ints) > 1:
        raise _FieldError("value", "Only one option may be selected.")

    if len(id_ints) < 1:
        if required:
            raise _FieldError("value", "Please select at least one option.")
        return None

    return sorted(set(id_ints))


def validate_dropdown(
    raw_value: Any,
    required: bool,
    settings: Dict[str, Any],
    valid_option_ids: Set[int],
) -> Optional[List[int]]:
    """Exactly one option id for dropdown."""
    empty = raw_value is None or raw_value == "" or raw_value == []
    if empty and required:
        raise _FieldError("value", "Please select an option.")
    if empty:
        return None

    if isinstance(raw_value, list):
        if len(raw_value) != 1:
            raise _FieldError("value", "Dropdown accepts exactly one selection.")
        raw_value = raw_value[0]

    try:
        id_int = int(raw_value)
    except (TypeError, ValueError):
        raise _FieldError("value", "Option id must be an integer.")

    if id_int not in valid_option_ids:
        raise _FieldError("value", f"Unknown option id: {id_int}.")

    return [id_int]


# ---------------------------------------------------------------------------
# Normalised result dataclass
# ---------------------------------------------------------------------------
class NormalisedAnswer:
    """Holds the normalised answer components ready to persist."""

    __slots__ = ("value_text", "value_number", "value_bool", "option_ids")

    def __init__(
        self,
        value_text: Optional[str] = None,
        value_number: Optional[float] = None,
        value_bool: Optional[bool] = None,
        option_ids: Optional[List[int]] = None,
    ) -> None:
        self.value_text = value_text
        self.value_number = value_number
        self.value_bool = value_bool
        self.option_ids = option_ids or []


# ---------------------------------------------------------------------------
# Public dispatch function
# ---------------------------------------------------------------------------

class AnswerValidationError(Exception):
    """Raised when validation fails; carries a fields dict."""

    def __init__(self, field: str, message: str) -> None:
        self.fields: Dict[str, str] = {field: message}
        super().__init__(message)


def validate_answer(
    question_type: str,
    required: bool,
    settings: Dict[str, Any],
    raw_value: Any,
    valid_option_ids: Optional[Set[int]] = None,
) -> NormalisedAnswer:
    """
    Dispatch to the right per-type validator and return a NormalisedAnswer.

    Args:
        question_type: One of the 8 question type strings.
        required: Whether a non-empty answer is mandatory.
        settings: The question.settings dict (may be empty).
        raw_value: The raw submitted value from the client.
        valid_option_ids: Set of allowed option ids (required for choice types).

    Returns:
        NormalisedAnswer with the appropriate field set.

    Raises:
        AnswerValidationError if validation fails.
    """
    if valid_option_ids is None:
        valid_option_ids = set()

    try:
        if question_type == "short_text":
            text = validate_short_text(raw_value, required, settings)
            return NormalisedAnswer(value_text=text)

        elif question_type == "long_text":
            text = validate_long_text(raw_value, required, settings)
            return NormalisedAnswer(value_text=text)

        elif question_type == "email":
            text = validate_email(raw_value, required, settings)
            return NormalisedAnswer(value_text=text)

        elif question_type == "number":
            num = validate_number(raw_value, required, settings)
            return NormalisedAnswer(value_number=num)

        elif question_type == "yes_no":
            boolean = validate_yes_no(raw_value, required, settings)
            return NormalisedAnswer(value_bool=boolean)

        elif question_type == "rating":
            rating = validate_rating(raw_value, required, settings)
            return NormalisedAnswer(value_number=float(rating) if rating is not None else None)

        elif question_type == "multiple_choice":
            ids = validate_multiple_choice(raw_value, required, settings, valid_option_ids)
            return NormalisedAnswer(option_ids=ids or [])

        elif question_type == "dropdown":
            ids = validate_dropdown(raw_value, required, settings, valid_option_ids)
            return NormalisedAnswer(option_ids=ids or [])

        else:
            raise AnswerValidationError("question_type", f"Unknown question type: {question_type!r}.")

    except _FieldError as exc:
        raise AnswerValidationError(exc.field, exc.message) from exc
