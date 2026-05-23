"use client";

import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  incorrect: "Incorrect password.",
  not_configured: "Dashboard password is not configured.",
};

export default function LoginForm() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] || "Sign in failed." : "";

  return (
    <form action="/api/auth/private-login" method="POST" className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm text-slate-400">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
          placeholder="Enter dashboard password"
        />
      </label>

      {errorMessage ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
      >
        Sign in
      </button>
    </form>
  );
}
