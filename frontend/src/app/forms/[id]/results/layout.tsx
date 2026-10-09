import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Results",
  description: "Review form responses and completion metrics.",
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
