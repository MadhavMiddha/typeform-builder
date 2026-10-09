import React from "react";
import { cn } from "@/lib/utils";
import {
  AlignLeft,
  AlignJustify,
  Mail,
  List,
  CheckSquare,
  ToggleLeft,
  Star,
  Hash,
} from "lucide-react";
import type { QuestionType } from "@/lib/types";

interface QuestionTypeBadgeProps {
  type: QuestionType | string;
  number?: number | string;
  className?: string;
  size?: "sm" | "md";
}

// Global rules:
// short/long text: light blue
// email: light pink
// multiple choice/dropdown/yes-no: lavender
// rating: light green
// number: light yellow
// DISTINCT icons for every type!
const TYPE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: React.ComponentType<{ size: number; className?: string }> }
> = {
  short_text: {
    label: "Short text",
    bg: "bg-[#e0f2fe]", // light blue
    text: "text-[#0284c7]",
    icon: AlignLeft,
  },
  long_text: {
    label: "Long text",
    bg: "bg-[#e0f2fe]", // light blue
    text: "text-[#0284c7]",
    icon: AlignJustify,
  },
  email: {
    label: "Email",
    bg: "bg-[#fce7f3]", // light pink
    text: "text-[#db2777]",
    icon: Mail,
  },
  multiple_choice: {
    label: "Multiple choice",
    bg: "bg-[#ede9fe]", // lavender
    text: "text-[#7c3aed]",
    icon: List,
  },
  dropdown: {
    label: "Dropdown",
    bg: "bg-[#ede9fe]", // lavender
    text: "text-[#7c3aed]",
    icon: CheckSquare,
  },
  yes_no: {
    label: "Yes/No",
    bg: "bg-[#ede9fe]", // lavender
    text: "text-[#7c3aed]",
    icon: ToggleLeft,
  },
  rating: {
    label: "Rating",
    bg: "bg-[#dcfce7]", // light green
    text: "text-[#16a34a]",
    icon: Star,
  },
  number: {
    label: "Number",
    bg: "bg-[#fef9c3]", // light yellow
    text: "text-[#ca8a04]",
    icon: Hash,
  },
};

export function QuestionTypeBadge({
  type,
  number,
  className,
  size = "md",
}: QuestionTypeBadgeProps) {
  const config = TYPE_CONFIG[type] || {
    label: type,
    bg: "bg-neutral-100",
    text: "text-neutral-600",
    icon: AlignLeft,
  };

  const Icon = config.icon;
  const iconSize = size === "sm" ? 12 : 14;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 font-medium shrink-0 select-none",
        config.bg,
        config.text,
        size === "sm" ? "text-[11px] h-5" : "text-xs h-6",
        className
      )}
      title={config.label}
    >
      <Icon size={iconSize} className="shrink-0" />
      {number !== undefined && number !== null && (
        <span className="font-semibold text-neutral-800">{number}</span>
      )}
    </span>
  );
}

export function getQuestionTypeIcon(type: string, size = 15) {
  const config = TYPE_CONFIG[type];
  if (!config) return <AlignLeft size={size} />;
  const Icon = config.icon;
  return <Icon size={size} className={config.text} />;
}
