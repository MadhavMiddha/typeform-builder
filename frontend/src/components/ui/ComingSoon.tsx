import type { ReactNode } from "react";

export function ComingSoon({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  return (
    <div aria-disabled={disabled} className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
      <span>{children}</span>
      <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">Coming soon</span>
    </div>
  );
}
