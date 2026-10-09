"use client";

import { useForm } from "@/lib/api/forms";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { Suspense, useEffect, useState } from "react";
import { Eye, LayoutPanelLeft, PanelRight, Sparkles } from "lucide-react";
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

  // Initialize store when form loads
  useEffect(() => {
    if (form && (!state.form || state.form.id !== form.id)) {
      dispatch({ type: "SET_FORM", payload: form });
    }
  }, [form, state.form, dispatch]);

  useAutosave(formId);

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
    <div className="h-screen bg-builder-workspace flex flex-col overflow-hidden text-sm text-brand">
      <TopBar />
      <div className="h-14 shrink-0 border-b border-builder-divider bg-builder-panel px-4 flex items-center gap-2">
        <button
          className="hidden max-[767px]:inline-flex h-9 items-center gap-2 rounded-lg border border-builder-divider bg-white px-3 text-xs font-semibold"
          onClick={() => setMobilePane(mobilePane === "questions" ? null : "questions")}
          aria-label="Toggle question list"
        >
          <LayoutPanelLeft size={15} /> Pages
        </button>
        <AddQuestionPopover formId={form.id} compact />
        <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-transparent px-3 text-xs font-semibold text-neutral-600 hover:border-builder-divider hover:bg-white">
          <Sparkles size={15} /> Design
        </button>
        <div className="ml-auto flex items-center gap-1 text-neutral-500">
          <button className="rounded-lg p-2 hover:bg-white" aria-label="Preview canvas"><Eye size={16} /></button>
          <button
            className="hidden max-[1023px]:inline-flex rounded-lg p-2 hover:bg-white"
            onClick={() => setMobilePane(mobilePane === "settings" ? null : "settings")}
            aria-label="Toggle settings"
          >
            <PanelRight size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className={cn(
          "max-[767px]:absolute max-[767px]:inset-y-0 max-[767px]:left-0 max-[767px]:z-30 max-[767px]:shadow-xl",
          mobilePane === "questions" ? "max-[767px]:block" : "max-[767px]:hidden",
          "min-[768px]:block"
        )}>
          <QuestionList />
        </div>
        <Canvas />
        <div className={cn(
          "max-[1023px]:absolute max-[1023px]:inset-y-0 max-[1023px]:right-0 max-[1023px]:z-30 max-[1023px]:shadow-xl",
          mobilePane === "settings" ? "max-[1023px]:block" : "max-[1023px]:hidden",
          "min-[1024px]:block"
        )}>
          <SettingsPanel />
        </div>
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
