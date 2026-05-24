"use client";

import { useSearchParams } from "next/navigation";

function getErrorMessage(error: string | null) {
  if (!error) {
    return null;
  }

  if (error === "incorrect") {
    return "Incorrect password. Please try again.";
  }

  if (error === "not_configured") {
    return "Dashboard password is not configured in Vercel environment variables.";
  }

  if (error === "server_error") {
    return "Something went wrong while signing in. Please try again.";
  }

  return "Login failed. Please try again.";
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorMessage = getErrorMessage(error);

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070f] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[110px]" />
        <div className="absolute bottom-[-220px] right-[-120px] h-[440px] w-[440px] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute left-[-160px] top-[35%] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-[110px]" />
      </div>

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-2xl shadow-cyan-500/10 backdrop-blur">
              <span className="text-xl font-black tracking-tight">A</span>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
              Private Access
            </p>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Artipilot Private
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Sign in to access your protected WhatsApp AI dashboard.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
            {errorMessage ? (
              <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
                {errorMessage}
              </div>
            ) : null}

            <form
              action="/api/auth/private-login"
              method="POST"
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-200"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter private dashboard password"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/80 focus:bg-black/40 focus:ring-4 focus:ring-cyan-400/10"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 px-4 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] active:scale-[0.99]"
              >
                Sign in to Private Dashboard
              </button>
            </form>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs leading-5 text-slate-500">
                This area is private and separate from the public Artipilot Daily
                Life Assistant.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            Artipilot Private WhatsApp AI System
          </p>
        </div>
      </section>
    </main>
  );
}