"use client";

import { createContext, useContext, useReducer, ReactNode } from "react";
import type { FormRead, QuestionRead } from "@/lib/types";

export type SelectedItem = "welcome" | "thank_you" | number; // number is questionId
export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface BuilderState {
  form: FormRead | null;
  selectedItem: SelectedItem;
  saveStatus: SaveStatus;
}

type BuilderAction =
  | { type: "SET_FORM"; payload: FormRead }
  | { type: "SET_SELECTED_ITEM"; payload: SelectedItem }
  | { type: "SET_SAVE_STATUS"; payload: SaveStatus }
  | { type: "UPDATE_FORM_FIELD"; payload: { field: keyof FormRead; value: FormRead[keyof FormRead] } }
  | { type: "ADD_QUESTION"; payload: { question: QuestionRead; afterId?: number } }
  | { type: "UPDATE_QUESTION"; payload: { id: number; updates: Partial<QuestionRead> } }
  | { type: "DELETE_QUESTION"; payload: number }
  | { type: "REORDER_QUESTIONS"; payload: QuestionRead[] };

const initialState: BuilderState = {
  form: null,
  selectedItem: "welcome",
  saveStatus: "idle",
};

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "SET_FORM":
      return { ...state, form: action.payload };
    case "SET_SELECTED_ITEM":
      return { ...state, selectedItem: action.payload };
    case "SET_SAVE_STATUS":
      return { ...state, saveStatus: action.payload };
    case "UPDATE_FORM_FIELD":
      if (!state.form) return state;
      return {
        ...state,
        form: { ...state.form, [action.payload.field]: action.payload.value },
      };
    case "ADD_QUESTION":
      if (!state.form) return state;
      const newQuestions = [...state.form.questions];
      if (action.payload.afterId) {
        const index = newQuestions.findIndex((q) => q.id === action.payload.afterId);
        if (index !== -1) {
          newQuestions.splice(index + 1, 0, action.payload.question);
        } else {
          newQuestions.push(action.payload.question);
        }
      } else {
        newQuestions.push(action.payload.question);
      }
      return { ...state, form: { ...state.form, questions: newQuestions } };
    case "UPDATE_QUESTION":
      if (!state.form) return state;
      return {
        ...state,
        form: {
          ...state.form,
          questions: state.form.questions.map((q) =>
            q.id === action.payload.id ? { ...q, ...action.payload.updates } : q
          ),
        },
      };
    case "DELETE_QUESTION":
      if (!state.form) return state;
      return {
        ...state,
        form: {
          ...state.form,
          questions: state.form.questions.filter((q) => q.id !== action.payload),
        },
      };
    case "REORDER_QUESTIONS":
      if (!state.form) return state;
      return { ...state, form: { ...state.form, questions: action.payload } };
    default:
      return state;
  }
}

const BuilderContext = createContext<{
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
} | null>(null);

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(builderReducer, initialState);

  return (
    <BuilderContext.Provider value={{ state, dispatch }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilderStore() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error("useBuilderStore must be used within a BuilderProvider");
  }
  return context;
}
