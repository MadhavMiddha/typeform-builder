"use client";

import { useState, useMemo } from "react";
import type { FormSummary, QuestionSummary } from "@/lib/types";
import { QuestionTypeBadge } from "@/components/ui/QuestionTypeBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  ArrowUpDown,
  List,
  Filter,
  Calendar,
  Quote,
  Search,
  HelpCircle,
  BarChart2,
  Table as TableIcon,
  AlignLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryViewProps {
  summary: FormSummary;
  onFilterChange?: (filters: { days?: number; status?: string }) => void;
}

export function SummaryView({ summary }: SummaryViewProps) {
  const [compact, setCompact] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [mode, setMode] = useState<"count" | "percent">("count");
  const [dateRange, setDateRange] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  const [visibleCount, setVisibleCount] = useState<Record<number, number>>({});

  const total = summary.total_responses;

  // Filter & sort questions
  const questions = useMemo(() => {
    const list = [...(summary.questions || [])];
    list.sort((a, b) => (sortAsc ? a.question_id - b.question_id : b.question_id - a.question_id));
    return list;
  }, [summary.questions, sortAsc]);

  const handleSearch = (qid: number, text: string) => {
    setSearchQueries((prev) => ({ ...prev, [qid]: text }));
  };

  const handleShowMore = (qid: number) => {
    setVisibleCount((prev) => ({ ...prev, [qid]: (prev[qid] || 6) + 6 }));
  };

  return (
    <div className="space-y-6">
      {/* Part E.1 Toolbar: list toggle, sort arrows, # / % toggle, date dropdown, Filters popover */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#ececec]">
        <div className="flex items-center gap-2">
          {/* Compact / Expanded toggle */}
          <Tooltip content={compact ? "Switch to expanded cards" : "Switch to compact cards"}>
            <button
              onClick={() => setCompact(!compact)}
              aria-label="Toggle compact view"
              className={cn(
                "p-2 rounded-lg border border-[#ececec] text-neutral-600 hover:bg-[#f5f5f5] transition-colors",
                compact && "bg-[#262627] text-white hover:bg-black border-[#262627]"
              )}
            >
              <List size={16} />
            </button>
          </Tooltip>

          {/* Question order sort arrows */}
          <Tooltip content={sortAsc ? "Sort questions descending" : "Sort questions ascending"}>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              aria-label="Sort questions"
              className="p-2 rounded-lg border border-[#ececec] text-neutral-600 hover:bg-[#f5f5f5] transition-colors flex items-center gap-1"
            >
              <ArrowUpDown size={16} />
            </button>
          </Tooltip>

          {/* Segmented # | % toggle */}
          <div className="inline-flex rounded-lg border border-[#ececec] p-0.5 bg-[#f5f5f5]">
            <button
              onClick={() => setMode("count")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                mode === "count" ? "bg-white text-[#262627] shadow-sm" : "text-neutral-500 hover:text-[#262627]"
              )}
            >
              #
            </button>
            <button
              onClick={() => setMode("percent")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                mode === "percent" ? "bg-white text-[#262627] shadow-sm" : "text-neutral-500 hover:text-[#262627]"
              )}
            >
              %
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date dropdown */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              aria-label="Date range"
              className="h-9 rounded-lg border border-[#ececec] bg-white px-3 text-xs font-medium text-[#262627] focus:outline-none cursor-pointer"
            >
              <option value="all">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          {/* Filters popover */}
          <div className="relative">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              aria-label="Filters"
              className={cn(
                "h-9 px-3 rounded-lg border border-[#ececec] text-xs font-medium flex items-center gap-1.5 transition-colors",
                statusFilter !== "all"
                  ? "bg-[#262627] text-white border-[#262627]"
                  : "bg-white text-neutral-700 hover:bg-[#f5f5f5]"
              )}
            >
              <Filter size={14} />
              <span>Filters</span>
            </button>

            {showFilterPopover && (
              <div className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-[#ececec] bg-white p-3 shadow-xl">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Response status
                </p>
                <div className="space-y-1">
                  {(["all", "completed", "partial"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setStatusFilter(st);
                        setShowFilterPopover(false);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 text-xs rounded-lg capitalize transition-colors",
                        statusFilter === st
                          ? "bg-[#262627] text-white font-semibold"
                          : "text-neutral-700 hover:bg-[#f5f5f5]"
                      )}
                    >
                      {st === "all" ? "All responses" : st}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Part E.2 Question Cards */}
      <div className="space-y-6">
        {questions.map((question, idx) => (
          <QuestionSummaryCard
            key={question.question_id}
            question={question}
            number={idx + 1}
            totalResponses={total}
            mode={mode}
            compact={compact}
            searchQuery={searchQueries[question.question_id] || ""}
            onSearchChange={(text) => handleSearch(question.question_id, text)}
            visibleLimit={visibleCount[question.question_id] || 6}
            onShowMore={() => handleShowMore(question.question_id)}
          />
        ))}

        {questions.length === 0 && (
          <div className="bg-white rounded-[16px] p-12 text-center border border-[#ececec]">
            <p className="text-base font-medium text-[#262627]">Waiting for responses</p>
            <p className="text-xs text-neutral-400 mt-1">Your data will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single Question Summary Card
// ---------------------------------------------------------------------------
interface CardProps {
  question: QuestionSummary;
  number: number;
  totalResponses: number;
  mode: "count" | "percent";
  compact: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  visibleLimit: number;
  onShowMore: () => void;
}

function QuestionSummaryCard({
  question,
  number,
  totalResponses,
  mode,
  compact,
  searchQuery,
  onSearchChange,
  visibleLimit,
  onShowMore,
}: CardProps) {
  const answered = question.answered_count ?? 0;
  const isZero = answered === 0;

  return (
    <article className="bg-white rounded-[16px] p-6 border border-[#ececec] shadow-sm">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <QuestionTypeBadge type={question.type || "short_text"} number={number} />
            <h3 className="text-[20px] font-normal text-[#262627] truncate">
              {question.title || "Untitled question"}
            </h3>
          </div>
          <p className="text-xs text-[#6b6b6b]">
            {answered} out of {totalResponses} people answered this question.
          </p>
        </div>
      </div>

      <div className="h-px bg-[#ececec] my-4" />

      {/* Zero answers waiting state */}
      {isZero ? (
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-[#262627]">Waiting for responses</p>
          <p className="text-xs text-neutral-400 mt-1">Your data will appear here.</p>
        </div>
      ) : (
        /* Body by Type */
        <div>
          {/* Multiple Choice, Dropdown, Yes/No */}
          {(question.type === "multiple_choice" ||
            question.type === "dropdown" ||
            question.type === "yes_no") && (
            <ChoiceChart
              question={question}
              mode={mode}
              answered={answered}
              compact={compact}
            />
          )}

          {/* Rating and Number: Mean, Median, Std Dev tiles + bar chart */}
          {(question.type === "rating" || question.type === "number") && (
            <NumericSummary question={question} answered={answered} mode={mode} />
          )}

          {/* Text and Email: search input + quote cards grid */}
          {(question.type === "short_text" ||
            question.type === "long_text" ||
            question.type === "email") && (
            <TextResponsesGrid
              question={question}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              visibleLimit={visibleLimit}
              onShowMore={onShowMore}
            />
          )}
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Multiple Choice / Dropdown / Yes-No Vertical Bar Chart
// ---------------------------------------------------------------------------
function ChoiceChart({
  question,
  mode,
  answered,
  compact,
}: {
  question: QuestionSummary;
  mode: "count" | "percent";
  answered: number;
  compact: boolean;
}) {
  const [viewType, setViewType] = useState<"vertical" | "horizontal" | "table">("vertical");

  const items = useMemo(() => {
    if (question.type === "yes_no") {
      const yes = question.yes_count ?? 0;
      const no = question.no_count ?? 0;
      return [
        { label: "Yes", count: yes, percentage: answered ? (yes / answered) * 100 : 0 },
        { label: "No", count: no, percentage: answered ? (no / answered) * 100 : 0 },
      ];
    }
    return (question.choices || []).map((ch, i) => {
      const pct = question.percentages?.[i]?.percentage ?? (answered ? (ch.count / answered) * 100 : 0);
      return {
        label: ch.label,
        count: ch.count,
        percentage: pct,
      };
    });
  }, [question, answered]);

  const maxVal = Math.max(1, ...items.map((it) => it.count));

  return (
    <div className="space-y-4">
      {/* Top toolbar: Overview / Trends ("Coming soon") and view icons */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-[#ececec] p-0.5 bg-[#f5f5f5]">
          <button className="px-3 py-1 text-xs font-semibold rounded-md bg-white text-[#262627] shadow-sm">
            Overview
          </button>
          <Tooltip content="Coming soon">
            <button
              disabled
              className="px-3 py-1 text-xs font-medium rounded-md text-neutral-400 cursor-not-allowed"
            >
              Trends
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewType("table")}
            className={cn(
              "p-1.5 rounded-lg border border-[#ececec] text-neutral-600 hover:bg-[#f5f5f5]",
              viewType === "table" && "bg-[#262627] text-white hover:bg-black border-[#262627]"
            )}
            title="Table view"
          >
            <TableIcon size={14} />
          </button>
          <button
            onClick={() => setViewType("horizontal")}
            className={cn(
              "p-1.5 rounded-lg border border-[#ececec] text-neutral-600 hover:bg-[#f5f5f5]",
              viewType === "horizontal" && "bg-[#262627] text-white hover:bg-black border-[#262627]"
            )}
            title="Horizontal bars"
          >
            <AlignLeft size={14} />
          </button>
          <button
            onClick={() => setViewType("vertical")}
            className={cn(
              "p-1.5 rounded-lg border border-[#ececec] text-neutral-600 hover:bg-[#f5f5f5]",
              viewType === "vertical" && "bg-[#262627] text-white hover:bg-black border-[#262627]"
            )}
            title="Vertical bars"
          >
            <BarChart2 size={14} />
          </button>
        </div>
      </div>

      {viewType === "table" ? (
        <div className="border border-[#ececec] rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5f5f5] text-neutral-500 border-b border-[#ececec]">
              <tr>
                <th className="px-4 py-2 font-medium">Option</th>
                <th className="px-4 py-2 font-medium text-right">Responses</th>
                <th className="px-4 py-2 font-medium text-right">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b border-[#ececec] last:border-0 hover:bg-[#fafafa]">
                  <td className="px-4 py-2.5 font-medium text-[#262627]">{it.label}</td>
                  <td className="px-4 py-2.5 text-right text-neutral-700">{it.count}</td>
                  <td className="px-4 py-2.5 text-right text-neutral-700">{it.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewType === "horizontal" ? (
        <div className="space-y-3 pt-2">
          {items.map((it, idx) => {
            const displayVal = mode === "percent" ? `${it.percentage.toFixed(1)}%` : String(it.count);
            const fillWidth = maxVal > 0 ? (it.count / maxVal) * 100 : 0;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs text-[#262627]">
                  <span className="font-medium">{it.label}</span>
                  <span className="text-neutral-500">{displayVal}</span>
                </div>
                <div className="h-3 w-full bg-[#f5f5f5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#a666bb] rounded-full transition-all"
                    style={{ width: `${it.count > 0 ? Math.max(4, fillWidth) : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vertical bar chart (default) */
        <div className="pt-4">
          <div className="flex items-end gap-3 h-44 border-b border-[#ececec] pb-1 px-4">
            {items.map((it, idx) => {
              const displayVal =
                mode === "percent" ? `${it.percentage.toFixed(1)}%` : String(it.count);
              const heightPercent = maxVal > 0 ? (it.count / maxVal) * 100 : 0;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                >
                  <span className="text-[11px] font-semibold text-[#262627] mb-1">
                    {displayVal}
                  </span>
                  <div
                    className={cn(
                      "w-full max-w-[48px] rounded-t transition-all",
                      it.count > 0 ? "bg-[#a666bb]" : "bg-neutral-300 h-[2px]"
                    )}
                    style={{
                      height: it.count > 0 ? `${Math.max(8, heightPercent)}%` : "2px",
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* Labels under the bars */}
          <div className="flex gap-3 px-4 pt-2">
            {items.map((it, idx) => (
              <span
                key={idx}
                className="flex-1 text-center text-[11px] text-[#6b6b6b] truncate"
                title={it.label}
              >
                {it.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rating and Number Summary
// ---------------------------------------------------------------------------
function NumericSummary({
  question,
  answered,
  mode,
}: {
  question: QuestionSummary;
  answered: number;
  mode: "count" | "percent";
}) {
  const mean = question.average != null ? question.average.toFixed(2) : "—";
  const median = question.median != null ? question.median.toFixed(2) : "—";
  const stdDev = question.std_dev != null ? question.std_dev.toFixed(2) : "—";

  // Distribution chart
  const dist = question.distribution || {};
  const entries = Object.entries(dist).map(([step, count]) => ({
    step,
    count,
    pct: answered ? (count / answered) * 100 : 0,
  }));
  const maxCount = Math.max(1, ...entries.map((e) => e.count));

  return (
    <div className="space-y-6">
      {/* Three grey rounded tiles: Mean, Median, Standard deviation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#f5f5f5] rounded-xl p-4 text-center border border-[#ececec]">
          <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-500 font-medium mb-1">
            <span>Mean</span>
            <Tooltip content="The arithmetic average of all submitted numbers">
              <HelpCircle size={12} className="cursor-help" />
            </Tooltip>
          </div>
          <div className="text-[28px] font-normal text-[#262627]">{mean}</div>
        </div>

        <div className="bg-[#f5f5f5] rounded-xl p-4 text-center border border-[#ececec]">
          <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-500 font-medium mb-1">
            <span>Median</span>
            <Tooltip content="The middle value when all answers are sorted">
              <HelpCircle size={12} className="cursor-help" />
            </Tooltip>
          </div>
          <div className="text-[28px] font-normal text-[#262627]">{median}</div>
        </div>

        <div className="bg-[#f5f5f5] rounded-xl p-4 text-center border border-[#ececec]">
          <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-500 font-medium mb-1">
            <span>Standard deviation</span>
            <Tooltip content="Sample standard deviation (n-1) measure of spread">
              <HelpCircle size={12} className="cursor-help" />
            </Tooltip>
          </div>
          <div className="text-[28px] font-normal text-[#262627]">{stdDev}</div>
        </div>
      </div>

      {/* Distribution bar chart */}
      {entries.length > 0 && (
        <div className="pt-2">
          <div className="text-xs font-semibold text-[#262627] mb-3">Distribution</div>
          <div className="flex items-end gap-2 h-36 border-b border-[#ececec] pb-1 px-4">
            {entries.map((entry) => {
              const displayVal =
                mode === "percent" ? `${entry.pct.toFixed(0)}%` : String(entry.count);
              const height = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;

              return (
                <div
                  key={entry.step}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                >
                  <span className="text-[10px] font-semibold text-[#262627] mb-1">
                    {displayVal}
                  </span>
                  <div
                    className={cn(
                      "w-full max-w-[36px] rounded-t transition-all",
                      entry.count > 0 ? "bg-[#a666bb]" : "bg-neutral-300 h-[2px]"
                    )}
                    style={{
                      height: entry.count > 0 ? `${Math.max(6, height)}%` : "2px",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 px-4 pt-1.5 text-[11px] text-neutral-500">
            {entries.map((entry) => (
              <span key={entry.step} className="flex-1 text-center">
                {entry.step}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Short text, Long text, Email Quotes Grid
// ---------------------------------------------------------------------------
function TextResponsesGrid({
  question,
  searchQuery,
  onSearchChange,
  visibleLimit,
  onShowMore,
}: {
  question: QuestionSummary;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  visibleLimit: number;
  onShowMore: () => void;
}) {
  const answers = question.latest_answers || [];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return answers;
    return answers.filter((a) =>
      a.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [answers, searchQuery]);

  const displayed = filtered.slice(0, visibleLimit);

  return (
    <div className="space-y-4">
      {/* Search responses input */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search responses"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#ececec] focus:outline-none focus:border-[#262627]"
          />
        </div>
        <span className="text-xs text-neutral-500">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* 2-column grid of quote cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayed.map((answer, i) => (
          <div
            key={i}
            className="bg-[#fafafa] rounded-xl p-4 border border-[#ececec] flex flex-col justify-between"
          >
            <div className="flex items-start gap-2.5">
              <Quote size={16} className="text-[#a666bb] shrink-0 mt-0.5" />
              <p className="text-xs text-[#262627] leading-relaxed break-words">
                {answer}
              </p>
            </div>
            <div className="mt-3 text-[11px] text-neutral-400 text-right">
              Recently
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-6 text-center text-xs text-neutral-400">
          No matching answers found.
        </div>
      )}

      {/* Show more button */}
      {filtered.length > visibleLimit && (
        <div className="text-center pt-2">
          <button
            onClick={onShowMore}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#ececec] text-[#262627] hover:bg-[#f5f5f5] transition-colors"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
