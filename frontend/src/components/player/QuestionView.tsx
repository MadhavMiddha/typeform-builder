"use client";

import { QuestionRead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlignLeft, Hash, List, CheckSquare, Mail, ToggleLeft, Star, ChevronDown } from "lucide-react";

interface QuestionViewProps {
  question: QuestionRead;
  value?: string | number | string[];
  onChange?: (value: string | number | string[]) => void;
  isBuilder?: boolean;
  onUpdate?: (updates: Partial<QuestionRead>) => void;
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

export function QuestionView({ question, value, onChange, isBuilder, onUpdate }: QuestionViewProps) {
  
  const handleTitleChange = (e: React.FormEvent<HTMLHeadingElement>) => {
    if (isBuilder && onUpdate) {
      onUpdate({ title: e.currentTarget.textContent || "" });
    }
  };

  const handleDescriptionChange = (e: React.FormEvent<HTMLParagraphElement>) => {
    if (isBuilder && onUpdate) {
      onUpdate({ description: e.currentTarget.textContent || "" });
    }
  };

  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 text-brand font-semibold text-base mt-1">
        {question.position} <span className="text-brand-accent px-1">→</span>
      </div>
      <div className="flex-1 flex flex-col gap-3">
        <h2 
          className={cn(
            "text-[27px] leading-tight font-semibold tracking-[-0.025em] text-brand focus:outline-none",
            isBuilder && "hover:bg-neutral-50 -mx-2 px-2 rounded-md cursor-text"
          )}
          contentEditable={isBuilder}
          suppressContentEditableWarning
          onBlur={handleTitleChange}
          data-placeholder="Type your question here"
        >
          {question.title}
        </h2>
        
        {(question.description || isBuilder) && (
          <p 
            className={cn(
              "text-[16px] leading-7 text-neutral-500 focus:outline-none min-h-[1.5em] max-w-2xl",
              isBuilder && "hover:bg-neutral-50 -mx-2 px-2 rounded-md cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400"
            )}
            contentEditable={isBuilder}
            suppressContentEditableWarning
            onBlur={handleDescriptionChange}
            data-placeholder="Description (optional)"
          >
            {question.description}
          </p>
        )}

        <div className={cn("mt-8", isBuilder && "pointer-events-none")}>
          {question.type === "short_text" && (
            <input 
              type="text" 
              placeholder={(question.settings?.placeholder as string) || "Type your answer here..."}
              className="w-full max-w-2xl border-b border-neutral-400 pb-3 text-lg bg-transparent focus:outline-none focus:border-brand-accent placeholder-neutral-400"
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
            />
          )}
          {question.type === "long_text" && (
            <textarea 
              placeholder={(question.settings?.placeholder as string) || "Type your answer here..."}
              className="w-full max-w-2xl border-b border-neutral-400 pb-3 text-lg bg-transparent focus:outline-none focus:border-brand-accent resize-none placeholder-neutral-400"
              rows={3}
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
            />
          )}
          {question.type === "email" && (
            <input 
              type="email" 
              placeholder="name@example.com"
              className="w-full max-w-2xl border-b border-neutral-400 pb-3 text-lg bg-transparent focus:outline-none focus:border-brand-accent placeholder-neutral-400"
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
            />
          )}
          {question.type === "number" && (
            <input 
              type="number" 
              placeholder={(question.settings?.placeholder as string) || "Type a number..."}
              className="w-full max-w-2xl border-b border-neutral-400 pb-3 text-lg bg-transparent focus:outline-none focus:border-brand-accent placeholder-neutral-400"
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
            />
          )}
          {question.type === "yes_no" && (
            <div className="flex gap-4">
              <button className="flex items-center gap-3 px-5 py-3 border border-builder-divider rounded-lg bg-white hover:bg-neutral-50 shadow-sm text-base font-semibold text-brand">
                <span className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center text-sm text-neutral-500 font-bold border border-neutral-200">Y</span>
                Yes
              </button>
              <button className="flex items-center gap-3 px-5 py-3 border border-builder-divider rounded-lg bg-white hover:bg-neutral-50 shadow-sm text-base font-semibold text-brand">
                <span className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center text-sm text-neutral-500 font-bold border border-neutral-200">N</span>
                No
              </button>
            </div>
          )}
          {question.type === "rating" && (
            <div className="flex gap-2 text-4xl text-neutral-200">
              {Array.from({ length: (question.settings?.rating_max as number) || 5 }).map((_, i) => (
                <Star key={i} className="cursor-pointer hover:text-emerald-400 text-emerald-100" fill="currentColor" />
              ))}
            </div>
          )}
          {question.type === "multiple_choice" && (
            <div className="flex flex-col gap-3">
              {question.options.map((opt, i) => (
                <button key={opt.id} className="flex items-center gap-4 px-4 py-3 border border-builder-divider rounded-lg bg-white hover:bg-neutral-50 shadow-sm text-base font-semibold text-brand text-left">
                  <span className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center text-sm text-neutral-500 font-bold border border-neutral-200">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {question.type === "dropdown" && (
            <div className="relative">
               <select className="w-full appearance-none bg-transparent border-b border-brand pb-2 text-xl focus:outline-none focus:border-brand-accent cursor-pointer text-brand" defaultValue="">
                 <option value="" disabled>Type or select an option</option>
                 {question.options.map((opt) => (
                   <option key={opt.id} value={opt.id}>{opt.label}</option>
                 ))}
               </select>
               <div className="absolute right-0 bottom-3 pointer-events-none">
                 <ChevronDown size={20} className="text-neutral-500" />
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
