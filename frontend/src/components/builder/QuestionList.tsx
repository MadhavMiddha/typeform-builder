"use client";

import { useBuilderStore } from "@/hooks/useBuilderStore";
import { cn } from "@/lib/utils";
import { typeIcons } from "@/components/player/QuestionView";
import { GripVertical, MoreVertical, Plus } from "lucide-react";
import { useDeleteQuestion, useReorderQuestions } from "@/lib/api/questions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
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
      
      const newItems = arrayMove(form.questions, oldIndex, newIndex);
      
      // Update local state first
      dispatch({ type: "REORDER_QUESTIONS", payload: newItems });
      
      // Send to server
      reorderQuestions.mutate(newItems.map(q => q.id), {
        onError: () => dispatch({ type: "REORDER_QUESTIONS", payload: form.questions }),
      });
    }
  };

  return (
    <div className="w-[280px] max-md:w-[240px] bg-builder-panel border-r border-builder-divider flex flex-col h-full">
      <div className="px-4 py-4 border-b border-builder-divider flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Pages</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Welcome Screen */}
        <div 
          onClick={() => dispatch({ type: "SET_SELECTED_ITEM", payload: "welcome" })}
          className={cn(
            "p-3 rounded-xl border cursor-pointer flex gap-3 transition-colors",
            state.selectedItem === "welcome" 
              ? "border-brand-accent bg-emerald-50/60 shadow-sm" 
              : "border-transparent hover:bg-white"
          )}
        >
          <div className="w-5 flex justify-center text-neutral-400">👋</div>
          <div className="flex-1 truncate text-sm">
            <span className="font-medium text-brand block truncate">Welcome Screen</span>
            <span className="text-neutral-500 text-xs truncate block">{form.welcome_title || "Welcome to my form"}</span>
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

        <AddQuestionPopover formId={form.id} />

        {/* Thank You Screen */}
        <div 
          onClick={() => dispatch({ type: "SET_SELECTED_ITEM", payload: "thank_you" })}
          className={cn(
            "p-3 rounded-lg border cursor-pointer flex gap-3 transition-colors",
            state.selectedItem === "thank_you" 
              ? "border-brand-accent bg-brand-accent/5" 
              : "border-transparent hover:bg-neutral-50"
          )}
        >
          <div className="w-5 flex justify-center text-neutral-400">🏁</div>
          <div className="flex-1 truncate text-sm">
            <span className="font-medium text-brand block truncate">End Screen</span>
            <span className="text-neutral-500 text-xs truncate block">{form.thank_you_title || "Thank you!"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableQuestionItem({ question, formId }: { question: QuestionRead, formId: number }) {
  const { state, dispatch } = useBuilderStore();
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
        if (isSelected) dispatch({ type: "SET_SELECTED_ITEM", payload: "welcome" });
      },
    });
  };

  return (
    <>
      <div 
        tabIndex={0}
        ref={setNodeRef} 
        style={style}
        onClick={() => dispatch({ type: "SET_SELECTED_ITEM", payload: question.id })}
        className={cn(
          "group relative p-3 rounded-xl border cursor-pointer flex gap-3 transition-colors bg-transparent",
          isSelected 
            ? "border-brand-accent bg-white shadow-sm" 
            : "border-transparent hover:bg-white"
        )}
      >
        <div 
          {...attributes} 
          {...listeners}
          aria-label={`Drag ${question.title || "question"}`}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab hover:text-brand transition-opacity text-neutral-400"
        >
          <GripVertical size={16} />
        </div>
        
        <div className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-500 mt-0.5">
          {question.position}
        </div>
        <div className="flex-1 truncate text-sm flex items-center gap-2">
          {typeIcons[question.type]}
          <span className="text-brand truncate flex-1">{question.title || "..."}</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label={`Actions for ${question.title || "question"}`} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 text-neutral-500 transition-opacity">
              <MoreVertical size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled>Duplicate (Soon)</DropdownMenuItem>
            <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
    </>
  );
}
