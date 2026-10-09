import type { Metadata } from "next";
import { FormPlayer } from "@/components/player/FormPlayer";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await params;
  return { title: `Form ${publicId}`, description: "Complete this form" };
}

export default async function PublicFormPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <FormPlayer publicId={publicId} />;
}
