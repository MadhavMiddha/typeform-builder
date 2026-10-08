/**
 * Dialog – accessible modal dialog built on Radix UI.
 * Provides: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
 *           DialogDescription, DialogFooter, DialogClose.
 */
"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

interface DialogContentProps {
  children: ReactNode;
  className?: string;
  /** Whether to show the default X close button in the top-right. Default true. */
  showClose?: boolean;
}

export function DialogContent({
  children,
  className,
  showClose = true,
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      {/* Overlay */}
      <RadixDialog.Overlay className="fixed inset-0 bg-black/40 z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

      {/* Content */}
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210]",
          "bg-white rounded-2xl shadow-xl",
          "w-[90vw] max-w-md",
          "p-6",
          "focus:outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "duration-200",
          className
        )}
      >
        {children}
        {showClose && (
          <RadixDialog.Close
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded-lg p-1 text-[#9B9B9B] hover:text-[#262627] hover:bg-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#262627] transition-colors"
          >
            <X size={18} />
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RadixDialog.Title className={cn("text-lg font-semibold text-[#262627] leading-snug", className)}>
      {children}
    </RadixDialog.Title>
  );
}

export function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RadixDialog.Description className={cn("text-sm text-[#6B6B6B] mt-1.5 leading-relaxed", className)}>
      {children}
    </RadixDialog.Description>
  );
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex justify-end gap-3 mt-6", className)}>
      {children}
    </div>
  );
}
