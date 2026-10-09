"use client";

import { QuestionRead, PublicQuestionRead } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlignLeft,
  Hash,
  List,
  CheckSquare,
  Mail,
  ToggleLeft,
  Star,
  Trash2,
  GripVertical,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { AnswerValue } from "@/lib/validation";

interface QuestionViewProps {
  question: QuestionRead | PublicQuestionRead;
  value?: AnswerValue;
  onChange?: (value: AnswerValue) => void;
  isBuilder?: boolean;
  onUpdate?: (updates: Partial<QuestionRead>) => void;
  error?: string;
  onAdvance?: () => void;
  isLastQuestion?: boolean;
}

export const typeIcons: Record<string, React.ReactNode> = {
  short_text: <AlignLeft size={18} className="text-blue-500" />,
  long_text: <AlignLeft size={18} className="text-blue-500" />,
  email: <Mail size={18} className="text-rose-500" />,
  number: <Hash size={18} className="text-amber-500" />,
  multiple_choice: <List size={18} className="text-indigo-500" />,
  dropdown: <CheckSquare size={18} className="text-indigo-500" />,
  yes_no: <ToggleLeft size={18} className="text-indigo-500" />,
  rating: <Star size={18} className="text-emerald-500" />,
};

export function QuestionView({
  question,
  value,
  onChange,
  isBuilder,
  onUpdate,
  error,
  onAdvance,
  isLastQuestion,
}: QuestionViewProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");

  useEffect(() => {
    if (isBuilder && !question.title) {
      titleRef.current?.focus();
    }
  }, [isBuilder, question.id, question.title]);

  const handleTitleBlur = (e: React.FocusEvent<HTMLHeadingElement>) => {
    if (isBuilder && onUpdate) {
      let text = e.currentTarget.textContent || "";
      if (question.required && text.endsWith("*")) {
        text = text.slice(0, -1);
      }
      onUpdate({ title: text.trim() });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleDescriptionBlur = (e: React.FocusEvent<HTMLParagraphElement>) => {
    if (isBuilder && onUpdate) {
      onUpdate({ description: (e.currentTarget.textContent || "").trim() });
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLParagraphElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  // Multiple choice option handlers for builder
  const handleOptionLabelChange = (optId: number, label: string) => {
    if (!onUpdate) return;
    const newOptions = (question.options || []).map((o) =>
      o.id === optId ? { ...o, label } : o
    );
    onUpdate({ options: newOptions });
  };

  const handleAddChoiceAfter = (index: number) => {
    if (!onUpdate) return;
    const current = question.options || [];
    if (current.length >= 20) return;
    const tempId = -Math.floor(Math.random() * 1000000);
    const newOpt = {
      id: tempId,
      question_id: question.id,
      label: `Option ${current.length + 1}`,
      position: index + 2,
    };
    const updated = [...current];
    updated.splice(index + 1, 0, newOpt);
    const reindexed = updated.map((o, i) => ({ ...o, position: i + 1 }));
    onUpdate({ options: reindexed });
  };

  const handleAddChoiceEnd = () => {
    const current = question.options || [];
    handleAddChoiceAfter(current.length - 1);
  };

  const handleDeleteChoice = (optId: number) => {
    if (!onUpdate) return;
    const current = question.options || [];
    if (current.length <= 2) return;
    const updated = current
      .filter((o) => o.id !== optId)
      .map((o, i) => ({ ...o, position: i + 1 }));
    onUpdate({ options: updated });
  };

  const openBulkEdit = () => {
    setBulkText((question.options || []).map((o) => o.label).join("\n"));
    setBulkError("");
    setBulkOpen(true);
  };

  const handleSaveBulk = () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 20);
    if (lines.length < 2) {
      setBulkError("Add at least 2 options.");
      return;
    }
    const newOptions = lines.map((label, i) => ({
      id: question.options[i]?.id ?? -i - 1000,
      question_id: question.id,
      label,
      position: i + 1,
    }));
    onUpdate?.({ options: newOptions });
    setBulkOpen(false);
  };

  const placeholderText =
    (question.settings?.placeholder as string) ||
    (question.type === "email" ? "name@example.com" : "Type your answer here...");

  // -------------------------------------------------------------------------
  // RESPONDENT / PUBLIC VIEW (Part C)
  // -------------------------------------------------------------------------
  if (!isBuilder) {
    const selected = (id: number) =>
      Array.isArray(value) ? value.includes(id) : value === id;
    const setValue = (next: AnswerValue) => onChange?.(next);

    return (
      <div className="w-full text-left" aria-live="polite">
        {/* Question Title Header: 22px black badge, title 32px / weight 400 */}
        <div className="flex items-baseline gap-3 mb-2">
          <div className="w-[22px] h-[22px] rounded-[5px] bg-[#262627] text-white flex items-center justify-center text-[12px] font-bold shrink-0 select-none">
            {question.position}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id={`question-${question.id}`}
              className="text-[32px] leading-[1.25] font-normal text-[#262627]"
            >
              {question.title || "Untitled question"}
              {question.required && (
                <span className="text-[#262627] ml-0.5" aria-hidden="true">
                  *
                </span>
              )}
            </h2>
            {question.description && (
              <p className="text-[20px] text-[#6b6b6b] mt-2 font-normal">
                {question.description}
              </p>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="mt-8 space-y-4">
          {/* Underline text input for short_text, email, number */}
          {(question.type === "short_text" ||
            question.type === "email" ||
            question.type === "number") && (
            <div className="w-full">
              <input
                ref={inputRef}
                autoFocus
                type={
                  question.type === "email"
                    ? "email"
                    : question.type === "number"
                    ? "number"
                    : "text"
                }
                value={value == null ? "" : String(value)}
                onChange={(e) =>
                  setValue(
                    question.type === "number"
                      ? e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                      : e.target.value
                  )
                }
                placeholder={placeholderText}
                className="w-full border-b border-[#ececec] focus:border-b-2 focus:border-[#262627] bg-transparent pb-3 text-[32px] text-[#262627] placeholder:text-[#b3b3b3] placeholder:text-[32px] focus:outline-none transition-colors"
                aria-labelledby={`question-${question.id}`}
                aria-invalid={Boolean(error)}
              />
            </div>
          )}

          {/* Long text: underline textarea with Shift + Enter hint */}
          {question.type === "long_text" && (
            <div className="w-full">
              <textarea
                autoFocus
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholderText}
                rows={3}
                className="w-full resize-none border-b border-[#ececec] focus:border-b-2 focus:border-[#262627] bg-transparent pb-3 text-[32px] text-[#262627] placeholder:text-[#b3b3b3] placeholder:text-[32px] focus:outline-none transition-colors"
                aria-labelledby={`question-${question.id}`}
              />
              <div className="text-[13px] text-[#6b6b6b] mt-2">
                <strong>Shift + Enter</strong> to make a line break
              </div>
            </div>
          )}

          {/* Dropdown */}
          {question.type === "dropdown" && (
            <div className="w-full max-w-md">
              <select
                autoFocus
                value={typeof value === "number" ? value : ""}
                onChange={(e) =>
                  setValue(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full border-b border-[#ececec] focus:border-b-2 focus:border-[#262627] bg-transparent pb-3 text-[24px] text-[#262627] focus:outline-none cursor-pointer"
                aria-labelledby={`question-${question.id}`}
              >
                <option value="">Select an option...</option>
                {question.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Multiple choice (letters A, B, C...) */}
          {question.type === "multiple_choice" && (
            <div className="flex flex-col gap-2 max-w-lg">
              {question.options.map((option, i) => {
                const isSel = selected(option.id);
                return (
                  <button
                    autoFocus={i === 0}
                    type="button"
                    key={option.id}
                    onClick={() => {
                      const allowMultiple =
                        question.settings?.allow_multiple !== false;
                      const current = Array.isArray(value)
                        ? value
                        : value == null
                        ? []
                        : [Number(value)];
                      setValue(
                        allowMultiple
                          ? current.includes(option.id)
                            ? current.filter((id) => id !== option.id)
                            : [...current, option.id]
                          : option.id
                      );
                    }}
                    aria-pressed={isSel}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3.5 py-3 text-left transition-all border",
                      isSel
                        ? "bg-[#262627] text-white border-[#262627]"
                        : "bg-[#f5f5f5] text-[#262627] border-transparent hover:bg-[#ebebeb]"
                    )}
                  >
                    <span
                      className={cn(
                        "w-6 h-6 rounded-[5px] text-xs font-semibold flex items-center justify-center shrink-0 border",
                        isSel
                          ? "bg-white text-[#262627] border-white"
                          : "bg-white text-[#262627] border-[#d1d1d1]"
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-base font-normal">{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Yes / No */}
          {question.type === "yes_no" && (
            <div className="flex items-center gap-3">
              {[
                { label: "Yes", val: true, keyHint: "Y" },
                { label: "No", val: false, keyHint: "N" },
              ].map(({ label, val, keyHint }) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => setValue(val)}
                  aria-pressed={value === val}
                  className={cn(
                    "w-36 flex items-center gap-2.5 rounded-lg px-4 py-3 text-left transition-all border",
                    value === val
                      ? "bg-[#262627] text-white border-[#262627]"
                      : "bg-[#f5f5f5] text-[#262627] border-transparent hover:bg-[#ebebeb]"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-[5px] text-xs font-semibold flex items-center justify-center shrink-0 border",
                      value === val
                        ? "bg-white text-[#262627] border-white"
                        : "bg-white text-[#262627] border-[#d1d1d1]"
                    )}
                  >
                    {keyHint}
                  </span>
                  <span className="text-base font-medium">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Rating */}
          {question.type === "rating" && (
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Rating"
            >
              {Array.from(
                {
                  length: Math.min(
                    10,
                    Math.max(3, Number(question.settings?.rating_max ?? 5))
                  ),
                },
                (_, i) => i + 1
              ).map((rating) => (
                <button
                  type="button"
                  key={rating}
                  onClick={() => setValue(rating)}
                  aria-label={`${rating} out of ${
                    question.settings?.rating_max ?? 5
                  }`}
                  aria-pressed={value === rating}
                  className={cn(
                    "w-12 h-12 rounded-lg border text-lg font-medium transition-all flex items-center justify-center",
                    value === rating
                      ? "bg-[#262627] text-white border-[#262627]"
                      : "bg-[#f5f5f5] text-[#262627] border-transparent hover:bg-[#ebebeb]"
                  )}
                >
                  {rating}
                </button>
              ))}
            </div>
          )}

          {/* Validation Error Pill (Part C.8) */}
          {error && (
            <div
              role="alert"
              className="inline-flex items-center gap-2 px-3.5 py-2 mt-4 rounded-[6px] bg-[#fdecea] border border-[#f5c2bd] text-[#a23b2a] text-sm animate-in fade-in duration-150"
            >
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Left-aligned dark OK button */}
          {onAdvance && (
            <div className="pt-8">
              <Button
                type="button"
                onClick={onAdvance}
                className="bg-[#262627] hover:bg-black text-white text-[18px] font-bold px-6 py-2.5 h-11 rounded-[8px] flex items-center gap-2"
              >
                <span>{isLastQuestion ? "Submit" : "OK"}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // BUILDER CANVAS VIEW
  // -------------------------------------------------------------------------
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-center my-auto py-6">
      {/* Title block with 22px black badge */}
      <div className="flex items-start gap-3">
        <div className="w-[22px] h-[22px] rounded-[5px] bg-[#262627] text-white flex items-center justify-center text-[12px] font-bold shrink-0 mt-1.5 select-none">
          {question.position}
        </div>

        <div className="flex-1 min-w-0">
          <h2
            ref={titleRef}
            contentEditable={isBuilder}
            suppressContentEditableWarning
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            data-placeholder="Question title"
            className={cn(
              "text-[32px] leading-[1.25] font-normal text-[#262627] focus:outline-none transition-colors",
              isBuilder &&
                "hover:bg-neutral-100/70 focus:bg-white rounded px-1.5 -mx-1.5 cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400"
            )}
          >
            {question.title}
            {question.required && (
              <span className="text-[#262627] select-none ml-0.5">*</span>
            )}
          </h2>

          {(question.description || isBuilder) && (
            <p
              contentEditable={isBuilder}
              suppressContentEditableWarning
              onBlur={handleDescriptionBlur}
              onKeyDown={handleDescriptionKeyDown}
              data-placeholder="Description (optional)"
              className={cn(
                "text-[20px] text-[#6b6b6b] mt-2 font-normal focus:outline-none transition-colors",
                isBuilder &&
                  "hover:bg-neutral-100/70 focus:bg-white rounded px-1.5 -mx-1.5 cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400"
              )}
            >
              {question.description}
            </p>
          )}
        </div>
      </div>

      {/* Answer Preview Controls */}
      <div className="mt-8 pl-8">
        {(question.type === "short_text" ||
          question.type === "long_text" ||
          question.type === "email" ||
          question.type === "number") && (
          <div className="w-full border-b border-[#262627] pb-3">
            <span className="text-[32px] font-light text-[#b3b3b3] select-none block truncate">
              {placeholderText}
            </span>
          </div>
        )}

        {question.type === "multiple_choice" && (
          <div className="flex flex-col gap-2.5 max-w-md">
            {(question.options || []).map((opt, i) => (
              <div
                key={opt.id}
                className="group flex items-center gap-2.5 bg-[#f5f5f5] hover:bg-[#ebebeb] rounded-lg px-3 py-2.5 transition-colors"
              >
                {isBuilder && (
                  <GripVertical
                    size={14}
                    className="text-neutral-400 cursor-grab shrink-0"
                  />
                )}
                <span className="w-6 h-6 rounded-[5px] bg-white border border-[#d1d1d1] text-xs font-semibold flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) =>
                    handleOptionLabelChange(opt.id, e.target.value)
                  }
                  className="bg-transparent text-sm text-[#262627] flex-1 focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand rounded px-1"
                />
                {isBuilder && (question.options?.length || 0) > 2 && (
                  <button
                    onClick={() => handleDeleteChoice(opt.id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 p-1 transition-opacity"
                    title="Delete option"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
            {isBuilder && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddChoiceEnd}
                  className="h-7 text-xs"
                >
                  + Add option
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openBulkEdit}
                  className="h-7 text-xs text-neutral-500"
                >
                  Bulk add
                </Button>
              </div>
            )}
          </div>
        )}

        {question.type === "dropdown" && (
          <div className="w-full max-w-xs border-b border-[#262627] pb-3 text-[20px] text-neutral-400">
            Select an option...
          </div>
        )}

        {question.type === "yes_no" && (
          <div className="flex items-center gap-3">
            {[
              { label: "Yes", keyHint: "Y" },
              { label: "No", keyHint: "N" },
            ].map(({ label, keyHint }) => (
              <div
                key={label}
                className="w-36 flex items-center gap-2.5 rounded-lg px-4 py-3 bg-[#f5f5f5] text-[#262627]"
              >
                <span className="w-6 h-6 rounded-[5px] text-xs font-semibold flex items-center justify-center shrink-0 bg-white border border-[#d1d1d1]">
                  {keyHint}
                </span>
                <span className="text-base font-medium">{label}</span>
              </div>
            ))}
          </div>
        )}

        {question.type === "rating" && (
          <div className="flex gap-2">
            {Array.from(
              {
                length: Math.min(
                  10,
                  Math.max(3, Number(question.settings?.rating_max ?? 5))
                ),
              },
              (_, i) => i + 1
            ).map((rating) => (
              <div
                key={rating}
                className="w-12 h-12 rounded-lg bg-[#f5f5f5] text-[#262627] text-lg font-medium flex items-center justify-center"
              >
                {rating}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk edit options</DialogTitle>
            <DialogDescription>
              Enter one option per line. Maximum 20 options.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-neutral-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
            {bulkError && (
              <p className="mt-1 text-xs text-status-error">{bulkError}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button size="sm" onClick={handleSaveBulk}>
              Apply options
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
