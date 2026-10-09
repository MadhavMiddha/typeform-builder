"use client";

import { useBuilderStore } from "@/hooks/useBuilderStore";
import { usePublishForm, useUnpublishForm } from "@/lib/api/forms";
import { ArrowLeft, Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";

export function TopBar() {
  const router = useRouter();
  const { state, dispatch } = useBuilderStore();
  const form = state.form;
  const publishForm = usePublishForm();
  const unpublishForm = useUnpublishForm();
  
  const [title, setTitle] = useState(form?.title || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (form && !isEditingTitle) {
      setTitle(form.title);
    }
  }, [form?.title, isEditingTitle, form]);

  if (!form) return null;

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title.trim() !== "" && title !== form.title) {
      dispatch({ type: "UPDATE_FORM_FIELD", payload: { field: "title", value: title.trim() } });
    } else {
      setTitle(form.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.currentTarget as HTMLElement).blur();
    }
    if (e.key === "Escape") {
      setTitle(form.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-builder-divider flex items-center justify-between px-5 sticky top-0 z-40">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={() => router.push("/")}
          className="p-2 -ml-2 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="text-sm font-semibold text-brand bg-transparent border-b border-brand focus:outline-none w-56"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="text-sm font-semibold text-brand cursor-pointer hover:bg-neutral-100 px-2 py-1 -mx-2 rounded-lg truncate max-w-[280px]"
            >
              {title}
            </h1>
          )}
          
          <div className="flex items-center text-[11px] text-neutral-400 ml-2 whitespace-nowrap">
            {state.saveStatus === "saving" && "Saving..."}
            {state.saveStatus === "saved" && (
              <span className="flex items-center gap-1"><Check size={12} /> Saved</span>
            )}
            {state.saveStatus === "error" && <span className="text-[#E53E3E]">Failed to save</span>}
          </div>
        </div>
      </div>

      <nav className="hidden sm:flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
        {['Create', 'Share', 'Results'].map((tab) => (
          <button
            key={tab}
            className={cn(
              "px-5 py-2 text-xs font-semibold rounded-lg transition-colors",
              tab === 'Create' 
                ? "bg-white text-[#262627] shadow-sm" 
                : "text-[#6B6B6B] hover:text-[#262627] cursor-not-allowed opacity-60"
            )}
            disabled={tab !== 'Create'}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2 flex-1 justify-end">
        <Tooltip content="Coming in the next step">
          <span className="inline-block cursor-not-allowed">
            <Button variant="ghost" size="sm" disabled className="pointer-events-none text-neutral-400">
              Preview
            </Button>
          </span>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="primary" size="sm" className={form.status === "published" ? "bg-brand-accent hover:bg-brand-accent-dark focus-visible:ring-brand-accent" : ""}>
              {form.status === "published" ? "Published" : "Publish"}
              <ChevronDown size={14} className="opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {form.status === "draft" ? (
              <DropdownMenuItem onSelect={() => publishForm.mutate(form.id)}>
                Publish form
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => unpublishForm.mutate(form.id)}>
                Unpublish
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
