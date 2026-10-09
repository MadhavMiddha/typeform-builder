"use client";

import { useBuilderStore } from "@/hooks/useBuilderStore";
import { usePublishForm, useUnpublishForm } from "@/lib/api/forms";
import { Check, ChevronDown, Link2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { toast } from "sonner";

export function TopBar({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();
  const { state, dispatch } = useBuilderStore();
  const form = state.form;
  const publishForm = usePublishForm();
  const unpublishForm = useUnpublishForm();
  
  const [title, setTitle] = useState(form?.title || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showShare, setShowShare] = useState(false);
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

  const handleCopyLink = () => {
    if (form.status === "published" && form.public_id) {
      const url = `${window.location.origin}/f/${form.public_id}`;
      navigator.clipboard.writeText(url);
    }
  };

  const tabs = [
    { id: "content", label: "Content", disabled: false },
    { id: "workflow", label: "Workflow", disabled: true },
    { id: "connect", label: "Connect", disabled: true },
    { id: "share", label: "Share", disabled: false },
    { id: "results", label: "Results", disabled: true },
  ];

  const publicUrl = form.public_id
    ? `/f/${form.public_id}`
    : "";

  const copyLink = async () => {
    if (!publicUrl || form.status !== "published") return;
    await navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`);
    toast.success("Public link copied");
  };

  return (
    <>
    <header className="h-14 bg-white border-b border-[#e6e6e8] flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-500 hover:text-brand transition-colors shrink-0"
        >
          Forms
        </Link>
        <span className="text-neutral-400 text-sm">/</span>

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
              className="text-sm font-semibold text-brand cursor-pointer hover:bg-neutral-100 px-1.5 py-0.5 rounded truncate max-w-[240px]"
              title="Click to rename"
            >
              {title}
            </h1>
          )}
        </div>
      </div>

      <nav className="hidden md:flex items-center h-full">
        {tabs.map((tab) => (
          tab.disabled ? (
            <Tooltip key={tab.id} content="Coming soon">
              <button
                disabled
                className="h-14 px-4 text-xs font-semibold text-neutral-400 cursor-not-allowed flex items-center"
              >
                {tab.label}
              </button>
            </Tooltip>
          ) : (
            <button
              key={tab.id}
              onClick={() => tab.id === "share" && setShowShare((visible) => !visible)}
              className="h-14 px-4 text-xs font-semibold text-brand border-b-2 border-brand flex items-center"
            >
              {tab.label}
            </button>
          )
        ))}
      </nav>

      <div className="flex items-center gap-2 flex-1 justify-end">
        {/* Autosave status indicator near the right cluster */}
        <div className="flex items-center text-[11px] text-neutral-400 mr-2 whitespace-nowrap">
          {state.saveStatus === "saving" && <span>Saving...</span>}
          {state.saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-neutral-500"><Check size={12} /> Saved</span>
          )}
          {state.saveStatus === "error" && (
            <button onClick={onRetry} className="text-status-error underline underline-offset-2">
              Failed to save · Retry
            </button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(`/f/${form.public_id}?preview=1&formId=${form.id}`, "_blank", "noopener,noreferrer")}
          className="h-8 px-3 text-xs"
        >
          Preview
        </Button>

        {/* Copy public link button */}
        <Tooltip content={form.status === "published" ? "Copy link" : "Publish form to share link"}>
          <span>
            <button
              onClick={handleCopyLink}
              disabled={form.status !== "published"}
              aria-label="Copy public link"
              className={cn(
                "p-1.5 rounded-lg border border-neutral-200 transition-colors flex items-center justify-center",
                form.status === "published"
                  ? "text-neutral-700 hover:bg-neutral-100 hover:text-brand cursor-pointer"
                  : "text-neutral-300 border-neutral-100 cursor-not-allowed opacity-50"
              )}
            >
              <Link2 size={15} />
            </button>
          </span>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className={cn(
                "h-8 px-3 text-xs font-semibold gap-1.5",
                form.status === "published"
                  ? "bg-brand-accent text-white hover:bg-brand-accent-dark focus-visible:ring-brand-accent"
                  : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
              )}
            >
              {form.status === "published" ? "Published" : "Draft"}
              <ChevronDown size={13} className="opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {form.status === "draft" ? (
              <DropdownMenuItem onSelect={() => publishForm.mutate(form.id, {
                onSuccess: () => dispatch({
                  type: "UPDATE_FORM_FIELD",
                  payload: { field: "status", value: "published" },
                }),
              })}>
                Publish form
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => unpublishForm.mutate(form.id, {
                onSuccess: () => dispatch({
                  type: "UPDATE_FORM_FIELD",
                  payload: { field: "status", value: "draft" },
                }),
              })}>
                Unpublish
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    {showShare && (
      <section className="border-b border-[#e6e6e8] bg-white px-5 py-4 shadow-sm" aria-label="Share form">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-brand">Share your form</h2>
            {form.status === "published" ? (
              <p className="mt-1 text-xs text-neutral-500">Anyone with this link can respond.</p>
            ) : (
              <p className="mt-1 text-xs text-neutral-500">Publish this form to enable its public link.</p>
            )}
          </div>
          {form.status === "published" && publicUrl ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={copyLink} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white">Copy link</button>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-brand">Open form</a>
            </div>
          ) : (
            <span className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-500">Unpublished</span>
          )}
        </div>
      </section>
    )}
    </>
  );
}
