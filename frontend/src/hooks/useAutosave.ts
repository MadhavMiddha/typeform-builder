"use client";

import { useEffect, useRef } from "react";
import { useBuilderStore } from "./useBuilderStore";
import { useUpdateForm } from "@/lib/api/forms";
import { useUpdateQuestion } from "@/lib/api/questions";
import type { FormRead, QuestionRead } from "@/lib/types";

export function useAutosave(formId: number) {
  const { state, dispatch } = useBuilderStore();
  const updateForm = useUpdateForm(formId);
  const updateQuestion = useUpdateQuestion(formId);
  const previousRef = useRef<FormRead | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state.form || state.form.id !== formId) return;
    if (!previousRef.current) {
      previousRef.current = state.form;
      return;
    }

    const previous = previousRef.current;
    const current = state.form;
    const formFields: (keyof FormRead)[] = [
      "title", "welcome_title", "welcome_description", "welcome_button_label",
      "thank_you_title", "thank_you_message", "theme",
    ];
    const formUpdates = Object.fromEntries(
      formFields
        .filter((field) => previous[field] !== current[field])
        .map((field) => [field, current[field]])
    ) as Partial<FormRead>;
    const changedQuestions = current.questions.filter((question) => {
      const old = previous.questions.find((item) => item.id === question.id);
      return old && (
        old.title !== question.title ||
        old.description !== question.description ||
        JSON.stringify(old.settings) !== JSON.stringify(question.settings) ||
        old.required !== question.required ||
        old.type !== question.type
      );
    });
    previousRef.current = current;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!Object.keys(formUpdates).length && !changedQuestions.length) return;

    dispatch({ type: "SET_SAVE_STATUS", payload: "saving" });
    timerRef.current = setTimeout(async () => {
      try {
        if (Object.keys(formUpdates).length) await updateForm.mutateAsync(formUpdates);
        await Promise.all(changedQuestions.map((question) => {
          const updates: Partial<QuestionRead> = {
            title: question.title,
            description: question.description,
            required: question.required,
            settings: question.settings,
            type: question.type,
          };
          return updateQuestion.mutateAsync({ qid: question.id, updates });
        }));
        dispatch({ type: "SET_SAVE_STATUS", payload: "saved" });
      } catch {
        dispatch({ type: "SET_SAVE_STATUS", payload: "error" });
      }
    }, 600);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dispatch, formId, state.form, updateForm, updateQuestion]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.saveStatus === "saving" || state.saveStatus === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.saveStatus]);

}
