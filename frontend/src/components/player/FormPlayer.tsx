"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  fetchPreviewForm,
  fetchPublicForm,
  startPublicResponse,
  submitPublicResponse,
} from "@/lib/api/public";
import type { PublicFormPayload } from "@/lib/types";
import { validateAnswer } from "@/lib/validation";
import { formPlayerReducer, initialPlayerState } from "./formPlayerReducer";
import { QuestionView } from "./QuestionView";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronUp, ChevronDown, Clock } from "lucide-react";

export function FormPlayer({ publicId }: { publicId: string }) {
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  const formId = Number(searchParams.get("formId"));
  const [form, setForm] = useState<PublicFormPayload | null>(null);
  const [state, dispatch] = useReducer(
    (
      s: ReturnType<typeof initialPlayerState>,
      a: Parameters<typeof formPlayerReducer>[1]
    ) => formPlayerReducer(s, a, form),
    initialPlayerState()
  );
  const [status, setStatus] = useState<
    "loading" | "ready" | "unavailable" | "error"
  >("loading");
  const [message, setMessage] = useState("");
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    (preview && Number.isFinite(formId) && formId > 0
      ? fetchPreviewForm(formId)
      : fetchPublicForm(publicId)
    )
      .then((payload) => {
        if (!cancelled) {
          setForm(payload);
          dispatch({ type: "INIT", form: payload });
          setStatus("ready");
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus(
          error instanceof ApiError &&
            (error.status === 404 || error.status === 403)
            ? "unavailable"
            : "error"
        );
        setMessage(
          error instanceof Error ? error.message : "We couldn't load this form."
        );
      });
    return () => {
      cancelled = true;
    };
  }, [formId, preview, publicId]);

  const current = state.screens[state.currentIndex];

  useEffect(() => {
    if (preview || !form || state.responseId || current?.kind !== "question")
      return;
    void startPublicResponse(publicId)
      .then((response) =>
        dispatch({ type: "SET_RESPONSE_ID", responseId: response.id })
      )
      .catch(() =>
        setMessage("We couldn't start your response. Please try again.")
      );
  }, [current?.kind, form, preview, publicId, state.responseId]);

  const question = useMemo(
    () =>
      current?.kind === "question"
        ? form?.questions.find((q) => q.id === current.questionId)
        : null,
    [current, form]
  );

  const goNext = useCallback(async () => {
    if (!form || !current) return;
    if (current.kind === "question") {
      const activeQuestion = form.questions.find(
        (item) => item.id === current.questionId
      );
      const validationError =
        activeQuestion &&
        validateAnswer(activeQuestion, state.answers[current.questionId]);
      if (validationError) {
        dispatch({
          type: "SET_ERRORS",
          errors: { ...state.errors, [current.questionId]: validationError },
        });
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
      const payloadAnswers = Object.entries(state.answers).map(
        ([qid, val]) => ({
          question_id: Number(qid),
          value: val,
        })
      );
      try {
        await submitPublicResponse(publicId, {
          response_id: state.responseId ?? undefined,
          answers: payloadAnswers,
        });
        dispatch({ type: "SET_SUBMIT_STATUS", status: "success" });
        dispatch({ type: "NEXT" });
      } catch (err) {
        dispatch({ type: "SET_SUBMIT_STATUS", status: "error" });
        setMessage(
          err instanceof ApiError && err.detail?.message
            ? err.detail.message
            : "Submission failed. Please check your answers and try again."
        );
      }
      return;
    }
    dispatch({ type: "NEXT" });
  }, [current, form, preview, publicId, state.answers, state.errors, state.responseId, state.screens.length]);

  const goPrev = useCallback(() => {
    if (state.currentIndex > 0) {
      dispatch({ type: "PREV" });
    }
  }, [state.currentIndex]);

  // Global keyboard navigation
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT";
      if (
        (event.key === "ArrowUp" || event.key === "Escape") &&
        !isTyping &&
        state.currentIndex > 0
      ) {
        event.preventDefault();
        goPrev();
      }
      if (event.key === "ArrowDown" && !isTyping) {
        event.preventDefault();
        void goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, state.currentIndex]);

  // Single-key shortcuts for choice, yes/no, rating
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (
        !question ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (event.target as HTMLElement).tagName
        )
      )
        return;

      if (
        question.type === "yes_no" &&
        ["y", "n"].includes(event.key.toLowerCase())
      ) {
        event.preventDefault();
        dispatch({
          type: "SET_ANSWER",
          questionId: question.id,
          value: event.key.toLowerCase() === "y",
        });
        return;
      }

      if (question.type === "rating" && /^[0-9]$/.test(event.key)) {
        const rating = Number(event.key);
        const max = Number(question.settings?.rating_max ?? 5);
        if (rating >= 1 && rating <= max) {
          event.preventDefault();
          dispatch({
            type: "SET_ANSWER",
            questionId: question.id,
            value: rating,
          });
        }
        return;
      }

      if (question.type === "multiple_choice" && /^[a-z]$/i.test(event.key)) {
        const option =
          question.options[event.key.toUpperCase().charCodeAt(0) - 65];
        if (!option) return;
        event.preventDefault();
        const currentAnswer = Array.isArray(state.answers[question.id])
          ? (state.answers[question.id] as number[])
          : [];
        const allowMultiple = question.settings?.allow_multiple !== false;
        dispatch({
          type: "SET_ANSWER",
          questionId: question.id,
          value: allowMultiple
            ? currentAnswer.includes(option.id)
              ? currentAnswer.filter((id) => id !== option.id)
              : [...currentAnswer, option.id]
            : option.id,
        });
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [question, state.answers]);

  if (status === "loading") return <PlayerMessage title="Loading form…" />;
  if (status === "unavailable")
    return (
      <PlayerMessage
        title="This form isn't available"
        detail={message || "It may be unpublished or no longer exists."}
      />
    );
  if (status === "error" || !form)
    return (
      <PlayerMessage
        title="Something went wrong"
        detail={message || "Unable to load form."}
      />
    );

  // Time estimate calculation: ceil(questions * 15 / 60)
  const timeToCompleteMinutes = Math.max(
    1,
    Math.ceil((form.questions.length * 15) / 60)
  );

  const isLastQuestion = state.currentIndex === state.screens.length - 2;

  // Thank-you screen
  if (current?.kind === "thank_you") {
    return (
      <main className="h-[100dvh] w-full bg-[#fafafa] flex items-center justify-center px-6 text-center text-[#262627]">
        <div className="max-w-md mx-auto">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#262627] text-3xl font-light"
            aria-hidden="true"
          >
            ✓
          </div>
          <h1 className="text-3xl font-normal text-[#262627]">
            {form.thank_you_title || "Thank you!"}
          </h1>
          <p className="mt-3 text-neutral-500 text-lg">
            {form.thank_you_message || "Your response has been submitted."}
          </p>
          {preview && (
            <button
              type="button"
              onClick={() => dispatch({ type: "RESET_ANSWERS" })}
              className="mt-6 rounded-lg bg-[#262627] px-5 py-2.5 text-sm font-medium text-white hover:bg-black transition-colors"
            >
              Restart preview
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      className="h-[100dvh] w-full bg-[#fafafa] text-[#262627] flex flex-col relative overflow-hidden"
      onKeyDownCapture={(event) => {
        const target = event.target as HTMLElement;
        if (event.key === "Enter" && target.tagName !== "TEXTAREA") {
          event.preventDefault();
          void goNext();
        }
      }}
    >
      {/* 3px top progress bar (fill #262627, track #d9d9d9, 300ms transition) */}
      <div
        className="fixed top-0 left-0 w-full h-[3px] bg-[#d9d9d9] z-50"
        aria-label="Form progress"
      >
        <motion.div
          className="h-full bg-[#262627]"
          animate={{
            width: `${Math.max(
              0,
              Math.min(
                100,
                ((state.currentIndex +
                  (current?.kind === "welcome" ? 0 : 1)) /
                  Math.max(1, form.questions.length)) *
                  100
              )
            )}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Preview Ribbon */}
      {preview && (
        <div className="bg-amber-100 px-3 py-1 text-center text-xs text-amber-900 font-medium z-40">
          Preview mode
        </div>
      )}

      {/* Vertically centred content column, max 900px wide */}
      <div className="flex-1 w-full max-w-[900px] mx-auto flex flex-col justify-center px-6 md:px-12 py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={
              current?.kind === "question"
                ? current.questionId
                : current?.kind
            }
            initial={{
              opacity: 0,
              y: reducedMotion ? 0 : state.direction * 36,
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: reducedMotion ? 0 : state.direction * -36,
            }}
            transition={{
              duration: reducedMotion ? 0.15 : 0.35,
              ease: "easeOut",
            }}
            className="w-full"
          >
            {/* Welcome screen: Centred title (44px), description (22px), Start Survey button, time hint */}
            {current?.kind === "welcome" ? (
              <section
                className="text-center space-y-6 max-w-[840px] mx-auto py-4"
                aria-labelledby="welcome-title"
              >
                <h1
                  id="welcome-title"
                  className="text-[44px] font-normal leading-tight text-[#262627]"
                >
                  {form.welcome_title || "Welcome"}
                </h1>
                {form.welcome_description && (
                  <p className="text-[22px] text-[#6b6b6b] max-w-[840px] mx-auto leading-relaxed font-normal">
                    {form.welcome_description}
                  </p>
                )}
                <div className="pt-4 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void goNext()}
                    className="bg-[#262627] hover:bg-black text-white text-[18px] font-bold px-8 py-3 rounded-[8px] transition-colors cursor-pointer"
                  >
                    {form.welcome_button_label || "Start Survey"}
                  </button>
                  <div className="flex items-center gap-1.5 text-base text-[#6b6b6b] mt-1">
                    <Clock size={16} />
                    <span>Takes {timeToCompleteMinutes} minutes</span>
                  </div>
                </div>
              </section>
            ) : (
              question && (
                <QuestionView
                  question={question}
                  value={state.answers[question.id]}
                  error={state.errors[question.id]}
                  onChange={(value) =>
                    dispatch({
                      type: "SET_ANSWER",
                      questionId: question.id,
                      value,
                    })
                  }
                  onAdvance={() => void goNext()}
                  isLastQuestion={isLastQuestion}
                />
              )
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mobile controls (<768px): Back + OK + footer */}
        <div className="md:hidden flex items-center justify-between w-full mt-6 pt-4 border-t border-[#ececec]">
          <button
            type="button"
            onClick={goPrev}
            disabled={state.currentIndex === 0}
            className="px-4 py-2 text-sm text-[#262627] disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void goNext()}
            disabled={state.submitStatus === "submitting"}
            className="rounded-[8px] bg-[#262627] px-6 py-2.5 font-bold text-white text-base disabled:opacity-50"
          >
            {state.submitStatus === "submitting"
              ? "Submitting…"
              : current?.kind === "welcome"
              ? form.welcome_button_label || "Start"
              : isLastQuestion
              ? "Submit"
              : "OK"}
          </button>
        </div>
      </div>

      {/* Desktop fixed bottom-right cluster: Up/Down chevron square buttons + Powered by pill */}
      <div className="hidden md:flex fixed bottom-6 right-6 items-center gap-1.5 z-40">
        <button
          type="button"
          onClick={goPrev}
          disabled={state.currentIndex === 0}
          aria-label="Previous question"
          className="w-10 h-10 rounded-[6px] bg-[#262627] text-white flex items-center justify-center hover:bg-black disabled:bg-[#d1d1d1] disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp size={20} />
        </button>
        <button
          type="button"
          onClick={() => void goNext()}
          aria-label="Next question"
          className="w-10 h-10 rounded-[6px] bg-[#262627] text-white flex items-center justify-center hover:bg-black transition-colors"
        >
          <ChevronDown size={20} />
        </button>
        <div className="h-10 px-4 rounded-[6px] bg-[#262627] text-white text-xs flex items-center font-normal ml-1 select-none">
          Powered by Typeform Builder
        </div>
      </div>
    </main>
  );
}

function PlayerMessage({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <main className="h-[100dvh] w-full bg-[#fafafa] flex items-center justify-center px-6 text-center text-[#262627]">
      <div>
        <h1 className="text-3xl font-normal text-[#262627]">{title}</h1>
        {detail && <p className="mt-3 text-[#6b6b6b] text-lg">{detail}</p>}
      </div>
    </main>
  );
}
