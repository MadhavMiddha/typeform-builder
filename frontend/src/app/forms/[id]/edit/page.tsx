"use client";

import { useForm } from "@/lib/api/forms";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Suspense } from "react";

function EditFormClient() {
  const params = useParams();
  const router = useRouter();
  const formId = parseInt(params.id as string, 10);
  
  const { data: form, isLoading, isError } = useForm(formId);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <header className="h-14 border-b bg-white flex items-center px-4 gap-4">
        <button 
          onClick={() => router.push("/")}
          className="p-1.5 rounded-md hover:bg-[#F5F5F5] text-[#6B6B6B] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        {isLoading ? (
          <Skeleton className="h-6 w-48" />
        ) : form ? (
          <h1 className="font-medium text-[#262627]">{form.title}</h1>
        ) : (
          <span className="text-[#E53E3E]">Form not found</span>
        )}
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        {isLoading ? (
          <div className="space-y-4 w-full max-w-sm">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6 mx-auto" />
          </div>
        ) : isError ? (
          <div className="text-[#E53E3E]">Failed to load form details.</div>
        ) : (
          <div className="bg-white p-12 rounded-2xl border shadow-sm max-w-lg w-full">
            <h2 className="text-2xl font-semibold text-[#262627] mb-3">Builder coming soon</h2>
            <p className="text-[#6B6B6B] mb-8">
              You are editing <strong>{form?.title}</strong>.<br/>
              The full form builder interface will be implemented in Phase 6.
            </p>
            <button 
              onClick={() => router.push("/")}
              className="px-6 py-2.5 bg-[#262627] text-white rounded-lg font-medium hover:bg-[#1a1a1b] transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EditFormPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Skeleton className="h-8 w-64 mx-auto" /></div>}>
      <EditFormClient />
    </Suspense>
  );
}
