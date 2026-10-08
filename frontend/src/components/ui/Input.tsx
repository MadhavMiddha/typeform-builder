/**
 * Input – reusable input primitive with label and error state.
 */
"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, wrapperClassName, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className={cn("flex flex-col gap-1", wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#262627]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-10 px-3 rounded-lg border bg-white text-[#262627] text-sm",
            "placeholder:text-[#9B9B9B]",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#262627] focus:ring-offset-0 focus:border-[#262627]",
            error
              ? "border-[#E53E3E] focus:ring-[#E53E3E]"
              : "border-[#D1D1D1]",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-[#E53E3E] mt-0.5"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
