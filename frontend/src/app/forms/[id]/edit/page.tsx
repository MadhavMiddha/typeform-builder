"use client";

import { useForm } from "@/lib/api/forms";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { Suspense, useEffect, useState } from "react";
import { LayoutPanelLeft, Palette, PanelRight, PanelRightClose, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuilderProvider, useBuilderStore } from "@/hooks/useBuilderStore";
import { TopBar } from "@/components/builder/TopBar";
import { QuestionList } from "@/components/builder/QuestionList";
import { Canvas } from "@/components/builder/Canvas";
import { SettingsPanel } from "@/components/builder/SettingsPanel";
import { AddQuestionPopover } from "@/components/builder/AddQuestionPopover";
import { useAutosave } from "@/hooks/useAutosave";

function BuilderContent() {
  const params = useParams();
  const formId = parseInt(params.id as string, 10);
  const { data: form, isLoading, isError } = useForm(formId);
  const { state, dispatch } = useBuilderStore();
  const router = useRouter();
  const [mobilePane, setMobilePane] = useState<"questions" | "settings" | null>(null);
  const [leftPaneOpen, setLeftPaneOpen] = useState(true);
  const [rightPaneOpen, setRightPaneOpen] = useState(true);

  // Initialize store when form loads
  useEffect(() => {
    if (form && (!state.form || state.form.id !== form.id)) {
      dispatch({ type: "SET_FORM", payload: form });
    }
  }, [form, state.form, dispatch]);

  const { retry } = useAutosave(formId);

  if (!Number.isFinite(formId) || formId <= 0 || isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        <header className="h-14 border-b bg-white flex items-center px-4 gap-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-6 w-48" />
        </header>
        <main className="flex-1 flex">
          <div className="w-[280px] border-r bg-white p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
             <Skeleton className="h-64 w-full max-w-2xl rounded-2xl" />
          </div>
          <div className="w-[320px] border-l bg-white p-6 space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-white p-12 rounded-2xl border shadow-sm max-w-lg w-full">
          <h2 className="text-2xl font-semibold text-[#262627] mb-3">Form not found</h2>
          <p className="text-[#6B6B6B] mb-8">
            The form you are looking for does not exist or you do not have access.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 bg-[#262627] text-white rounded-lg font-medium hover:bg-[#1a1a1b] transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!state.form) return null;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden text-sm text-brand">
      <TopBar onRetry={retry} />
      
      {/* Secondary toolbar row */}
      <div className="px-5 py-2.5 bg-white">
        <div className="h-11 rounded-[12px] bg-[#f4f4f4] px-3 flex items-center gap-2">
          <AddQuestionPopover formId={form.id} compact />
          
          <button className="inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200/70 transition-colors">
            <Palette size={15} /> Design
          </button>
          
          <div className="h-4 w-px bg-neutral-300 mx-1" />
          
          <button 
            onClick={() => window.open(`/f/${form.public_id}?preview=1&formId=${form.id}`, "_blank", "noopener,noreferrer")}
            className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-200/70 transition-colors"
            aria-label="Play preview"
          >
            <Play size={15} fill="currentColor" />
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => {
                setRightPaneOpen(!rightPaneOpen);
              }}
              className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-200/70 transition-colors"
              aria-label="Collapse panel"
              title={rightPaneOpen ? "Hide panel" : "Show panel"}
            >
              <PanelRightClose size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 min-h-0 px-5 pb-5 flex gap-4 overflow-hidden bg-white">
        {/* Left Column: Pages & Endings cards */}
        {leftPaneOpen && (
          <div className={cn(
            "w-[280px] shrink-0 h-full min-h-0 flex flex-col gap-4 max-[767px]:absolute max-[767px]:inset-y-0 max-[767px]:left-0 max-[767px]:z-30 max-[767px]:shadow-xl",
            mobilePane === "questions" ? "max-[767px]:flex" : "max-[767px]:hidden",
            "min-[768px]:flex"
          )}>
            <QuestionList />
          </div>
        )}

        {/* Center: Canvas Area */}
        <div className="flex-1 min-w-0 h-full min-h-0">
          <Canvas />
        </div>

        {/* Right Column: Settings Cards */}
        {rightPaneOpen && (
          <div className={cn(
            "w-[320px] shrink-0 h-full min-h-0 flex flex-col gap-4 max-[1023px]:absolute max-[1023px]:inset-y-0 max-[1023px]:right-0 max-[1023px]:z-30 max-[1023px]:shadow-xl",
            mobilePane === "settings" ? "max-[1023px]:flex" : "max-[1023px]:hidden",
            "min-[1024px]:flex"
          )}>
            <SettingsPanel />
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditFormPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Skeleton className="h-8 w-64 mx-auto" /></div>}>
      <BuilderProvider>
        <BuilderContent />
      </BuilderProvider>
    </Suspense>
  );
}
