/**
 * Skeleton – pulse animation for loading states.
 */
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[#F5F5F5]", className)}
      {...props}
    />
  );
}
