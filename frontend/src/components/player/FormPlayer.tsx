"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { fetchPreviewForm, fetchPublicForm, startPublicResponse, submitPublicResponse } from "@/lib/api/public";
import type { PublicFormPayload } from "@/lib/types";
import { validateAnswer } from "@/lib/validation";
import { formPlayerReducer, initialPlayerState } from "./formPlayerReducer";
import { QuestionView } from "./QuestionView";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";

export function FormPlayer({ publicId }: { publicId: string }) {
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  const formId = Number(searchParams.get("formId"));
  const [form, setForm] = useState<PublicFormPayload | null>(null);
  const [state, dispatch] = useReducer((s: ReturnType<typeof initialPlayerState>, a: Parameters<typeof formPlayerReducer>[1]) => formPlayerReducer(s, a, form), initialPlayerState());
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [message, setMessage] = useState("");
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    (preview && Number.isFinite(formId) && formId > 0 ? fetchPreviewForm(formId) : fetchPublicForm(publicId))
      .then((payload) => { if (!cancelled) { setForm(payload); dispatch({ type: "INIT", form: payload }); setStatus("ready"); } })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus(error instanceof ApiError && (error.status === 404 || error.status === 403) ? "unavailable" : "error");
        setMessage(error instanceof Error ? error.message : "We couldn't load this form.");
      });
    return () => { cancelled = true; };
  }, [formId, preview, publicId]);

  const current = state.screens[state.currentIndex];
  useEffect(() => {
    if (preview || !form || state.responseId || current?.kind !== "question") return;
    void startPublicResponse(publicId)
      .then((response) => dispatch({ type: "SET_RESPONSE_ID", responseId: response.id }))
      .catch(() => setMessage("We couldn't start your response. Please try again."));
  }, [current?.kind, form, preview, publicId, state.responseId]);

  const question = useMemo(() => current?.kind === "question" ? form?.questions.find((q) => q.id === current.questionId) : null, [current, form]);
  const goNext = useCallback(async () => {
    if (!form || !current) return;
    if (current.kind === "question") {
      const activeQuestion = form.questions.find((item) => item.id === current.questionId);
      const validationError = activeQuestion && validateAnswer(activeQuestion, state.answers[current.questionId]);
      if (validationError) {
        dispatch({ type: "SET_ERRORS", errors: { ...state.errors, [current.questionId]: validationError } });
        return;
      }
      const isLastQuestion = state.currentIndex === state.screens.length - 2;
      if (!isLastQuestion) {
        dispatch({ type: "NEXT" });
        return;
      }
      if (preview) {
        dispatch({ type: "NEXT" });
        return;
      }
      dispatch({ type: "SET_SUBMIT_STATUS", status: "submitting" });
      try {
        const responseId = state.responseId;
        if (!responseId) {
          setMessage("We couldn't start your response. Please try again.");
          dispatch({ type: "SET_SUBMIT_STATUS", status: "error" });
          return;
        }
        await submitPublicResponse(publicId, { response_id: responseId, answers: Object.entries(state.answers).map(([question_id, value]) => ({ question_id: Number(question_id), value })) });
        dispatch({ type: "SET_SUBMIT_STATUS", status: "success" });
        dispatch({ type: "NEXT" });
      } catch (error) {
        dispatch({ type: "SET_SUBMIT_STATUS", status: "error" });
        if (error instanceof ApiError && error.detail.fields) {
          const questionIds = new Set(form.questions.map((item) => item.id));
          const fieldErrors: Record<number, string> = {};
          for (const [field, fieldMessage] of Object.entries(error.detail.fields)) {
            const candidates = field.match(/\d+/g)?.map(Number) ?? [];
            const questionId = candidates.find((candidate) => questionIds.has(candidate));
            if (questionId !== undefined) fieldErrors[questionId] = fieldMessage;
          }
          if (Object.keys(fieldErrors).length > 0) {
            dispatch({ type: "SET_ERRORS", errors: { ...state.errors, ...fieldErrors } });
            const firstFailed = form.questions
              .filter((item) => fieldErrors[item.id])
              .sort((a, b) => a.position - b.position)[0];
            if (firstFailed) dispatch({ type: "JUMP_TO_QUESTION", questionId: firstFailed.id });
          }
        }
        setMessage(error instanceof Error ? error.message : "We couldn't submit your response.");
      }
      return;
    }
    if (current.kind === "welcome") { dispatch({ type: "NEXT" }); }
  }, [current, form, preview, publicId, state]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      if ((event.key === "ArrowUp" || event.key === "Escape") && !isTyping && state.currentIndex > 0) dispatch({ type: "PREV" });
      if (event.key === "ArrowDown" && !isTyping) {
        event.preventDefault();
        void goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, state.currentIndex]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!question || ["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName)) return;
      if (question.type === "yes_no" && ["y", "n"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        dispatch({ type: "SET_ANSWER", questionId: question.id, value: event.key.toLowerCase() === "y" });
        return;
      }
      if (question.type === "rating" && /^[0-9]$/.test(event.key)) {
        const rating = Number(event.key);
        const max = Number(question.settings?.rating_max ?? 5);
        if (rating >= 1 && rating <= max) {
          event.preventDefault();
          dispatch({ type: "SET_ANSWER", questionId: question.id, value: rating });
        }
        return;
      }
      if (question.type === "multiple_choice" && /^[a-z]$/i.test(event.key)) {
        const option = question.options[event.key.toUpperCase().charCodeAt(0) - 65];
        if (!option) return;
        event.preventDefault();
        const current = Array.isArray(state.answers[question.id])
          ? state.answers[question.id] as number[]
          : [];
        const allowMultiple = question.settings?.allow_multiple !== false;
        dispatch({
          type: "SET_ANSWER",
          questionId: question.id,
          value: allowMultiple
            ? (current.includes(option.id)
              ? current.filter((id) => id !== option.id)
              : [...current, option.id])
            : option.id,
        });
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [question, state.answers]);

  if (status === "loading") return <PlayerMessage title="Loading form…" />;
  if (status === "unavailable") return <PlayerMessage title="This form is unavailable" detail={message || "It may be unpublished or no longer exists."} />;
  if (status === "error" || !form) return <PlayerMessage title="Something went wrong" detail={message} />;
  const theme = form.theme ?? {};
  const themeStyle = {
    "--form-background": theme.background ?? "#ffffff",
    "--form-question-text": theme.question_text ?? "#262627",
    "--form-answer-accent": theme.answer_accent ?? "#6b5cff",
    "--form-button": theme.button ?? "#262627",
    "--form-font-family": theme.font_family ?? "Karla",
  } as CSSProperties;
  if (current?.kind === "thank_you") return (
    <AnimatePresence mode="wait">
      <motion.main key="thank-you" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={themeStyle} className="min-h-[100dvh] flex items-center justify-center bg-[var(--form-background)] px-6 text-center text-[var(--form-question-text)] [font-family:var(--form-font-family)]">
        <div>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand text-3xl" aria-hidden="true">✓</div>
          <h1 className="text-3xl">{form.thank_you_title || "Thank you!"}</h1>
          <p className="mt-3 text-neutral-500">{form.thank_you_message || "Your response has been submitted."}</p>
          {preview && <button type="button" onClick={() => dispatch({ type: "RESET_ANSWERS" })} className="mt-6 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white">Restart preview</button>}
        </div>
      </motion.main>
    </AnimatePresence>
  );
  return (
    <main
      style={{ ...themeStyle, backgroundImage: theme.background_image ? `url(${theme.background_image})` : undefined }}
      className="min-h-[100dvh] bg-[var(--form-background)] text-[var(--form-question-text)] [font-family:var(--form-font-family)] flex flex-col"
      onKeyDownCapture={(event) => {
        const target = event.target as HTMLElement;
        if (event.key === "Enter" && target.tagName !== "TEXTAREA") {
          event.preventDefault();
          void goNext();
        }
      }}
    >
      <div className="h-1 w-full bg-neutral-200" aria-label="Form progress">
        <motion.div className="h-full bg-[var(--form-answer-accent)]" animate={{ width: `${Math.max(0, Math.min(100, ((state.currentIndex + (current?.kind === "welcome" ? 0 : 1)) / Math.max(1, form.questions.length)) * 100))}%` }} transition={{ duration: 0.35 }} />
      </div>
      {preview && <div className="bg-amber-100 px-3 py-1 text-center text-xs text-amber-900">Preview mode</div>}
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col justify-center px-5 py-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={current?.kind === "question" ? current.questionId : current?.kind} initial={{ opacity: 0, y: reducedMotion ? 0 : state.direction * 32 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : state.direction * -32 }} transition={{ duration: reducedMotion ? 0.15 : 0.35, ease: "easeOut" }}>
            {current?.kind === "welcome" ? <section className="text-center space-y-5" aria-labelledby="welcome-title">
              <h1 id="welcome-title" className="text-4xl font-normal">{form.welcome_title || "Welcome"}</h1>
              {form.welcome_description && <p className="text-lg text-neutral-500">{form.welcome_description}</p>}
            </section> : question && <QuestionView question={question} value={state.answers[question.id]} error={state.errors[question.id]} onChange={(value) => dispatch({ type: "SET_ANSWER", questionId: question.id, value })} />}
          </motion.div>
        </AnimatePresence>
        <div className="flex items-center justify-between max-w-2xl mx-auto w-full mt-6">
          <button type="button" onClick={() => dispatch({ type: "PREV" })} disabled={state.currentIndex === 0} className="px-4 py-2 text-sm disabled:opacity-30">Back</button>
          <button type="button" onClick={() => void goNext()} disabled={state.submitStatus === "submitting"} className="rounded-lg bg-[var(--form-button)] px-6 py-2.5 font-medium text-white disabled:opacity-50">
            {state.submitStatus === "submitting" ? "Submitting…" : current?.kind === "welcome" ? (form.welcome_button_label || "Start") : state.currentIndex === state.screens.length - 2 ? "Submit" : "Continue"}
          </button>
        </div>
        <footer className="mt-auto pt-8 text-center text-xs text-neutral-500">Powered by <strong>Typeform Builder</strong></footer>
        {state.submitStatus === "error" && (
          <div role="alert" className="mt-4 text-center text-sm text-status-error">
            <p>{message}</p>
            <button type="button" onClick={() => void goNext()} className="mt-2 underline">Retry</button>
          </div>
        )}
      </div>
    </main>
  );
}

function PlayerMessage({ title, detail }: { title: string; detail?: string }) {
  return <main className="min-h-screen flex items-center justify-center px-6 text-center font-player"><div><h1 className="text-3xl">{title}</h1>{detail && <p className="mt-3 text-neutral-500">{detail}</p>}</div></main>;
}
