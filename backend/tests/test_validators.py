"""
Tests for answer_validators.py – 30+ cases covering every question type
with valid, invalid, and empty-required scenarios.
"""
from __future__ import annotations

import pytest

from app.validators.answer_validators import (
    AnswerValidationError,
    NormalisedAnswer,
    validate_answer,
)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def va(q_type, raw, required=False, settings=None, option_ids=None):
    """Shorthand wrapper for validate_answer."""
    return validate_answer(
        question_type=q_type,
        required=required,
        settings=settings or {},
        raw_value=raw,
        valid_option_ids=set(option_ids or []),
    )


def err(q_type, raw, required=False, settings=None, option_ids=None):
    """Assert that validation raises and return the AnswerValidationError."""
    with pytest.raises(AnswerValidationError) as exc_info:
        va(q_type, raw, required=required, settings=settings, option_ids=option_ids)
    return exc_info.value


# ===========================================================================
# 1. short_text
# ===========================================================================

class TestShortText:
    def test_valid_string(self):
        result = va("short_text", "Hello world")
        assert result.value_text == "Hello world"

    def test_strips_whitespace(self):
        result = va("short_text", "  hi  ")
        assert result.value_text == "hi"

    def test_exactly_255_chars(self):
        result = va("short_text", "a" * 255)
        assert len(result.value_text) == 255

    def test_too_long_raises(self):
        e = err("short_text", "a" * 256)
        assert "255" in e.fields["value"]

    def test_empty_not_required_ok(self):
        result = va("short_text", "", required=False)
        assert result.value_text is None

    def test_empty_required_raises(self):
        e = err("short_text", "", required=True)
        assert "required" in e.fields["value"].lower()

    def test_none_required_raises(self):
        e = err("short_text", None, required=True)
        assert "required" in e.fields["value"].lower()


# ===========================================================================
# 2. long_text
# ===========================================================================

class TestLongText:
    def test_valid_long_text(self):
        result = va("long_text", "A" * 4999)
        assert len(result.value_text) == 4999

    def test_exactly_5000_chars(self):
        result = va("long_text", "b" * 5000)
        assert len(result.value_text) == 5000

    def test_too_long_raises(self):
        e = err("long_text", "x" * 5001)
        assert "5000" in e.fields["value"]

    def test_empty_not_required_ok(self):
        result = va("long_text", "")
        assert result.value_text is None

    def test_empty_required_raises(self):
        e = err("long_text", "", required=True)
        assert "required" in e.fields["value"].lower()


# ===========================================================================
# 3. email
# ===========================================================================

class TestEmail:
    def test_valid_email(self):
        result = va("email", "user@example.com")
        assert result.value_text == "user@example.com"

    def test_email_lowercased(self):
        result = va("email", "User@Example.COM")
        assert result.value_text == "user@example.com"

    def test_invalid_no_at(self):
        e = err("email", "notanemail")
        assert "valid email" in e.fields["value"].lower()

    def test_invalid_no_tld(self):
        e = err("email", "user@domain")
        assert "valid email" in e.fields["value"].lower()

    def test_empty_required_raises(self):
        e = err("email", "", required=True)
        assert "required" in e.fields["value"].lower()

    def test_empty_not_required_ok(self):
        result = va("email", None)
        assert result.value_text is None


# ===========================================================================
# 4. number
# ===========================================================================

class TestNumber:
    def test_valid_integer(self):
        result = va("number", 42)
        assert result.value_number == 42.0

    def test_valid_float_string(self):
        result = va("number", "3.14")
        assert abs(result.value_number - 3.14) < 1e-9

    def test_below_min_raises(self):
        e = err("number", 0, settings={"number_min": 1})
        assert "at least" in e.fields["value"].lower()

    def test_above_max_raises(self):
        e = err("number", 100, settings={"number_max": 10})
        assert "at most" in e.fields["value"].lower()

    def test_within_range_ok(self):
        result = va("number", 5, settings={"number_min": 1, "number_max": 10})
        assert result.value_number == 5.0

    def test_non_numeric_raises(self):
        e = err("number", "abc")
        assert "valid number" in e.fields["value"].lower()

    def test_empty_required_raises(self):
        e = err("number", None, required=True)
        assert "required" in e.fields["value"].lower()

    def test_empty_not_required_ok(self):
        result = va("number", None)
        assert result.value_number is None


# ===========================================================================
# 5. yes_no
# ===========================================================================

