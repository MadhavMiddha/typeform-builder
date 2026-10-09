import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit form",
  description: "Build and publish a conversational form.",
};

export default function EditFormLayout({ children }: { children: React.ReactNode }) {
  return children;
}
