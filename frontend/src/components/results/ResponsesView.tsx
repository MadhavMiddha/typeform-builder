"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Ellipsis,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { QuestionTypeBadge } from "@/components/ui/QuestionTypeBadge";
import {
  useResponse,
  useResponses,
  useDeleteResponse,
} from "@/lib/api/results";
import { ExportDialog } from "./ExportDialog";
import type { FormRead, QuestionRead, ResponseListItem, ResponseRead } from "@/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function titleSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "form";
}

function getAnswerDisplay(
  question: QuestionRead,
  answer: ReturnType<ResponseRead["answers"]["find"]>
): string {
  if (!answer) return "";
  if (answer.chosen_options?.length) return answer.chosen_options.join(", ");
  if (answer.chosen_option_ids?.length) {
    return answer.chosen_option_ids
      .map((id) => question.options.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(", ");
  }
  if (answer.value_bool !== null && answer.value_bool !== undefined)
    return answer.value_bool ? "Yes" : "No";
  if (answer.value_number !== null && answer.value_number !== undefined)
    return String(answer.value_number);
  return answer.value_text ?? "";
}

function getCellDisplay(question: QuestionRead, preview: string | undefined): React.ReactNode {
  if (!preview) return <span className="text-neutral-300">—</span>;
  const isChoice =
    question.type === "multiple_choice" ||
    question.type === "dropdown" ||
    question.type === "yes_no";
  if (isChoice) {
    const parts = preview.split(", ");
    return (
      <div className="flex flex-wrap gap-1">
        {parts.map((p) => (
          <span
            key={p}
            className="inline-flex items-center rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-700"
          >
            {p}
          </span>
        ))}
      </div>
    );
  }
  if (question.type === "rating") {
    const max = (question.settings?.rating_max as number) ?? 5;
    return <span className="text-sm">{preview} / {max}</span>;
  }
  if (question.type === "number") {
    return <span className="text-right text-sm tabular-nums">{preview}</span>;
  }
  return <span className="truncate text-sm">{preview}</span>;
}

// ─── Drawer ─────────────────────────────────────────────────────────────────

function ResponseDrawer({
  form,
  responseId,
  onClose,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: {
  form: FormRead;
  responseId: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}) {
  const { data, isLoading, isError } = useResponse(form.id, responseId);
  const deleteResponse = useDeleteResponse(form.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowUp" && canGoPrevious) onPrevious();
      if (e.key === "ArrowDown" && canGoNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrevious, onNext, canGoPrevious, canGoNext]);

  const respondentLabel =
    data?.answers.find((a) => {
      const q = form.questions.find((q) => q.id === a.question_id);
      return q?.type === "email";
    })?.value_text ?? "Anonymous";

  const handleDelete = async () => {
    await deleteResponse.mutateAsync(responseId);
    onClose();
    setConfirmDelete(false);
  };

  return (
    <aside
      className="flex flex-col border-l border-[#262627] bg-white"
      style={{ width: 420, minWidth: 320 }}
      role="dialog"
      aria-label="Response details"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-neutral-100 px-5 py-4">
        <div>
          <p className="font-semibold text-[#262627] text-[15px]">{respondentLabel}</p>
          {data && (
            <p className="mt-0.5 text-xs text-neutral-500">
              {fmtDate(data.submitted_at ?? data.started_at)}{" "}
              {fmtTime(data.submitted_at ?? data.started_at)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Status pill */}
          {data && (
            <span
              className={`mr-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                data.status === "completed"
                  ? "border border-green-500 bg-green-50 text-green-700"
                  : "border border-amber-400 bg-amber-50 text-amber-700"
              }`}
            >
              {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
            </span>
          )}
          <button
            disabled={!canGoPrevious}
            onClick={onPrevious}
            aria-label="Previous response"
            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronUp size={16} />
          </button>
          <button
            disabled={!canGoNext}
            onClick={onNext}
            aria-label="Next response"
            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronDown size={16} />
          </button>
          {/* Kebab menu */}
          <div className="relative">
            <button
              id="response-drawer-kebab"
              onClick={() => setConfirmDelete(true)}
              aria-label="More options"
              className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100"
            >
              <Ellipsis size={16} />
            </button>
          </div>
          <button
            onClick={onClose}
            aria-label="Close response drawer"
            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="border-b border-neutral-100 bg-red-50 px-5 py-3">
          <p className="text-sm font-medium text-red-700">Delete this response?</p>
          <p className="mt-0.5 text-xs text-red-600">This action cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteResponse.isPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteResponse.isPending ? "Deleting…" : "Delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tags (Coming Soon) */}
      <div className="border-b border-neutral-100 px-5 py-3">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Tags</p>
        <button
          disabled
          className="mt-1 text-xs text-neutral-400 cursor-not-allowed hover:text-neutral-500"
          title="Coming soon"
        >
          + Add tags
        </button>
      </div>

      {/* Answers */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))
        ) : isError ? (
          <p className="text-sm text-red-600">Unable to load this response.</p>
        ) : data ? (
          form.questions.map((question) => {
            const answer = data.answers.find((a) => a.question_id === question.id);
            const display = answer ? getAnswerDisplay(question, answer) : null;
            return (
              <div key={question.id}>
                <div className="flex items-center gap-2 mb-1">
                  <QuestionTypeBadge type={question.type} size="sm" />
                  <p className="text-xs font-medium text-neutral-600 truncate">{question.title || "Untitled question"}</p>
                </div>
                {display ? (
                  <p className="text-sm text-[#262627]">{display}</p>
                ) : (
                  <p className="text-sm text-neutral-400 italic">No answer</p>
                )}
              </div>
            );
          })
        ) : null}
      </div>
    </aside>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function ResponsesView({ form }: { form: FormRead }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "completed" | "partial">("all");
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Read response ID from URL
  const urlResponseId = searchParams.get("response");
  const openResponseId = urlResponseId ? parseInt(urlResponseId, 10) : null;

  const responses = useResponses(form.id, page, pageSize, status, query || undefined);
  const items = responses.data?.items ?? [];
  const total = responses.data?.total ?? 0;
  const pages = responses.data?.total_pages ?? Math.max(1, Math.ceil(total / pageSize));

  const openIndex = openResponseId !== null ? items.findIndex((i) => i.id === openResponseId) : -1;

  const setOpenResponse = useCallback(
    (id: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === null) {
        params.delete("response");
      } else {
        params.set("response", String(id));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const goPrevious = useCallback(() => {
    if (openIndex > 0) setOpenResponse(items[openIndex - 1].id);
  }, [items, openIndex, setOpenResponse]);

  const goNext = useCallback(() => {
    if (openIndex >= 0 && openIndex < items.length - 1) setOpenResponse(items[openIndex + 1].id);
  }, [items, openIndex, setOpenResponse]);

  // Header checkbox
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const someSelected = items.some((i) => selected.has(i.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((s) => {
        const n = new Set(s);
        items.forEach((i) => n.delete(i.id));
        return n;
      });
    } else {
      setSelected((s) => {
        const n = new Set(s);
        items.forEach((i) => n.add(i.id));
        return n;
      });
    }
  };

  const slug = titleSlug(form.title);
  const selectedIds = Array.from(selected);
  const exportCount = selectedIds.length || total;

  const rowPy = density === "compact" ? "py-2" : "py-3";

  return (
    <div className="flex h-full min-h-0">
      {/* Main panel */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 bg-white px-4 py-3">
          {/* Spam segmented */}
          <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-sm">
            <button className="px-3 py-1.5 font-medium bg-neutral-50 text-[#262627]">
              Responses
            </button>
            <button
              disabled
              title="Coming soon"
              className="px-3 py-1.5 text-neutral-400 cursor-not-allowed border-l border-neutral-200"
            >
              Spam [0]
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              ref={searchInputRef}
              aria-label="Search responses"
              placeholder="Search responses"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 py-1.5 text-sm focus:border-[#262627] focus:outline-none"
            />
          </div>

          {/* Status filter */}
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm focus:border-[#262627] focus:outline-none"
          >
            <option value="all">All time</option>
            <option value="completed">Completed</option>
            <option value="partial">Partial</option>
          </select>

          <div className="flex-1" />

          {/* Density toggle */}
          <button
            onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
            title={density === "compact" ? "Comfortable view" : "Compact view"}
          >
            {density === "compact" ? "Comfortable" : "Compact"}
          </button>

          {/* Export icon */}
          <button
            id="export-responses-btn"
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
            title="Export responses"
          >
            <Download size={14} />
            Export
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0" style={{ minWidth: 600 + form.questions.length * 140 }}>
            <thead>
              <tr className="sticky top-0 z-10 bg-neutral-50 text-xs text-neutral-500">
                {/* Checkbox */}
                <th className="border-b border-neutral-200 px-3 py-2.5 sticky left-0 bg-neutral-50 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    className="accent-[#262627]"
                  />
                </th>
                {/* Respondent */}
                <th className="border-b border-neutral-200 px-3 py-2.5 sticky left-10 bg-neutral-50 min-w-[140px] font-medium">
                  Respondent
                </th>
                {/* Response time */}
                <th className="border-b border-neutral-200 px-3 py-2.5 min-w-[120px] font-medium">
                  Response time
                </th>
                {/* Status */}
                <th className="border-b border-neutral-200 px-3 py-2.5 min-w-[100px] font-medium">
                  Type
                </th>
                {/* One column per question */}
                {form.questions.map((q, i) => (
                  <th
                    key={q.id}
                    className="border-b border-neutral-200 px-3 py-2.5 max-w-[180px] font-medium"
                    title={q.title}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <QuestionTypeBadge type={q.type} number={i + 1} size="sm" />
                      <span className="truncate text-[11px]">{q.title || "Untitled"}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 4 + form.questions.length }).map((__, j) => (
                        <td key={j} className="border-b border-neutral-100 px-3 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : responses.isError
                ? (
                    <tr>
                      <td colSpan={4 + form.questions.length} className="px-4 py-12 text-center text-sm text-red-600">
                        Unable to load responses. Try refreshing the page.
                      </td>
                    </tr>
                  )
                : items.length === 0
                ? (
                    <tr>
                      <td colSpan={4 + form.questions.length} className="px-4 py-16 text-center text-neutral-400">
                        No responses found.
                      </td>
                    </tr>
                  )
                : items.map((item: ResponseListItem) => {
                    const isOpen = item.id === openResponseId;
                    const isChecked = selected.has(item.id);
                    const respondent =
                      item.answer_previews?.[
                        String(form.questions.find((q) => q.type === "email")?.id ?? 0)
                      ] ?? "Anonymous";

                    return (
                      <tr
                        key={item.id}
                        className={`group cursor-pointer border-b border-neutral-100 transition-colors ${
                          isOpen ? "bg-neutral-50" : "hover:bg-neutral-50"
                        }`}
                        onClick={() => setOpenResponse(item.id)}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && setOpenResponse(item.id)}
                      >
                        {/* Checkbox */}
                        <td
                          className="px-3 sticky left-0 bg-white group-hover:bg-neutral-50 border-b border-neutral-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected((s) => {
                              const n = new Set(s);
                              if (n.has(item.id)) { n.delete(item.id); } else { n.add(item.id); }
                              return n;
                            });
                          }}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select response ${item.id}`}
                            checked={isChecked}
                            onChange={() => {}}
                            className="accent-[#262627]"
                          />
                        </td>

                        {/* Respondent */}
                        <td className={`px-3 ${rowPy} sticky left-10 bg-white group-hover:bg-neutral-50 border-b border-neutral-100 font-medium text-[#262627] text-sm`}>
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[120px]" title={respondent}>{respondent}</span>
                            {/* Expand icon on hover */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenResponse(item.id); }}
                              className="hidden group-hover:inline-flex rounded p-0.5 text-neutral-400 hover:text-[#262627] hover:bg-neutral-200"
                              aria-label="Open response"
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </td>

                        {/* Response time */}
                        <td className={`px-3 ${rowPy} border-b border-neutral-100`}>
                          <div className="text-xs text-neutral-700">{fmtDate(item.submitted_at ?? item.started_at)}</div>
                          <div className="text-xs text-neutral-400">{fmtTime(item.submitted_at ?? item.started_at)}</div>
                        </td>

                        {/* Status pill */}
                        <td className={`px-3 ${rowPy} border-b border-neutral-100`}>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              item.status === "completed"
                                ? "border border-green-500 bg-green-50 text-green-700"
                                : "border border-amber-400 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </td>

                        {/* One cell per question */}
                        {form.questions.map((q) => (
                          <td
                            key={q.id}
                            className={`px-3 ${rowPy} max-w-[180px] border-b border-neutral-100 text-neutral-600`}
                          >
                            {getCellDisplay(q, item.answer_previews?.[String(q.id)])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-neutral-100 bg-white px-4 py-3 text-sm text-neutral-500">
          <label className="flex items-center gap-2">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded border border-neutral-200 px-2 py-1 text-sm"
            >
              {[10, 25, 50].map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Previous page"
              className="rounded p-1 hover:bg-neutral-100 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {page} of {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
              aria-label="Next page"
              className="rounded p-1 hover:bg-neutral-100 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer — beside the table, not covering it */}
      {openResponseId !== null && (
        <ResponseDrawer
          form={form}
          responseId={openResponseId}
          onClose={() => setOpenResponse(null)}
          onPrevious={goPrevious}
          onNext={goNext}
          canGoPrevious={openIndex > 0}
          canGoNext={openIndex >= 0 && openIndex < items.length - 1}
        />
      )}

      {/* Export dialog */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        formId={form.id}
        titleSlug={slug}
        totalCount={total}
        selectedIds={selectedIds.length > 0 ? selectedIds : undefined}
        status={status !== "all" ? status : undefined}
        q={query || undefined}
      />
    </div>
  );
}
