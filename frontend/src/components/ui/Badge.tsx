/**
 * Badge – status indicator.
 */
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "draft" | "published" | "error" | "warning";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[#F5F5F5] text-[#4A4A4A] border-[#D1D1D1]",
  draft: "bg-[#F5F5F5] text-[#6B6B6B] border-[#D1D1D1]",
  published: "bg-[#F0FDF9] text-[#0A9B74] border-[#0EC290]/30",
  error: "bg-[#FFF5F5] text-[#C53030] border-[#E53E3E]/30",
  warning: "bg-[#FFFFF0] text-[#975A16] border-[#D69E2E]/30",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
