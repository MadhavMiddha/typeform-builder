/**
 * TypeScript types mirroring the backend Pydantic schemas.
 * These are the single source of truth for frontend type safety.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Error shape
// ──────────────────────────────────────────────────────────────────────────────

export interface ApiErrorDetail {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

// ──────────────────────────────────────────────────────────────────────────────
// Forms
// ──────────────────────────────────────────────────────────────────────────────

export type FormStatus = "draft" | "published";

export interface FormTheme {
  primary?: string;
  background?: string;
  [key: string]: string | undefined;
}

export interface FormListItem {
  id: number;
  public_id: string;
  title: string;
  status: FormStatus;
  response_count: number;
  updated_at: string;
  created_at: string;
}

export interface FormRead {
  id: number;
  public_id: string;
  user_id: number;
  title: string;
  status: FormStatus;
  welcome_title: string | null;
  welcome_description: string | null;
  welcome_button_label: string | null;
  thank_you_title: string | null;
  thank_you_message: string | null;
  theme: FormTheme | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  questions: QuestionRead[];
}

export interface FormCreate {
  title?: string;
  welcome_title?: string | null;
  welcome_description?: string | null;
  welcome_button_label?: string | null;
  thank_you_title?: string | null;
  thank_you_message?: string | null;
  theme?: FormTheme | null;
}

export type FormUpdate = Partial<FormCreate> & { status?: FormStatus };

// ──────────────────────────────────────────────────────────────────────────────
// Questions
// ──────────────────────────────────────────────────────────────────────────────

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export interface QuestionSettings {
  rating_max?: number;
  allow_multiple?: boolean;
  number_min?: number;
  number_max?: number;
  placeholder?: string;
  [key: string]: unknown;
}

export interface QuestionOptionRead {
  id: number;
  question_id: number;
  label: string;
  position: number;
}

export interface QuestionLogicRead {
  id: number;
  question_id: number;
  operator: string;
  value: string | null;
  jump_to_question_id: number | null;
  jump_to_end: boolean;
}

export interface QuestionRead {
  id: number;
  form_id: number;
  position: number;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  settings: QuestionSettings | null;
  created_at: string;
  updated_at: string;
  options: QuestionOptionRead[];
  logic_rules: QuestionLogicRead[];
}

export interface QuestionCreate {
  type: QuestionType;
  title?: string;
  description?: string | null;
  required?: boolean;
  settings?: QuestionSettings | null;
  position?: number | null;
  after_id?: number | null;
  before_id?: number | null;
}

export type QuestionUpdate = Partial<QuestionCreate>;

export interface QuestionOptionCreate {
  label: string;
  position: number;
}

export interface QuestionLogicCreate {
  operator: string;
  value?: string | null;
  jump_to_question_id?: number | null;
  jump_to_end?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Responses & Answers
// ──────────────────────────────────────────────────────────────────────────────

export type ResponseStatus = "partial" | "completed";

export interface AnswerRead {
  id: number;
  question_id: number;
  value_text: string | null;
  value_number: number | null;
  value_bool: boolean | null;
  chosen_option_ids: number[];
}

export interface ResponseRead {
  id: number;
  form_id: number;
  status: ResponseStatus;
  started_at: string;
  submitted_at: string | null;
  answers: AnswerRead[];
}

export interface ResponseListItem {
  id: number;
  status: ResponseStatus;
  started_at: string;
  submitted_at: string | null;
  answer_count: number;
}

export interface ResponseStartRead {
  id: number;
  form_id: number;
  status: ResponseStatus;
  started_at: string;
}

export interface AnswerCreate {
  question_id: number;
  value?: unknown;
}

export interface ResponseSubmit {
  answers: AnswerCreate[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Health
// ──────────────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
}
