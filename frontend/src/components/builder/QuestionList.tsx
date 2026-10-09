"use client";

import { useBuilderStore } from "@/hooks/useBuilderStore";
import { cn } from "@/lib/utils";
import { typeIcons } from "@/components/player/QuestionView";
import { GripVertical, MoreVertical, PanelTop, Plus } from "lucide-react";
import { useCreateQuestion, useDeleteQuestion, useReplaceOptions, useReorderQuestions } from "@/lib/api/questions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useState } from "react";
import { useEffect } from "react";
import type { QuestionRead } from "@/lib/types";
import { AddQuestionPopover } from "./AddQuestionPopover";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function QuestionList() {
  const { state, dispatch } = useBuilderStore();
  const form = state.form;
  const reorderQuestions = useReorderQuestions(form?.id || 0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!form) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = form.questions.findIndex(q => q.id === active.id);
      const newIndex = form.questions.findIndex(q => q.id === over.id);
      
      const prevQuestions = form.questions;
      const newItems = arrayMove(form.questions, oldIndex, newIndex);
      
      // Optimistic update: reorder locally and keep selection on dragged question
      dispatch({ type: "REORDER_QUESTIONS", payload: newItems });
      dispatch({ type: "SET_SELECTED_ITEM", payload: active.id as number });
      
      // Send to server; roll back on failure with server error message
      reorderQuestions.mutate(newItems.map(q => q.id), {
        onSuccess: (updatedQuestions) => {
          dispatch({ type: "REORDER_QUESTIONS", payload: updatedQuestions });
        },
        onError: (err) => {
          dispatch({ type: "REORDER_QUESTIONS", payload: prevQuestions });
        },
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Pages Card */}
      <div className="flex-1 min-h-0 bg-[#f5f5f5] rounded-[16px] p-4 flex flex-col">
        <div className="pb-3 flex items-center justify-between shrink-0">
          <h2 className="text-[16px] font-semibold text-brand">Pages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-thin-scrollbar">
          {/* Welcome Screen item */}
          <div 
            onClick={() => dispatch({ type: "SET_SELECTED_ITEM", payload: "welcome" })}
            className={cn(
              "min-h-[64px] p-2.5 rounded-[10px] border cursor-pointer flex items-center gap-3 transition-colors bg-white",
              state.selectedItem === "welcome" 
                ? "border-[1.5px] border-[#262627] bg-[#f0f0f0] shadow-sm" 
                : "border-[#eeeeee] hover:bg-neutral-50/80"
            )}
          >
            <div className="w-[52px] h-[32px] rounded-[6px] bg-[#e8e8e8] flex items-center justify-center text-neutral-600 shrink-0">
              <PanelTop size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[14px] leading-tight text-[#4d4d4d] font-medium line-clamp-2">
                {form.welcome_title || "Welcome Screen"}
              </span>
            </div>
          </div>

          {/* Sortable Questions List */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={form.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {form.questions.map((q) => (
                  <SortableQuestionItem key={q.id} question={q} formId={form.id} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Endings Card */}
      <div className="shrink-0 bg-[#f5f5f5] rounded-[16px] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-brand">Endings</h2>
          <Tooltip content="Coming soon">
            <span>
              <button
                disabled
                className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-400 cursor-not-allowed hover:bg-neutral-200/50"
                aria-label="Add ending"
              >
                <Plus size={16} />
              </button>
            </span>
          </Tooltip>
        </div>

        {/* Ending Item */}
        <div 
          onClick={() => dispatch({ type: "SET_SELECTED_ITEM", payload: "thank_you" })}
          className={cn(
            "min-h-[64px] p-2.5 rounded-[10px] border cursor-pointer flex items-center gap-3 transition-colors bg-white",
            state.selectedItem === "thank_you" 
              ? "border-[1.5px] border-[#262627] bg-[#f0f0f0] shadow-sm" 
              : "border-[#eeeeee] hover:bg-neutral-50/80"
          )}
        >
          <div className="w-[52px] h-[32px] rounded-[6px] bg-[#e8e8e8] flex items-center justify-center text-neutral-600 font-semibold text-xs shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[14px] leading-tight text-[#4d4d4d] font-medium line-clamp-2">
              {form.thank_you_title || "Thank you for your feedback!"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Badge color configuration based on screenshots
const badgeTypeStyles: Record<string, { bg: string; iconColor: string }> = {
  short_text: { bg: "bg-[#e0f2fe]", iconColor: "text-[#0284c7]" }, // light blue
  long_text: { bg: "bg-[#e0f2fe]", iconColor: "text-[#0284c7]" }, // light blue
  email: { bg: "bg-[#fce7f3]", iconColor: "text-[#db2777]" }, // light pink
  multiple_choice: { bg: "bg-[#ede9fe]", iconColor: "text-[#7c3aed]" }, // lavender
  dropdown: { bg: "bg-[#ede9fe]", iconColor: "text-[#7c3aed]" }, // lavender
  yes_no: { bg: "bg-[#ede9fe]", iconColor: "text-[#7c3aed]" }, // lavender
  rating: { bg: "bg-[#dcfce7]", iconColor: "text-[#16a34a]" }, // light green
  number: { bg: "bg-[#fef9c3]", iconColor: "text-[#ca8a04]" }, // light yellow
};

function SortableQuestionItem({ question, formId }: { question: QuestionRead, formId: number }) {
  const { state, dispatch } = useBuilderStore();
  const questions = state.form?.questions ?? [];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = state.selectedItem === question.id;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteQuestion = useDeleteQuestion(formId);
  const createQuestion = useCreateQuestion(formId);
  const replaceOptions = useReplaceOptions(formId);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (state.selectedItem !== question.id) return;
      if (event.key === "Delete") {
        event.preventDefault();
        setDeleteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [question.id, state.selectedItem]);

  const handleDelete = () => {
    deleteQuestion.mutate(question.id, {
      onSuccess: () => {
        dispatch({ type: "DELETE_QUESTION", payload: question.id });
        if (isSelected) dispatch({
          type: "SET_SELECTED_ITEM",
          payload: nextQuestionId ?? previousQuestionId ?? "welcome",
        });
      },
    });
  };

  const handleDuplicate = () => {
    createQuestion.mutate({
      type: question.type,
      title: question.title,
      description: question.description,
      required: question.required,
      settings: question.settings,
      after_id: question.id,
    }, {
      onSuccess: (copy) => {
        dispatch({ type: "ADD_QUESTION", payload: { question: copy, afterId: question.id } });
        dispatch({ type: "SET_SELECTED_ITEM", payload: copy.id });
        if (question.options.length) {
          replaceOptions.mutate({
            qid: copy.id,
            options: question.options.map(({ label, position }) => ({ label, position })),
          });
        }
      },
    });
  };

  const handleInsertAfter = (e: React.MouseEvent) => {
    e.stopPropagation();
    createQuestion.mutate({
      type: "short_text",
      title: "",
      after_id: question.id,
    }, {
      onSuccess: (newQ) => {
        dispatch({ type: "ADD_QUESTION", payload: { question: newQ, afterId: question.id } });
        dispatch({ type: "SET_SELECTED_ITEM", payload: newQ.id });
      }
    });
  };

  const questionIndex = questions.findIndex((item) => item.id === question.id);
  const nextQuestionId = questions[questionIndex + 1]?.id;
  const previousQuestionId = questions[questionIndex - 1]?.id;

  const badgeStyle = badgeTypeStyles[question.type] || { bg: "bg-neutral-100", iconColor: "text-neutral-600" };

  return (
    <div className="flex flex-col gap-1">
      <div 
        data-testid="question-list-item"
        tabIndex={0}
        ref={setNodeRef} 
        style={style}
        onClick={() => dispatch({ type: "SET_SELECTED_ITEM", payload: question.id })}
        className={cn(
          "group relative min-h-[64px] p-2.5 rounded-[10px] border cursor-pointer flex items-center gap-2.5 transition-colors bg-white",
          isSelected 
            ? "border-[1.5px] border-[#262627] bg-[#f0f0f0] shadow-sm" 
            : "border-[#eeeeee] hover:bg-neutral-50/80"
        )}
      >
        <div 
          {...attributes} 
          {...listeners}
          aria-label={`Drag ${question.title || "question"}`}
          className="cursor-grab text-neutral-300 hover:text-neutral-600 -ml-1"
        >
          <GripVertical size={14} />
        </div>
        
        {/* Type badge: rounded 6px, about 52x32px, containing type icon AND number together */}
        <div className={cn(
          "w-[52px] h-[32px] rounded-[6px] flex items-center justify-center gap-1 shrink-0 px-1 font-semibold text-xs",
          badgeStyle.bg
        )}>
          <span className={badgeStyle.iconColor}>
            {typeIcons[question.type]}
          </span>
          <span className="text-[#262627] text-[12px] font-bold">
            {question.position}
          </span>
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <span className={cn(
            "text-[14px] leading-tight block line-clamp-2",
            question.title ? "text-[#4d4d4d]" : "text-neutral-400 italic"
          )}>
            {question.title || "Untitled question"}
          </span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              aria-label={`Actions for ${question.title || "question"}`} 
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 text-neutral-500 transition-opacity"
            >
              <MoreVertical size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={handleDuplicate}>Duplicate</DropdownMenuItem>
            <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Under SELECTED question only: show inline '+ Add content' text button */}
      {isSelected && (
        <div className="pl-4 py-1">
          <button
            onClick={handleInsertAfter}
            className="text-xs font-semibold text-neutral-600 hover:text-brand flex items-center gap-1.5 transition-colors"
          >
            <Plus size={13} />
            <span>Add content</span>
          </button>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="danger" onClick={() => { handleDelete(); setDeleteOpen(false); }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
