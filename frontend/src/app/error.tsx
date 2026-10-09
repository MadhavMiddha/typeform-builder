"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#fafafa] flex items-center justify-center px-6 text-center">
      <div><p className="text-sm font-semibold text-status-error">Something went wrong</p><h1 className="mt-2 text-3xl font-semibold text-[#262627]">We couldn't load this page</h1><button type="button" onClick={reset} className="mt-6 rounded-lg bg-[#262627] px-5 py-2.5 text-sm font-medium text-white">Try again</button></div>
    </main>
  );
}
