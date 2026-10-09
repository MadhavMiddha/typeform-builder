"use client";

import { useBuilderStore } from "@/hooks/useBuilderStore";
import { QuestionRead } from "@/lib/types";
import { useReplaceOptions } from "@/lib/api/questions";
import { Button } from "@/components/ui/Button";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import type { QuestionOptionRead } from "@/lib/types";

export function OptionsEditor({ question, formId }: { question: QuestionRead, formId: number }) {
  const { dispatch } = useBuilderStore();
  const replaceOptions = useReplaceOptions(formId);
  const [options, setOptions] = useState(question.options || []);
  const [bulkValue, setBulkValue] = useState("");
  const [validationError, setValidationError] = useState("");
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    setOptions(question.options || []);
    setBulkValue((question.options || []).map((option) => option.label).join("\n"));
  }, [question.options]);

  useEffect(() => {
    if (focusIndex === null) return;
    document.querySelector<HTMLInputElement>(`[data-option-index="${focusIndex}"]`)?.focus();
    setFocusIndex(null);
  }, [focusIndex, options]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = options.findIndex(opt => opt.id === active.id);
      const newIndex = options.findIndex(opt => opt.id === over.id);
      
      const newOptions = arrayMove(options, oldIndex, newIndex).map((opt, i) => ({ ...opt, position: i + 1 }));
      setOptions(newOptions);
      
      // Update store and server
      dispatch({ 
        type: "UPDATE_QUESTION", 
        payload: { id: question.id, updates: { options: newOptions } } 
      });
      replaceOptions.mutate({ qid: question.id, options: newOptions });
    }
  };

  const handleUpdateOption = (id: number, label: string) => {
    const newOptions = options.map(opt => opt.id === id ? { ...opt, label } : opt);
    setOptions(newOptions);
    
    // Naive save on every stroke, ideally debounce this
    dispatch({ 
      type: "UPDATE_QUESTION", 
      payload: { id: question.id, updates: { options: newOptions } } 
    });
    replaceOptions.mutate({ qid: question.id, options: newOptions });
  };

  const handleAddOption = () => {
    if (options.length >= 20) return;
    // create a fake temp id for optimistic UI
    const tempId = -Math.floor(Math.random() * 100000);
    const newOptions = [...options, { id: tempId, question_id: question.id, label: "", position: options.length + 1 }];
    setOptions(newOptions);
    setFocusIndex(newOptions.length - 1);
    setValidationError("");
    
    dispatch({ 
      type: "UPDATE_QUESTION", 
      payload: { id: question.id, updates: { options: newOptions } } 
    });
    replaceOptions.mutate({ qid: question.id, options: newOptions });
  };

  const handleBulkChange = (value: string) => {
    setBulkValue(value);
    const labels = value.split(/\r?\n/).map((label) => label.trim()).filter(Boolean).slice(0, 20);
    if (labels.length < 2) {
      setValidationError("Add at least two options.");
      return;
    }
    setValidationError("");
    const newOptions = labels.map((label, index) => ({
      id: options[index]?.id ?? -index - 1,
      question_id: question.id,
      label,
      position: index + 1,
    }));
    setOptions(newOptions);
    dispatch({ type: "UPDATE_QUESTION", payload: { id: question.id, updates: { options: newOptions } } });
    replaceOptions.mutate({ qid: question.id, options: newOptions });
  };

  const handleDeleteOption = (id: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter(opt => opt.id !== id).map((opt, i) => ({ ...opt, position: i + 1 }));
    setOptions(newOptions);
    
    dispatch({ 
      type: "UPDATE_QUESTION", 
      payload: { id: question.id, updates: { options: newOptions } } 
    });
    replaceOptions.mutate({ qid: question.id, options: newOptions });
  };

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map(o => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <SortableOption 
                key={opt.id} 
                option={opt} 
                index={i} 
                onUpdate={(val: string) => handleUpdateOption(opt.id, val)}
                onEnter={handleAddOption}
                onDelete={() => handleDeleteOption(opt.id)}
                canDelete={options.length > 2}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <button 
        type="button"
        onClick={handleAddOption}
        aria-label="Add option"
        disabled={options.length >= 20}
        className="text-brand-accent text-sm font-medium flex items-center gap-1 mt-2 disabled:opacity-50"
      >
        <Plus size={14} /> Add choice
      </button>
      <textarea
        value={bulkValue}
        onChange={(event) => handleBulkChange(event.target.value)}
        placeholder="Paste options, one per line"
        aria-label="Bulk edit options"
        className="mt-3 min-h-20 rounded-md border p-2 text-sm"
      />
      {validationError && <p className="text-xs text-status-error">{validationError}</p>}
      {options.length >= 20 && <span className="text-xs text-neutral-400">Maximum 20 options reached.</span>}
    </div>
  );
}

function SortableOption({
  option,
  index,
  onUpdate,
  onDelete,
  onEnter,
  canDelete,
}: {
  option: QuestionOptionRead;
  index: number;
  onUpdate: (value: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group relative">
      <div {...attributes} {...listeners} className="cursor-grab text-neutral-300 hover:text-neutral-500">
        <GripVertical size={16} />
      </div>
      <div className="flex-1 relative">
        <input 
          data-option-index={index}
          type="text" 
          value={option.label}
          onChange={(e) => onUpdate(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder={`Option ${index + 1}`}
          className="w-full border rounded-md p-2 pl-2 text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white"
        />
      </div>
      <button 
        onClick={onDelete}
        aria-label={`Delete option ${index + 1}`}
        disabled={!canDelete}
        className="p-1 text-neutral-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-neutral-400"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
