import type { Metadata } from "next";
import { FormPlayer } from "@/components/player/FormPlayer";
import { fetchPublicForm } from "@/lib/api/public";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await params;
  try {
    const form = await fetchPublicForm(publicId);
    return { title: form.title, description: "Complete this form", openGraph: { title: form.title, description: "Complete this form" } };
  } catch {
    return { title: `Form ${publicId}`, description: "Complete this form" };
  }
}

export default async function PublicFormPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <FormPlayer publicId={publicId} />;
}
