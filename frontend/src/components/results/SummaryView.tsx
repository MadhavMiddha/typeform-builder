"use client";

import type { FormSummary, QuestionSummary } from "@/lib/types";
import { BarChart3, CheckCircle2, ClipboardList, Percent, Hash, ListChecks, MessageSquare, Star, type LucideIcon } from "lucide-react";

function QuestionCard({ item, number, onViewAll }: { item: QuestionSummary; number: number; onViewAll?: () => void }) {
  const counts = item.choices ?? [];
  const distribution = Object.entries(item.distribution ?? {}).map(([label, count]) => ({ label, count }));
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="flex items-center gap-2 font-semibold text-brand"><span className="text-neutral-400">{number}.</span>{item.type === "rating" ? <Star size={15} /> : item.type === "number" ? <Hash size={15} /> : item.type === "multiple_choice" || item.type === "dropdown" ? <ListChecks size={15} /> : <MessageSquare size={15} />}{item.title ?? `Question ${item.question_id}`}</h3>
      <p className="mt-1 text-xs text-neutral-500">{item.answered_count ?? 0} answered · {item.skipped_count ?? Math.max(0, (item.total ?? 0) - (item.answered_count ?? 0))} skipped</p>
      {item.average != null && <p className="mt-3 text-2xl font-semibold">{item.average.toFixed(1)} <span className="text-sm font-normal text-neutral-500">average</span></p>}
      {item.minimum != null && <p className="mt-2 text-xs text-neutral-500">Min {item.minimum} · Max {item.maximum}</p>}
      {counts.length > 0 && <div className="mt-4 space-y-3">{counts.map((count, index) => {
        const percentage = item.percentages?.[index]?.percentage ?? 0;
        return <div key={count.option_id ?? `${item.question_id}-${index}`}><div className="mb-1 flex justify-between text-xs"><span>{count.label}</span><span>{count.count} ({percentage.toFixed(1)}%)</span></div><div className="h-2 rounded-full bg-neutral-100"><div className="h-2 rounded-full bg-[#7657ff]" style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} /></div></div>;
      })}</div>}
      {distribution.length > 0 && <div className="mt-4 space-y-3">{distribution.map((count) => {
        const max = Math.max(...distribution.map((entry) => entry.count), 1);
        return <div key={count.label}><div className="mb-1 flex justify-between text-xs"><span>{count.label}</span><span>{count.count}</span></div><div className="h-2 rounded-full bg-neutral-100"><div className="h-2 rounded-full bg-[#7657ff]" style={{ width: `${(count.count / max) * 100}%` }} /></div></div>;
      })}</div>}
      {item.type === "yes_no" && ((item.yes_count ?? 0) + (item.no_count ?? 0)) > 0 && <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs"><span>Yes {item.yes_count ?? 0}</span><span>No {item.no_count ?? 0}</span></div>
        <div className="flex h-3 overflow-hidden rounded-full bg-rose-100"><div className="bg-emerald-500" style={{ width: `${((item.yes_count ?? 0) / ((item.yes_count ?? 0) + (item.no_count ?? 0))) * 100}%` }} /></div>
      </div>}
      {item.latest_answers?.map((answer, index) => <p key={`${item.question_id}-${index}-${answer}`} className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{answer}</p>)}
      {(item.type === "short_text" || item.type === "long_text" || item.type === "email") && onViewAll && <button type="button" onClick={onViewAll} className="mt-3 text-sm font-semibold text-[#7657ff] hover:underline">View all</button>}
    </article>
  );
}

export function SummaryView({ summary, onViewAll }: { summary: FormSummary; onViewAll?: () => void }) {
  const completion = summary.completion_rate <= 1 ? summary.completion_rate * 100 : summary.completion_rate;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {([
        [ClipboardList, "Total responses", summary.total_responses],
        [CheckCircle2, "Completed", summary.completed_responses],
        [Percent, "Completion rate", `${completion.toFixed(0)}%`],
        [BarChart3, "Partial", summary.partial_responses ?? Math.max(summary.total_responses - summary.completed_responses, 0)],
        [BarChart3, "Average time", summary.average_time_seconds == null ? "—" : `${Math.round(summary.average_time_seconds / 60)}m`],
      ] as [LucideIcon, string, string | number][]).map(([Icon, label, value]) => <div key={label} className="rounded-xl border border-neutral-200 bg-white p-5"><Icon size={18} className="text-[#7657ff]" /><p className="mt-4 text-2xl font-semibold text-brand">{String(value)}</p><p className="mt-1 text-xs text-neutral-500">{label}</p></div>)}
    </div>
    <div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="font-semibold text-brand">Responses over the last 14 days</h2><div className="mt-5 flex h-32 items-end gap-1">{(summary.responses_per_day ?? Array.from({ length: 14 }, (_, index) => ({ date: String(index), count: 0 }))).map((day) => { const max = Math.max(...(summary.responses_per_day ?? []).map((entry) => entry.count), 1); return <div key={day.date} title={`${day.date}: ${day.count}`} className="flex-1 rounded-t bg-[#7657ff] opacity-80" style={{ height: `${Math.max(4, (day.count / max) * 100)}%` }} />; })}</div></div>
    <div><h2 className="mb-3 text-lg font-semibold text-brand">Question breakdown</h2><div className="grid gap-4 lg:grid-cols-2">{summary.questions?.map((item, index) => <QuestionCard key={item.question_id} item={item} number={index + 1} onViewAll={onViewAll} />)}</div></div>
  </div>;
}
