/**
 * Button – reusable button primitive.
 * Variants: primary | secondary | ghost | danger
 * Sizes: sm | md | lg
 */
"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#262627] text-white hover:bg-[#1a1a1b] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#262627] focus-visible:ring-offset-2",
  secondary:
    "bg-white text-[#262627] border border-[#D1D1D1] hover:bg-[#F5F5F5] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#262627] focus-visible:ring-offset-2",
  ghost:
    "bg-transparent text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#262627] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#262627] focus-visible:ring-offset-2",
  danger:
    "bg-[#E53E3E] text-white hover:bg-[#C53030] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#E53E3E] focus-visible:ring-offset-2",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-xs rounded-md",
  md: "h-9 px-4 text-sm rounded-lg",
  lg: "h-11 px-6 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
