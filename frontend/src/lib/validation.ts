/**
 * Client-side answer validation – mirrors backend answer_validators.py rules.
 */
import type { QuestionRead, QuestionType } from "@/lib/types";

type ValidatableQuestion = Pick<QuestionRead, "title" | "required" | "settings" | "type" | "options">;

const EMAIL_RE = /^[a-zA-Z0-9_.+\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-.]+$/;

export type AnswerValue =
  | string
  | number
  | boolean
  | number[]
  | null
  | undefined;

function isEmpty(value: AnswerValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function validateAnswer(
  question: ValidatableQuestion,
  rawValue: AnswerValue
): string | null {
  const settings = question.settings ?? {};
  const required = question.required;

  if (isEmpty(rawValue)) {
    return required ? `Please fill in ${question.title}.` : null;
  }

  switch (question.type as QuestionType) {
    case "short_text": {
      const v = String(rawValue).trim();
      if (v.length > 255) return "Answer must be 255 characters or fewer.";
      return null;
    }
    case "long_text": {
      const v = String(rawValue).trim();
      if (v.length > 5000) return "Answer must be 5000 characters or fewer.";
      return null;
    }
    case "email": {
      const v = String(rawValue).trim().toLowerCase();
      if (!EMAIL_RE.test(v)) return "Hmm... that email doesn't look right";
      return null;
    }
    case "number": {
      const num = Number(rawValue);
      if (Number.isNaN(num)) return "Please enter a valid number.";
      const min = settings.number_min;
      const max = settings.number_max;
      if (min !== undefined && num < Number(min)) {
        return `Number must be at least ${min}.`;
      }
      if (max !== undefined && num > Number(max)) {
        return `Number must be at most ${max}.`;
      }
      return null;
    }
    case "yes_no": {
      if (typeof rawValue !== "boolean") return "Please answer Yes or No.";
      return null;
    }
    case "rating": {
      const rating = Number(rawValue);
      let max = Number(settings.rating_max ?? 5);
      if (max < 3 || max > 10) max = 5;
      if (!Number.isInteger(rating) || rating < 1 || rating > max) {
        return `Rating must be between 1 and ${max}.`;
      }
      return null;
    }
    case "multiple_choice":
      return validateChoice(question, rawValue, settings.allow_multiple !== false);
    case "dropdown":
      return validateChoice(question, rawValue, false, true);
    default:
      return null;
  }
}

function validateChoice(
  question: ValidatableQuestion,
  rawValue: AnswerValue,
  allowMultiple: boolean,
  dropdown = false
): string | null {
  const validIds = new Set((question.options ?? []).map((o) => o.id));
  let ids: number[] = [];

  if (typeof rawValue === "number") ids = [rawValue];
  else if (typeof rawValue === "string" && rawValue !== "") ids = [Number(rawValue)];
  else if (Array.isArray(rawValue)) ids = rawValue.map(Number);

  if (ids.some((id) => Number.isNaN(id))) return "Invalid option selection.";
  if (ids.some((id) => !validIds.has(id))) return "Unknown option for this question.";
  if (dropdown && ids.length !== 1) return "Please select an option.";
  if (!allowMultiple && ids.length > 1) return "Only one option may be selected.";
  if (ids.length < 1) return question.required ? "Please select an option." : null;
  return null;
}

export function canAdvance(question: QuestionRead, value: AnswerValue): boolean {
  return validateAnswer(question, value) === null;
}
