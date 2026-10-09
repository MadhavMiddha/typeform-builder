"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@/lib/api/forms";
import { useFormSummary, useResponses } from "@/lib/api/results";
import { BuilderProvider, useBuilderStore } from "@/hooks/useBuilderStore";
import { FormHeader } from "@/components/builder/FormHeader";
import { PerformanceView } from "@/components/results/PerformanceView";
import { SummaryView } from "@/components/results/SummaryView";
import { ResponsesView } from "@/components/results/ResponsesView";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { FormRead } from "@/lib/types";

type ResultsTab = "performance" | "summary" | "responses";

function ResultsContent({ form }: { form: FormRead }) {
  const { dispatch } = useBuilderStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab sync with URL: ?tab=performance | summary | responses (Default = performance)
  const tabParam = searchParams.get("tab") as ResultsTab | null;
  const activeTab: ResultsTab =
    tabParam === "summary" || tabParam === "responses" ? tabParam : "performance";

  const summary = useFormSummary(form.id);
  const responsesQuery = useResponses(form.id, 1, 10, "all");

  useEffect(() => {
    dispatch({ type: "SET_FORM", payload: form });
  }, [dispatch, form]);

  const setTab = (nextTab: ResultsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`/forms/${form.id}/results?${params.toString()}`);
  };

  const totalResponses = responsesQuery.data?.total ?? summary.data?.total_responses ?? 0;

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#262627]">
      <FormHeader activeTab="results" formOverride={form} />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Rounded (16px) #f5f5f5 container for sub-tab bar */}
        <div className="bg-[#f5f5f5] rounded-[16px] p-1.5 inline-flex items-center gap-1 mb-6 border border-[#ececec]">
          <button
            onClick={() => setTab("performance")}
            className={cn(
              "px-4 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer relative",
              activeTab === "performance"
                ? "bg-white text-[#262627] font-semibold shadow-sm border-b-2 border-[#262627]"
                : "text-neutral-500 hover:text-[#262627]"
            )}
          >
            Form performance
          </button>
          <button
            onClick={() => setTab("summary")}
            className={cn(
              "px-4 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer relative",
              activeTab === "summary"
                ? "bg-white text-[#262627] font-semibold shadow-sm border-b-2 border-[#262627]"
                : "text-neutral-500 hover:text-[#262627]"
            )}
          >
            Response summary
          </button>
          <button
            onClick={() => setTab("responses")}
            className={cn(
              "px-4 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer relative",
              activeTab === "responses"
                ? "bg-white text-[#262627] font-semibold shadow-sm border-b-2 border-[#262627]"
                : "text-neutral-500 hover:text-[#262627]"
            )}
          >
            Responses [{totalResponses}]
          </button>
        </div>

        {/* Tab view rendering */}
        {activeTab === "performance" && (
          summary.isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : summary.isError ? (
            <div className="rounded-2xl border border-[#ececec] bg-white p-8 text-center text-sm text-neutral-500">
              Unable to load performance data. Please try refreshing.
            </div>
          ) : (
            <PerformanceView
              summary={
                summary.data ?? {
                  total_responses: 0,
                  completed_responses: 0,
                  partial_responses: 0,
                  completion_rate: 0,
                  questions: [],
                }
              }
            />
          )
        )}

        {activeTab === "summary" && (
          summary.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : summary.isError ? (
            <div className="rounded-2xl border border-[#ececec] bg-white p-8 text-center text-sm text-neutral-500">
              Unable to load summary data. Please try refreshing.
            </div>
          ) : (
            <SummaryView
              summary={
                summary.data ?? {
                  total_responses: 0,
                  completed_responses: 0,
                  partial_responses: 0,
                  completion_rate: 0,
                  questions: [],
                }
              }
            />
          )
        )}

        {activeTab === "responses" && <ResponsesView form={form} />}
      </main>
    </div>
  );
}

function ResultsLoader() {
  const params = useParams();
  const router = useRouter();
  const formId = Number(params.id);
  const { data: form, isLoading, isError } = useForm(formId);

  if (isLoading)
    return (
      <div className="p-8">
        <Skeleton className="h-10 w-72" />
      </div>
    );
  if (isError || !form)
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Form not found</h1>
        <button className="mt-4 underline" onClick={() => router.push("/")}>
          Return to dashboard
        </button>
      </div>
    );

  return <ResultsContent form={form} />;
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <Skeleton className="h-10 w-72" />
        </div>
      }
    >
      <BuilderProvider>
        <ResultsLoader />
      </BuilderProvider>
    </Suspense>
  );
}
