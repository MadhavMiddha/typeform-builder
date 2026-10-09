/**
 * Utility functions used across the frontend.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a date string as a relative time (e.g. "2 days ago"). */
export function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m} minute${m !== 1 ? "s" : ""} ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h} hour${h !== 1 ? "s" : ""} ago`;
  }
  if (diffSec < 2592000) {
    const d = Math.floor(diffSec / 86400);
    return `${d} day${d !== 1 ? "s" : ""} ago`;
  }
  if (diffSec < 31536000) {
    const mo = Math.floor(diffSec / 2592000);
    return `${mo} month${mo !== 1 ? "s" : ""} ago`;
  }
  const y = Math.floor(diffSec / 31536000);
  return `${y} year${y !== 1 ? "s" : ""} ago`;
}

/** Build a public form URL from a public_id. */
export function publicFormUrl(publicId: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/f/${publicId}`;
}