class TestYesNo:
    def test_true_bool(self):
        result = va("yes_no", True)
        assert result.value_bool is True

    def test_false_bool(self):
        result = va("yes_no", False)
        assert result.value_bool is False

    def test_yes_string(self):
        result = va("yes_no", "yes")
        assert result.value_bool is True

    def test_no_string(self):
        result = va("yes_no", "no")
        assert result.value_bool is False

    def test_invalid_string_raises(self):
        e = err("yes_no", "maybe")
        assert "yes or no" in e.fields["value"].lower()

    def test_empty_required_raises(self):
        e = err("yes_no", None, required=True)
        assert "required" in e.fields["value"].lower()


# ===========================================================================
# 6. rating
# ===========================================================================

class TestRating:
    def test_valid_rating_default_max(self):
        result = va("rating", 3)
        assert result.value_number == 3.0

    def test_rating_max_from_settings(self):
        result = va("rating", 7, settings={"rating_max": 10})
        assert result.value_number == 7.0

    def test_rating_below_1_raises(self):
        e = err("rating", 0)
        assert "between 1" in e.fields["value"].lower()

    def test_rating_above_max_raises(self):
        e = err("rating", 6, settings={"rating_max": 5})
        assert "between 1" in e.fields["value"].lower()

    def test_rating_string_number(self):
        result = va("rating", "4")
        assert result.value_number == 4.0

    def test_rating_non_number_raises(self):
        e = err("rating", "great")
        assert "whole number" in e.fields["value"].lower()

    def test_empty_required_raises(self):
        e = err("rating", None, required=True)
        assert "required" in e.fields["value"].lower()


# ===========================================================================
# 7. multiple_choice
# ===========================================================================

class TestMultipleChoice:
    OPT_IDS = {1, 2, 3, 4, 5}

    def test_single_valid_id(self):
        result = va("multiple_choice", [1], option_ids=self.OPT_IDS)
        assert result.option_ids == [1]

    def test_multiple_valid_ids(self):
        result = va("multiple_choice", [2, 4], settings={"allow_multiple": True}, option_ids=self.OPT_IDS)
        assert result.option_ids == [2, 4]

    def test_unknown_id_raises(self):
        e = err("multiple_choice", [99], option_ids=self.OPT_IDS)
        assert "unknown option" in e.fields["value"].lower()

    def test_disallow_multiple_raises(self):
        e = err("multiple_choice", [1, 2], settings={"allow_multiple": False}, option_ids=self.OPT_IDS)
        assert "one option" in e.fields["value"].lower()

    def test_empty_required_raises(self):
        e = err("multiple_choice", [], required=True, option_ids=self.OPT_IDS)
        assert "select" in e.fields["value"].lower()

    def test_empty_not_required_ok(self):
        result = va("multiple_choice", [], option_ids=self.OPT_IDS)
        assert result.option_ids == []

    def test_scalar_id_accepted(self):
        result = va("multiple_choice", 3, option_ids=self.OPT_IDS)
        assert result.option_ids == [3]

    def test_deduplicates_ids(self):
        result = va("multiple_choice", [1, 1, 2], settings={"allow_multiple": True}, option_ids=self.OPT_IDS)
        assert result.option_ids == [1, 2]


# ===========================================================================
# 8. dropdown
# ===========================================================================

class TestDropdown:
    OPT_IDS = {10, 20, 30}

    def test_valid_single_id(self):
        result = va("dropdown", 10, option_ids=self.OPT_IDS)
        assert result.option_ids == [10]

    def test_valid_as_list(self):
        result = va("dropdown", [20], option_ids=self.OPT_IDS)
        assert result.option_ids == [20]

    def test_multiple_ids_raises(self):
        e = err("dropdown", [10, 20], option_ids=self.OPT_IDS)
        assert "exactly one" in e.fields["value"].lower()

    def test_unknown_id_raises(self):
        e = err("dropdown", 99, option_ids=self.OPT_IDS)
        assert "unknown option" in e.fields["value"].lower()

    def test_empty_required_raises(self):
        e = err("dropdown", None, required=True, option_ids=self.OPT_IDS)
        assert "required" in e.fields["value"].lower() or "select" in e.fields["value"].lower()

    def test_empty_not_required_ok(self):
        result = va("dropdown", None, option_ids=self.OPT_IDS)
        assert result.option_ids == []


# ===========================================================================
# 9. unknown type
# ===========================================================================

class TestUnknownType:
    def test_unknown_type_raises(self):
        e = err("file_upload", "data.pdf")
        assert "unknown question type" in e.fields.get("question_type", "").lower()
