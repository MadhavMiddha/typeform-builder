"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "@/lib/api/forms";
import { useFormSummary } from "@/lib/api/results";
import { BuilderProvider, useBuilderStore } from "@/hooks/useBuilderStore";
import { TopBar } from "@/components/builder/TopBar";
import { SummaryView } from "@/components/results/SummaryView";
import { ResponsesView } from "@/components/results/ResponsesView";
import { Skeleton } from "@/components/ui/Skeleton";
import type { FormRead } from "@/lib/types";

function ResultsContent({ form }: { form: FormRead }) {
  const { dispatch } = useBuilderStore();
  const [tab, setTab] = useState<"summary" | "responses">("summary");
  const summary = useFormSummary(form.id);
  useEffect(() => { dispatch({ type: "SET_FORM", payload: form }); }, [dispatch, form]);
  return <div className="min-h-screen bg-[#fafafa] text-brand"><TopBar activeTab="results" />
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#7657ff]">Results</p><h1 className="mt-1 text-3xl font-semibold">{form.title}</h1><p className="mt-2 text-sm text-neutral-500">Understand how people are responding to your form.</p></div><div className="flex rounded-lg border bg-white p-1"><button onClick={() => setTab("summary")} className={`rounded-md px-4 py-2 text-sm font-medium ${tab === "summary" ? "bg-brand text-white" : "text-neutral-500"}`}>Summary</button><button onClick={() => setTab("responses")} className={`rounded-md px-4 py-2 text-sm font-medium ${tab === "responses" ? "bg-brand text-white" : "text-neutral-500"}`}>Responses</button></div></div>
      {tab === "summary" ? summary.isLoading ? <div className="grid gap-4 sm:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div> : summary.isError ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-neutral-500">Unable to load summary. Try refreshing.</div> : <SummaryView onViewAll={() => setTab("responses")} summary={summary.data ?? { total_responses: 0, completed_responses: 0, partial_responses: 0, completion_rate: 0, questions: [] }} /> : <ResponsesView form={form} />}
    </main>
  </div>;
}

function ResultsLoader() {
  const params = useParams();
  const router = useRouter();
  const formId = Number(params.id);
  const { data: form, isLoading, isError } = useForm(formId);
  if (isLoading) return <div className="p-8"><Skeleton className="h-10 w-72" /></div>;
  if (isError || !form) return <div className="p-10 text-center"><h1 className="text-xl font-semibold">Form not found</h1><button className="mt-4 underline" onClick={() => router.push("/")}>Return to dashboard</button></div>;
  return <ResultsContent form={form} />;
}

export default function ResultsPage() {
  return <Suspense fallback={<div className="p-8"><Skeleton className="h-10 w-72" /></div>}><BuilderProvider><ResultsLoader /></BuilderProvider></Suspense>;
}
