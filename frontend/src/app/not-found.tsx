export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#fafafa] flex items-center justify-center px-6 text-center">
      <div><p className="text-sm font-semibold text-[#6b5cff]">404</p><h1 className="mt-2 text-3xl font-semibold text-[#262627]">Page not found</h1><p className="mt-3 text-neutral-500">The page you requested does not exist.</p><a href="/" className="mt-6 inline-block rounded-lg bg-[#262627] px-5 py-2.5 text-sm font-medium text-white">Return home</a></div>
    </main>
  );
}
