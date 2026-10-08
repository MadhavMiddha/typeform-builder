from app.validators.answer_validators import validate_answer, AnswerValidationError

def check(name, qtype, required, raw_value, settings=None, valid_opts=None):
    if settings is None:
        settings = {}
    if valid_opts is None:
        valid_opts = set()
    
    try:
        res = validate_answer(qtype, required, settings, raw_value, set(valid_opts))
        print(f"PASS (Didn't raise): {name} -> {getattr(res, 'value_text', getattr(res, 'value_number', getattr(res, 'value_bool', getattr(res, 'option_ids', res))))}")
    except AnswerValidationError as e:
        print(f"FAIL (Raised expected or unexpected): {name} -> {e.fields}")
    except Exception as e:
        print(f"ERROR: {name} -> {e}")

print("Running 15 edge cases...")

# 1. Very long strings
check("very long string short_text", "short_text", False, "a" * 256)
check("very long string long_text", "long_text", False, "a" * 5001)

# 2. Whitespace-only required text
check("whitespace-only short required", "short_text", True, "   ")
check("whitespace-only long required", "long_text", True, "   \n  ")

# 3. 'a@b' email
check("a@b email", "email", False, "a@b")

# 4. rating 0 and 11
check("rating 0", "rating", False, 0)
check("rating 11", "rating", False, 11)

# 5. option id from another question (valid_opts doesn't include it)
check("option id not in valid_opts", "multiple_choice", False, [99], valid_opts=[1, 2, 3])

# 6. empty list for multiple_choice
check("empty list multiple_choice required", "multiple_choice", True, [], valid_opts=[1, 2, 3])

# 7. number as string 'abc'
check("number as string 'abc'", "number", False, "abc")

# 8. booleans as 'yes'
check("boolean as 'yes'", "yes_no", False, "yes")

# 9. Multiple choice with more options than allowed (if limit is 20, but validate doesn't check 20 limit directly without settings?)
# Spec says 2..20 options for multiple choice - wait, that's creation validation, not answer validation. Let's do allow_multiple=False
check("multiple choice allow_multiple=False but sending 2", "multiple_choice", False, [1, 2], settings={"allow_multiple": False}, valid_opts=[1, 2, 3])

# 10. rating with non-number string
check("rating with 'five'", "rating", False, "five")

# 11. Dropdown with multiple options
check("dropdown multiple", "dropdown", False, [1, 2], valid_opts=[1, 2, 3])

# 12. Number out of bounds
check("number min/max out of bounds", "number", False, 25, settings={"number_min": 10, "number_max": 20})

# 13. Email with trailing spaces (should be valid and stripped)
check("email with spaces", "email", False, "test@example.com  ")

# 14. Rating above custom max
check("rating custom max 3, val 4", "rating", False, 4, settings={"rating_max": 3})

# 15. Dropdown with string id
check("dropdown string id", "dropdown", False, "1", valid_opts=[1, 2, 3])
