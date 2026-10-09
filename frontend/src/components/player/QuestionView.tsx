"use client";

import { QuestionRead, PublicQuestionRead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlignLeft, Hash, List, CheckSquare, Mail, ToggleLeft, Star, ChevronDown, Trash2, GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { AnswerValue } from "@/lib/validation";

interface QuestionViewProps {
  question: QuestionRead | PublicQuestionRead;
  value?: AnswerValue;
  onChange?: (value: AnswerValue) => void;
  isBuilder?: boolean;
  onUpdate?: (updates: Partial<QuestionRead>) => void;
  error?: string;
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

export function QuestionView({ question, value, onChange, isBuilder, onUpdate, error }: QuestionViewProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
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
      // Remove any trailing asterisk before updating
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

  // Option operations for Multiple Choice
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

  if (!isBuilder) {
    const selected = (id: number) =>
      Array.isArray(value) ? value.includes(id) : value === id;
    const setValue = (next: AnswerValue) => onChange?.(next);
    return (
      <div className="w-full max-w-2xl mx-auto py-6" aria-live="polite">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-[5px] bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1.5">
            {question.position}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={`question-${question.id}`} className="text-3xl leading-snug font-normal text-brand">
              {question.title}{question.required && <span aria-hidden="true">*</span>}
            </h2>
            {question.description && <p className="text-lg italic text-neutral-400 mt-1">{question.description}</p>}
          </div>
        </div>
        <div className="mt-8 pl-8 space-y-3">
          {(question.type === "short_text" || question.type === "email" || question.type === "number") && (
            <input
              autoFocus
              type={question.type === "email" ? "email" : question.type === "number" ? "number" : "text"}
              value={value == null ? "" : String(value)}
              onChange={(e) => setValue(question.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
              placeholder={placeholderText}
              className="w-full border-b border-brand bg-transparent pb-2 text-2xl focus:outline-none"
              aria-labelledby={`question-${question.id}`}
              aria-invalid={Boolean(error)}
            />
          )}
          {question.type === "long_text" && (
            <textarea autoFocus value={typeof value === "string" ? value : ""} onChange={(e) => setValue(e.target.value)}
              placeholder={placeholderText} rows={4} className="w-full resize-none border-b border-brand bg-transparent pb-2 text-2xl focus:outline-none" aria-labelledby={`question-${question.id}`} />
          )}
          {(question.type === "multiple_choice" || question.type === "dropdown") && question.type === "dropdown" && (
            <select autoFocus value={typeof value === "number" ? value : ""} onChange={(e) => setValue(e.target.value ? Number(e.target.value) : "")}
              className="w-full border-b border-brand bg-transparent pb-2 text-xl focus:outline-none" aria-labelledby={`question-${question.id}`}>
              <option value="">Select an option</option>
              {question.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          )}
          {question.type === "multiple_choice" && question.options.map((option, i) => (
            <button autoFocus={i === 0} type="button" key={option.id} onClick={() => {
              const allowMultiple = question.settings?.allow_multiple !== false;
              const current = Array.isArray(value) ? value : value == null ? [] : [Number(value)];
              setValue(allowMultiple ? (current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id]) : option.id);
            }} aria-pressed={selected(option.id)}
              className={cn("w-full max-w-md flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors", selected(option.id) ? "bg-brand text-white" : "bg-neutral-200 hover:bg-neutral-300")}>
              <span className={cn("w-6 h-6 rounded bg-white border text-neutral-700 text-xs flex items-center justify-center", selected(option.id) && "border-white")}>{String.fromCharCode(65 + i)}</span>
              {option.label}
            </button>
          ))}
          {question.type === "yes_no" && [true, false].map((answer, i) => (
            <button autoFocus={i === 0} type="button" key={String(answer)} onClick={() => setValue(answer)} aria-pressed={value === answer}
              className={cn("w-full max-w-xs block rounded-md px-3 py-2.5 text-left", value === answer ? "bg-brand text-white" : "bg-neutral-200 hover:bg-neutral-300")}>
              {answer ? "Yes" : "No"}
            </button>
          ))}
          {question.type === "rating" && (
            <div className="flex gap-2" role="radiogroup" aria-label="Rating">
              {Array.from({ length: Math.min(10, Math.max(3, Number(question.settings?.rating_max ?? 5))) }, (_, i) => i + 1).map((rating) => (
                <button autoFocus={rating === 1} type="button" key={rating} onClick={() => setValue(rating)} aria-label={`${rating} out of ${question.settings?.rating_max ?? 5}`} aria-pressed={value === rating}
                  className={cn("w-10 h-10 rounded border", value === rating ? "bg-brand text-white" : "hover:bg-neutral-200")}>{rating}</button>
              ))}
            </div>
          )}
          {error && <p role="alert" className="text-sm text-status-error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-center my-auto py-6">
      {/* Title block with 20px black badge */}
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-[5px] bg-[#262627] text-white flex items-center justify-center text-[12px] font-bold shrink-0 mt-1.5 select-none">
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
              "text-[28px] leading-snug font-normal text-[#262627] focus:outline-none transition-colors",
              isBuilder &&
                "hover:bg-neutral-100/70 focus:bg-white rounded px-1.5 -mx-1.5 cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400"
            )}
          >
            {question.title}
            {question.required && <span className="text-[#262627] select-none">*</span>}
          </h2>

          {(question.description || isBuilder) && (
            <p
              contentEditable={isBuilder}
              suppressContentEditableWarning
              onBlur={handleDescriptionBlur}
              onKeyDown={handleDescriptionKeyDown}
              data-placeholder="Description (optional)"
              className={cn(
                "text-[18px] leading-relaxed italic text-neutral-400 mt-1 focus:outline-none transition-colors",
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
        {/* Short Text, Long Text, Email, Number */}
        {(question.type === "short_text" ||
          question.type === "long_text" ||
          question.type === "email" ||
          question.type === "number") && (
          <div className="w-full border-b border-[#262627] pb-2">
            <span className="text-[28px] font-light text-neutral-400 select-none block truncate">
              {placeholderText}
            </span>
          </div>
        )}

        {/* Multiple Choice (inline editable) */}
        {question.type === "multiple_choice" && (
          <div className="flex flex-col gap-2.5">
            {(question.options || []).map((opt, i) => (
              <div
                key={opt.id}
                className="group flex items-center gap-2.5 bg-[#eeeeee] hover:bg-[#e6e6e6] rounded-[4px] px-3 py-2 min-w-[240px] max-w-md transition-colors"
              >
                {isBuilder && (
                  <GripVertical
                    size={14}
                    className="text-neutral-400 opacity-0 group-hover:opacity-100 cursor-grab shrink-0 transition-opacity"
                  />
                )}
                {/* White letter badge */}
                <span className="w-[22px] h-[22px] rounded-[4px] bg-white border border-neutral-300 text-neutral-700 font-medium text-[11px] flex items-center justify-center shrink-0 select-none">
                  {String.fromCharCode(65 + i)}
                </span>

                {isBuilder ? (
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => handleOptionLabelChange(opt.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddChoiceAfter(i);
                      } else if (e.key === "Backspace" && opt.label === "" && (question.options?.length || 0) > 2) {
                        e.preventDefault();
                        handleDeleteChoice(opt.id);
                      }
                    }}
                    placeholder={`Choice ${i + 1}`}
                    className="flex-1 bg-transparent border-none text-[14px] text-[#262627] focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 text-[14px] text-[#262627]">{opt.label}</span>
                )}

                {isBuilder && (question.options?.length || 0) > 2 && (
                  <button
                    onClick={() => handleDeleteChoice(opt.id)}
                    className="text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    aria-label="Delete choice"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            {isBuilder && (
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={handleAddChoiceEnd}
                  disabled={(question.options?.length || 0) >= 20}
                  className="text-xs font-medium text-neutral-700 underline underline-offset-2 hover:text-[#262627] transition-colors"
                >
                  Add choice
                </button>
                <button
                  onClick={openBulkEdit}
                  className="text-xs font-medium text-neutral-500 hover:text-[#262627] transition-colors"
                >
                  Bulk edit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dropdown */}
        {question.type === "dropdown" && (
          <div className="relative max-w-md">
            <select
              className="w-full appearance-none bg-transparent border-b border-[#262627] pb-2 text-[20px] text-neutral-400 focus:outline-none cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>
                Type or select an option
              </option>
              {question.options?.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-0 bottom-3 pointer-events-none text-neutral-500">
              <ChevronDown size={20} />
            </div>
          </div>
        )}

        {/* Yes/No (stacked grey rows) */}
        {question.type === "yes_no" && (
          <div className="flex flex-col gap-2.5 max-w-[240px]">
            <div className="flex items-center gap-2.5 bg-[#eeeeee] hover:bg-[#e6e6e6] rounded-[4px] px-3 py-2 transition-colors cursor-pointer">
              <span className="w-[22px] h-[22px] rounded-[4px] bg-white border border-neutral-300 text-neutral-700 font-medium text-[11px] flex items-center justify-center shrink-0 select-none">
                Y
              </span>
              <span className="text-[14px] text-[#262627] font-normal">Yes</span>
            </div>
            <div className="flex items-center gap-2.5 bg-[#eeeeee] hover:bg-[#e6e6e6] rounded-[4px] px-3 py-2 transition-colors cursor-pointer">
              <span className="w-[22px] h-[22px] rounded-[4px] bg-white border border-neutral-300 text-neutral-700 font-medium text-[11px] flex items-center justify-center shrink-0 select-none">
                N
              </span>
              <span className="text-[14px] text-[#262627] font-normal">No</span>
            </div>
          </div>
        )}

        {/* Rating: neutral grey outline stars */}
        {question.type === "rating" && (
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: (question.settings?.rating_max as number) || 5 }).map((_, i) => (
              <Star
                key={i}
                size={36}
                strokeWidth={1.5}
                className="text-[#bfbfbf] hover:text-neutral-500 cursor-pointer transition-colors"
                fill="none"
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk edit modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk edit choices</DialogTitle>
            <DialogDescription>
              Enter each option on a new line (2 to 20 options).
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            className="w-full border border-neutral-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#262627] font-normal"
            placeholder="Option 1&#10;Option 2&#10;Option 3"
          />
          {bulkError && <p className="text-xs text-red-500 mt-1">{bulkError}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button variant="primary" size="sm" onClick={handleSaveBulk}>
              Save choices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
