export default function ComingSoonPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#030509] px-6 text-center text-white">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-500/10 text-3xl font-bold text-emerald-400">
        A
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
        Artipilot
      </p>
      <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Coming Soon</h1>
      <p className="mt-4 max-w-md text-slate-400">
        We are rebuilding the public Artipilot SaaS experience. The private
        dashboard is available on the private domain only.
      </p>
    </main>
  );
}
