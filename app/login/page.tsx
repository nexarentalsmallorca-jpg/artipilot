import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B141A] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111B21] p-8 shadow-xl">
        <span className="inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Private
        </span>
        <h1 className="mt-3 text-2xl font-semibold text-white">Artipilot</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to your NEXA Rentals WhatsApp dashboard.
        </p>
        <Suspense fallback={<div className="mt-8 h-32 animate-pulse rounded-xl bg-white/5" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
