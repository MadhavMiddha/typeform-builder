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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { toast } from "sonner";
import { ShareDialog } from "./ShareDialog";
import type { FormRead } from "@/lib/types";

interface FormHeaderProps {
  onRetry?: () => void;
  activeTab?: "content" | "results";
  formOverride?: FormRead;
}

export function FormHeader({
  onRetry,
  activeTab = "content",
  formOverride,
}: FormHeaderProps) {
  const router = useRouter();
  const { state, dispatch } = useBuilderStore();
  const form = formOverride || state.form;
  const publishForm = usePublishForm();
  const unpublishForm = useUnpublishForm();

  const [title, setTitle] = useState(form?.title || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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
      dispatch({
        type: "UPDATE_FORM_FIELD",
        payload: { field: "title", value: title.trim() },
      });
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

  const handleCopyLink = async () => {
    if (form.status === "published" && form.public_id) {
      const url = `${window.location.origin}/f/${form.public_id}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  const tabs = [
    { id: "content", label: "Content", disabled: false },
    { id: "workflow", label: "Workflow", disabled: true },
    { id: "connect", label: "Connect", disabled: true },
    { id: "share", label: "Share", disabled: false },
    { id: "results", label: "Results", disabled: false },
  ];

  return (
    <>
      <header className="h-14 bg-white border-b border-[#ececec] flex items-center justify-between px-4 sticky top-0 z-40">
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
                className="text-sm font-medium text-[#262627] bg-transparent border-b border-[#262627] focus:outline-none w-56"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-medium text-[#262627] cursor-pointer hover:bg-neutral-100 px-1.5 py-0.5 rounded truncate max-w-[240px]"
                title="Click to rename"
              >
                {title || "Untitled form"}
              </h1>
            )}
          </div>
        </div>

        <nav className="hidden md:flex items-center h-full">
          {tabs.map((tab) =>
            tab.disabled ? (
              <Tooltip key={tab.id} content="Coming soon">
                <button
                  disabled
                  className="h-14 px-4 text-xs font-medium text-neutral-400 cursor-not-allowed flex items-center"
                >
                  {tab.label}
                </button>
              </Tooltip>
            ) : (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "share") {
                    setShowShareModal(true);
                  } else if (tab.id === "content") {
                    router.push(`/forms/${form.id}/edit`);
                  } else if (tab.id === "results") {
                    router.push(`/forms/${form.id}/results`);
                  }
                }}
                className={cn(
                  "h-14 px-4 text-xs font-medium text-[#262627] flex items-center cursor-pointer transition-colors relative",
                  activeTab === tab.id
                    ? "border-b-2 border-[#262627] font-semibold"
                    : "hover:text-black"
                )}
              >
                {tab.label}
              </button>
            )
          )}
        </nav>

        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Autosave status indicator */}
          <div className="flex items-center text-[11px] text-neutral-400 mr-2 whitespace-nowrap">
            {state.saveStatus === "saving" && <span>Saving...</span>}
            {state.saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-neutral-500">
                <Check size={12} /> Saved
              </span>
            )}
            {state.saveStatus === "error" && (
              <button
                onClick={onRetry}
                className="text-status-error underline underline-offset-2"
              >
                Failed to save · Retry
              </button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              window.open(
                `/f/${form.public_id}?preview=1&formId=${form.id}`,
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="h-8 px-3 text-xs font-semibold text-[#262627] hover:bg-neutral-100 cursor-pointer"
          >
            Preview
          </Button>

          {/* Quick copy link icon button */}
          <Tooltip
            content={
              form.status === "published"
                ? "Copy link"
                : "Publish form to share link"
            }
          >
            <span>
              <button
                onClick={handleCopyLink}
                disabled={form.status !== "published"}
                aria-label="Copy public link"
                className={cn(
                  "p-1.5 rounded-lg border border-[#ececec] transition-colors flex items-center justify-center",
                  form.status === "published"
                    ? "text-neutral-700 hover:bg-[#f5f5f5] hover:text-[#262627] cursor-pointer"
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
                    ? "bg-[#0ec290] text-white hover:bg-[#0a9b74] focus-visible:ring-[#0ec290]"
                    : "bg-[#262627] text-white hover:bg-black"
                )}
              >
                {form.status === "published" ? "Published" : "Publish"}
                <ChevronDown size={13} className="opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {form.status === "draft" ? (
                <DropdownMenuItem
                  onSelect={() =>
                    publishForm.mutate(form.id, {
                      onSuccess: () => {
                        dispatch({
                          type: "UPDATE_FORM_FIELD",
                          payload: { field: "status", value: "published" },
                        });
                        toast.success("Form published");
                      },
                      onError: () => toast.error("Failed to publish form"),
                    })
                  }
                >
                  Publish form
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() =>
                    unpublishForm.mutate(form.id, {
                      onSuccess: () => {
                        dispatch({
                          type: "UPDATE_FORM_FIELD",
                          payload: { field: "status", value: "draft" },
                        });
                        toast.success("Form unpublished");
                      },
                      onError: () => toast.error("Failed to unpublish form"),
                    })
                  }
                >
                  Unpublish
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Share dialog modal rendered on top of page */}
      <ShareDialog
        open={showShareModal}
        onOpenChange={setShowShareModal}
        form={form}
      />
    </>
  );
}

// Keep export of TopBar as alias for backwards compatibility if needed
export { FormHeader as TopBar };
