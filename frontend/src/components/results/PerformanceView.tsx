"use client";

import type { FormSummary } from "@/lib/types";
import {
  FileText,
  CheckCircle,
  Percent,
  Clock,
  Layers,
  HelpCircle,
} from "lucide-react";

interface PerformanceViewProps {
  summary: FormSummary;
}

export function PerformanceView({ summary }: PerformanceViewProps) {
  const completionRate =
    summary.completion_rate <= 1
      ? summary.completion_rate * 100
      : summary.completion_rate;

  const total = summary.total_responses;
  const completed = summary.completed_responses;
  const partial =
    summary.partial_responses ??
    Math.max(0, summary.total_responses - summary.completed_responses);

  const avgMinutes =
    summary.average_time_seconds != null
      ? Math.round(summary.average_time_seconds / 60)
      : null;

  const cards = [
    {
      label: "Total responses",
      value: String(total),
      icon: FileText,
      tooltip: "Total number of people who opened and started the form",
    },
    {
      label: "Completed",
      value: String(completed),
      icon: CheckCircle,
      tooltip: "Responses where all questions were answered and submitted",
    },
    {
      label: "Completion rate",
      value: `${completionRate.toFixed(1)}%`,
      icon: Percent,
      tooltip: "Percentage of starters who submitted the form",
    },
    {
      label: "Partial",
      value: String(partial),
      icon: Layers,
      tooltip: "Responses in progress or abandoned before submission",
    },
    {
      label: "Average time",
      value: avgMinutes != null ? `${avgMinutes}m` : "—",
      icon: Clock,
      tooltip: "Average duration from first question to submission",
    },
  ];

  const timeline = summary.responses_per_day ?? [];
  const maxDayCount = Math.max(1, ...timeline.map((d) => d.count));

  // Determine tick markers for integer Y-axis
  const yTicks = [maxDayCount, Math.round(maxDayCount / 2), 0];

  return (
    <div className="space-y-6">
      {/* Five Stat Cards: white cards, radius 16, neutral grey icons, big number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-[16px] p-5 border border-[#ececec] flex flex-col justify-between shadow-sm"
            >
              <div className="flex items-center justify-between text-[#6b6b6b] mb-3">
                <span className="text-xs font-medium">{card.label}</span>
                <Icon size={16} className="text-[#9b9b9b]" />
              </div>
              <div>
                <span className="text-[32px] font-normal leading-tight text-[#262627]">
                  {card.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Responses over time chart */}
      <div className="bg-white rounded-[16px] p-6 border border-[#ececec] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-[#262627]">
            Responses over time
          </h2>
          <span className="text-xs text-neutral-400">Last 14 days</span>
        </div>

        {timeline.length === 0 || maxDayCount === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-neutral-500">Waiting for responses</p>
            <p className="text-xs text-neutral-400 mt-1">
              Your timeline data will appear here once responses are collected.
            </p>
          </div>
        ) : (
          <div className="flex">
            {/* Y-axis integer ticks */}
            <div className="flex flex-col justify-between h-48 pr-3 pb-6 text-[11px] text-neutral-400 select-none">
              {yTicks.map((tick, i) => (
                <span key={i}>{tick}</span>
              ))}
            </div>

            {/* Bars container */}
            <div className="flex-1 flex flex-col">
              <div className="flex h-48 items-end gap-2 border-b border-[#ececec] pb-1">
                {timeline.map((day) => {
                  const heightPercent =
                    maxDayCount > 0 ? (day.count / maxDayCount) * 100 : 0;
                  const dateObj = new Date(day.date);
                  const shortDate = isNaN(dateObj.getTime())
                    ? day.date
                    : dateObj.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });

                  return (
                    <div
                      key={day.date}
                      className="group relative flex-1 flex flex-col items-center justify-end h-full"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-9 z-20 hidden group-hover:flex flex-col items-center bg-[#262627] text-white text-[11px] py-1 px-2.5 rounded shadow-lg whitespace-nowrap pointer-events-none">
                        <span>
                          {shortDate}: {day.count} response{day.count === 1 ? "" : "s"}
                        </span>
                      </div>

                      {/* Bar (#a666bb) */}
                      <div
                        className="w-full rounded-t transition-all bg-[#a666bb] hover:opacity-90"
                        style={{
                          height: day.count > 0 ? `${Math.max(6, heightPercent)}%` : "2px",
                          backgroundColor: day.count > 0 ? "#a666bb" : "#e5e5e5",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels (short dates) */}
              <div className="flex gap-2 pt-2 text-[10px] text-neutral-400">
                {timeline.map((day) => {
                  const dateObj = new Date(day.date);
                  const label = isNaN(dateObj.getTime())
                    ? day.date
                    : dateObj.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                  return (
                    <span
                      key={day.date}
                      className="flex-1 text-center truncate"
                      title={day.date}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
