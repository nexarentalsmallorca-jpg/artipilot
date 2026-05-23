"use client";

import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <form action="/api/auth/private-login" method="POST" className="mt-8 space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error === "incorrect"
            ? "Incorrect password."
            : error === "not_configured"
              ? "Dashboard password is not configured."
              : "Login failed."}
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-slate-300">
          Password
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-emerald-400"
          placeholder="Enter dashboard password"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black hover:bg-emerald-400"
      >
        Sign in
      </button>
    </form>
  );
}
