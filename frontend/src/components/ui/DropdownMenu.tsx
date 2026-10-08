/**
 * DropdownMenu – built on Radix UI.
 * Provides DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator.
 */
"use client";

import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export const DropdownMenu = RadixDropdownMenu.Root;
export const DropdownMenuTrigger = RadixDropdownMenu.Trigger;

export function DropdownMenuContent({ children, className, align = "end" }: { children: ReactNode; className?: string; align?: "start" | "center" | "end" }) {
  return (
    <RadixDropdownMenu.Portal>
      <RadixDropdownMenu.Content
        align={align}
        sideOffset={8}
        className={cn(
          "z-[100] min-w-[200px] bg-white rounded-xl shadow-lg border border-[#EBEBEB] p-1",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=top]:slide-in-from-bottom-2",
          "data-[side=right]:slide-in-from-left-2",
          "data-[side=left]:slide-in-from-right-2",
          className
        )}
      >
        {children}
      </RadixDropdownMenu.Content>
    </RadixDropdownMenu.Portal>
  );
}

export function DropdownMenuItem({ children, className, onSelect, disabled, variant = "default" }: { children: ReactNode; className?: string; onSelect?: () => void; disabled?: boolean; variant?: "default" | "danger" }) {
  return (
    <RadixDropdownMenu.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none transition-colors select-none",
        "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
        variant === "danger" 
          ? "text-[#E53E3E] data-[highlighted]:bg-[#FFF5F5]"
          : "text-[#262627] data-[highlighted]:bg-[#F5F5F5]",
        className
      )}
    >
      {children}
    </RadixDropdownMenu.Item>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <RadixDropdownMenu.Separator
      className={cn("h-px bg-[#EBEBEB] my-1 mx-2", className)}
    />
  );
}
