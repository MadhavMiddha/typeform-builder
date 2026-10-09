import type { PublicFormPayload } from "@/lib/types";
import type { AnswerValue } from "@/lib/validation";
import { validateAnswer } from "@/lib/validation";

export type PlayerScreen =
  | { kind: "welcome" }
  | { kind: "question"; questionId: number }
  | { kind: "thank_you" };

export type SubmitStatus = "idle" | "submitting" | "success" | "error";

export interface FormPlayerState {
  screens: PlayerScreen[];
  currentIndex: number;
  direction: 1 | -1;
  answers: Record<number, AnswerValue>;
  errors: Record<number, string>;
  submitStatus: SubmitStatus;
  responseId: string | null;
}

export type FormPlayerAction =
  | { type: "INIT"; form: PublicFormPayload }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SET_ANSWER"; questionId: number; value: AnswerValue }
  | { type: "CLEAR_ERROR"; questionId: number }
  | { type: "SET_ERRORS"; errors: Record<number, string> }
  | { type: "JUMP_TO_QUESTION"; questionId: number }
  | { type: "SET_RESPONSE_ID"; responseId: string }
  | { type: "SET_SUBMIT_STATUS"; status: SubmitStatus }
  | { type: "RESET_ANSWERS" };

export function buildScreens(form: PublicFormPayload): PlayerScreen[] {
  const screens: PlayerScreen[] = [];
  if (form.welcome_title) screens.push({ kind: "welcome" });
  for (const q of form.questions) {
    screens.push({ kind: "question", questionId: q.id });
  }
  screens.push({ kind: "thank_you" });
  return screens;
}

/** Phase 6 jump logic hooks in here. */
export function resolveNextIndex(
  state: FormPlayerState,
  _form: PublicFormPayload
): number {
  return Math.min(state.currentIndex + 1, state.screens.length - 1);
}

export function resolvePrevIndex(state: FormPlayerState): number {
  return Math.max(state.currentIndex - 1, 0);
}

function questionById(form: PublicFormPayload, id: number) {
  return form.questions.find((q) => q.id === id);
}

export function formPlayerReducer(
  state: FormPlayerState,
  action: FormPlayerAction,
  form: PublicFormPayload | null
): FormPlayerState {
  switch (action.type) {
    case "INIT":
      return {
        screens: buildScreens(action.form),
        currentIndex: 0,
        direction: 1,
        answers: {},
        errors: {},
        submitStatus: "idle",
        responseId: null,
      };
    case "SET_ANSWER":
      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: action.value },
        errors: { ...state.errors, [action.questionId]: "" },
      };
    case "CLEAR_ERROR":
      if (!state.errors[action.questionId]) return state;
      return {
        ...state,
        errors: { ...state.errors, [action.questionId]: "" },
      };
    case "SET_ERRORS":
      return { ...state, errors: action.errors };
    case "SET_RESPONSE_ID":
      return { ...state, responseId: action.responseId };
    case "SET_SUBMIT_STATUS":
      return { ...state, submitStatus: action.status };
    case "RESET_ANSWERS":
      return {
        ...state,
        answers: {},
        errors: {},
        responseId: null,
        submitStatus: "idle",
        currentIndex: 0,
        direction: 1,
      };
    case "JUMP_TO_QUESTION": {
      const idx = state.screens.findIndex(
        (s) => s.kind === "question" && s.questionId === action.questionId
      );
      if (idx < 0) return state;
      return { ...state, currentIndex: idx, direction: 1 };
    }
    case "NEXT": {
      const screen = state.screens[state.currentIndex];
      if (screen?.kind === "question" && form) {
        const q = questionById(form, screen.questionId);
        if (q) {
          const err = validateAnswer(q, state.answers[q.id]);
          if (err) {
            return {
              ...state,
              errors: { ...state.errors, [q.id]: err },
            };
          }
        }
      }
      const next = form ? resolveNextIndex(state, form) : state.currentIndex + 1;
      if (next === state.currentIndex) return state;
      return { ...state, currentIndex: next, direction: 1 };
    }
    case "PREV": {
      const prev = resolvePrevIndex(state);
      if (prev === state.currentIndex) return state;
      return { ...state, currentIndex: prev, direction: -1 };
    }
    default:
      return state;
  }
}

export function initialPlayerState(): FormPlayerState {
  return {
    screens: [],
    currentIndex: 0,
    direction: 1,
    answers: {},
    errors: {},
    submitStatus: "idle",
    responseId: null,
  };
}
