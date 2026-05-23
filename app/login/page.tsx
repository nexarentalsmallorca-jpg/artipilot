export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#050b10] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="text-sm text-emerald-400 font-medium">
          Private system
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          Artipilot Private Dashboard
        </h1>
        <p className="mt-3 text-slate-400">
          Secure access only. Login system will be connected here.
        </p>
        <div className="mt-6 rounded-2xl bg-black/30 p-4 text-sm text-slate-300">
          If you can see this page on private.artipilot.com, the private domain routing is working.
        </div>
      </div>
    </main>
  );
}
