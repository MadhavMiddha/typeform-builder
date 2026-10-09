"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Download, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useResponse, useResponses, downloadResponsesCsv } from "@/lib/api/results";
import type { FormRead, ResponseListItem } from "@/lib/types";

function ResponseDrawer({ form, responseId, onClose, onPrevious, onNext, canGoPrevious, canGoNext }: { form: FormRead; responseId: number; onClose: () => void; onPrevious: () => void; onNext: () => void; canGoPrevious: boolean; canGoNext: boolean }) {
  const { data, isLoading, isError } = useResponse(form.id, responseId);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && canGoPrevious) onPrevious();
      if (event.key === "ArrowRight" && canGoNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrevious, onNext, canGoPrevious, canGoNext]);
  return <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l bg-white p-6 shadow-2xl" role="dialog" aria-label="Response details">
    <div className="flex items-center justify-between"><div className="flex items-center gap-1"><button type="button" disabled={!canGoPrevious} onClick={onPrevious} aria-label="Previous response" title="Previous response" className="rounded p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft /></button><h2 className="text-lg font-semibold">Response #{responseId}</h2><button type="button" disabled={!canGoNext} onClick={onNext} aria-label="Next response" title="Next response" className="rounded p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight /></button></div><button onClick={onClose} aria-label="Close response"><X /></button></div>
    {isLoading ? <div className="mt-8 space-y-4"><Skeleton className="h-4 w-32" />{form.questions.slice(0, 5).map((question) => <Skeleton key={question.id} className="h-16" />)}</div> : data ? <div className="mt-6 space-y-5"><p className="text-xs text-neutral-500">{data.status} · {new Date(data.submitted_at ?? data.started_at).toLocaleString()}</p>{form.questions.map((question, index) => {
      const answer = data.answers.find((entry) => entry.question_id === question.id);
      const selected = answer?.chosen_options?.join(", ") || answer?.chosen_option_ids?.map((id) => question.options.find((option) => option.id === id)?.label).filter(Boolean).join(", ");
      const value = answer?.value_text ?? answer?.value_number ?? (answer?.value_bool == null ? "" : answer.value_bool ? "Yes" : "No");
      return <div key={question.id} className="border-b pb-4"><p className="text-sm font-medium"><span className="mr-2 text-neutral-400">{index + 1}.</span>{question.title}</p><p className="mt-1 text-sm text-neutral-600">{selected || String(value) || "No answer"}</p></div>;
    })}</div> : <p className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{isError ? "Unable to load this response. Try again." : "Response unavailable."}</p>}
  </aside>;
}

export function ResponsesView({ form }: { form: FormRead }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "completed" | "partial">("all");
  const [selected, setSelected] = useState<number | null>(null);
  const responses = useResponses(form.id, page, pageSize, status);
  const items = (responses.data?.items ?? []).filter((item) => String(item.id).includes(query) || item.status.includes(query.toLowerCase()));
  const pages = responses.data?.total_pages ?? Math.max(1, Math.ceil((responses.data?.total ?? 0) / pageSize));
  const selectedIndex = selected === null ? -1 : items.findIndex((item) => item.id === selected);
  const goPrevious = useCallback(() => { if (selectedIndex > 0) setSelected(items[selectedIndex - 1].id); }, [items, selectedIndex]);
  const goNext = useCallback(() => { if (selectedIndex >= 0 && selectedIndex < items.length - 1) setSelected(items[selectedIndex + 1].id); }, [items, selectedIndex]);
  const filename = `${form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "form"}-responses-${new Date().toISOString().slice(0, 10)}.csv`;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><div className="relative w-full max-w-xs"><Search size={15} className="absolute left-3 top-3 text-neutral-400" /><Input aria-label="Filter responses" placeholder="Filter responses" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" /></div><select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="all">All</option><option value="completed">Completed</option><option value="partial">Partial</option></select></div><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => responses.refetch()}><RefreshCw size={14} /> Refresh</Button><Button variant="secondary" size="sm" onClick={() => downloadResponsesCsv(form.id, filename)}><Download size={14} /> CSV</Button></div></div>
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="sticky top-0 z-10 bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-4 py-3">Response</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Submitted</th>{form.questions.slice(0, 3).map((question, index) => <th key={question.id} className="max-w-[180px] px-4 py-3"><span title={question.title} className="block truncate"><span className="mr-1 text-neutral-400">{index + 1}.</span>{question.title}</span></th>)}<th className="px-4 py-3">Answers</th></tr></thead><tbody>{responses.isLoading ? <tr><td colSpan={7} className="px-4 py-12"><div className="space-y-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-5/6" /><Skeleton className="h-5 w-2/3" /></div></td></tr> : responses.isError ? <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-red-700">Unable to load responses. Try refreshing.</td></tr> : items.map((item: ResponseListItem) => <tr key={item.id} tabIndex={0} onClick={() => setSelected(item.id)} onKeyDown={(event) => event.key === "Enter" && setSelected(item.id)} className="cursor-pointer border-t hover:bg-neutral-50"><td className="px-4 py-3 font-medium">#{item.id}</td><td className="px-4 py-3 capitalize">{item.status}</td><td className="px-4 py-3 text-neutral-500">{new Date(item.submitted_at ?? item.started_at).toLocaleString()}</td>{form.questions.slice(0, 3).map((question) => <td key={question.id} className="max-w-[180px] px-4 py-3 text-neutral-600"><span title={item.answer_previews?.[String(question.id)] ?? "No answer"} className="block truncate">{item.answer_previews?.[String(question.id)] || "No answer"}</span></td>)}<td className="px-4 py-3">{item.answer_count}</td></tr>)}{!responses.isLoading && !responses.isError && items.length === 0 && <tr><td colSpan={7} className="px-4 py-16 text-center text-neutral-500"><p>No responses yet</p>{form.status === "published" && <button className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#7657ff]" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/f/${form.public_id}`)}><Copy size={13} /> Copy share link</button>}</td></tr>}</tbody></table></div>
    <div className="flex items-center justify-between text-sm text-neutral-500"><label>Rows <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-2 rounded border px-2 py-1">{[10, 25, 50].map((size) => <option key={size}>{size}</option>)}</select></label><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft /></button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight /></button></div></div>
    {selected !== null && <ResponseDrawer form={form} responseId={selected} onClose={() => setSelected(null)} onPrevious={goPrevious} onNext={goNext} canGoPrevious={selectedIndex > 0} canGoNext={selectedIndex >= 0 && selectedIndex < items.length - 1} />}
  </div>;
}
