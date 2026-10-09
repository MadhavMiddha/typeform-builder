"use client";

import { useBuilderStore } from "@/hooks/useBuilderStore";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { typeIcons } from "@/components/player/QuestionView";
import { useCreateQuestion } from "@/lib/api/questions";
import { QuestionType } from "@/lib/types";
import { cn } from "@/lib/utils";

type QuestionItem = {
  type: string;
  label: string;
  disabled?: boolean;
};

type QuestionGroup = {
  title: string;
  items: QuestionItem[];
};

const questionGroups: QuestionGroup[] = [
  {
    title: "Text",
    items: [
      { type: "short_text", label: "Short Text" },
      { type: "long_text", label: "Long Text" },
      { type: "email", label: "Email" },
      { type: "number", label: "Number" },
    ]
  },
  {
    title: "Choice",
    items: [
      { type: "multiple_choice", label: "Multiple Choice" },
      { type: "dropdown", label: "Dropdown" },
      { type: "yes_no", label: "Yes/No" },
    ]
  },
  {
    title: "Rating",
    items: [
      { type: "rating", label: "Rating" },
    ]
  },
  {
    title: "Other",
    items: [
      { type: "file_upload", label: "File upload (Soon)", disabled: true },
      { type: "payment", label: "Payment (Soon)", disabled: true },
    ]
  }
];

export function AddQuestionPopover({ formId, compact = false }: { formId: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const createQuestion = useCreateQuestion(formId);
  const { state, dispatch } = useBuilderStore();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const handleSelect = (type: string) => {
    setOpen(false);
    
    // Find current selected position
    let afterId: number | undefined;
    let beforeId: number | undefined;
    if (typeof state.selectedItem === "number") {
      afterId = state.selectedItem;
    } else if (state.selectedItem === "welcome" && state.form?.questions[0]) {
      beforeId = state.form.questions[0].id;
    }

    createQuestion.mutate({
      type: type as QuestionType,
      title: "",
      after_id: afterId,
      before_id: beforeId,
    }, {
      onSuccess: (newQ) => {
        dispatch({ type: "ADD_QUESTION", payload: { question: newQ, afterId, beforeId } });
        dispatch({ type: "SET_SELECTED_ITEM", payload: newQ.id });
      }
    });
  };

  const filteredGroups = questionGroups.map(group => ({
    ...group,
    items: group.items.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
  })).filter(group => group.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={cn(
          compact
            ? "inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800"
            : "w-full mt-2 p-3 rounded-lg border border-dashed border-neutral-300 text-neutral-500 hover:text-brand hover:border-brand-accent hover:bg-brand-accent/5 flex items-center justify-center gap-2 transition-colors"
        )}>
          <Plus size={16} />
          <span>{compact ? "Add content" : "Add content"}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-0 h-[80vh] flex flex-col overflow-hidden bg-neutral-50 rounded-2xl">
        <div className="p-4 bg-white border-b flex items-center gap-3">
          <Search size={20} className="text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search form elements" 
            className="flex-1 outline-none text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            ref={searchRef}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {filteredGroups.map(group => (
            <div key={group.title} className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-brand mb-2">{group.title}</h4>
              {group.items.map(item => (
                <button
                  key={item.type}
                  disabled={item.disabled}
                  onClick={() => !item.disabled && handleSelect(item.type)}
                  className={cn(
                    "flex items-center gap-3 p-2 -mx-2 rounded-lg text-left transition-colors",
                    item.disabled 
                      ? "opacity-50 cursor-not-allowed" 
                      : "hover:bg-white hover:shadow-sm"
                  )}
                >
                  <div className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center shrink-0">
                     {typeIcons[item.type] || <Plus size={16} className="text-neutral-400" />}
                  </div>
                  <span className="text-sm font-medium text-brand">{item.label}</span>
                  {item.disabled && <span className="text-[10px] text-neutral-400">Coming soon</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
