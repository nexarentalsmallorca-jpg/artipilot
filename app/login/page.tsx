"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.42c-.24 1.26-.96 2.33-2.04 3.05l3.3 2.56c1.92-1.77 3.02-4.38 3.02-7.5 0-.73-.07-1.43-.2-2.1H12z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.3-2.56c-.92.62-2.1.98-3.33.98-2.56 0-4.72-1.73-5.5-4.05H3.09v2.63A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.5 13.93A6.02 6.02 0 0 1 6.18 12c0-.67.11-1.32.32-1.93V7.44H3.09A10 10 0 0 0 2 12c0 1.61.39 3.14 1.09 4.56l3.41-2.63z" />
      <path fill="#4285F4" d="M12 6.02c1.47 0 2.8.5 3.84 1.5l2.88-2.88C16.97 3.01 14.7 2 12 2a10 10 0 0 0-8.91 5.44l3.41 2.63C7.28 7.75 9.44 6.02 12 6.02z" />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [gateSaving, setGateSaving] = useState(false);
  const showGate = searchParams.get("gate") === "1";

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted || !session?.user) return;
      router.replace("/dashboard/inbox");
    }
    void checkSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function unlockGate(event: React.FormEvent) {
    event.preventDefault();
    setGateSaving(true);
    setGateError("");
    try {
      const response = await fetch("/api/auth/extra-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: gatePassword }),
      });
      if (!response.ok) {
        setGateError("Incorrect access password.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setGateError("Could not verify password. Try again.");
    } finally {
      setGateSaving(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setIsSigningIn(true);
      setAuthError("");
      const next = searchParams.get("next") || "/dashboard/inbox";
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch {
      setAuthError("Google login could not start. Please try again.");
      setIsSigningIn(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B141A] px-4 text-[#E9EDEF]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111B21] p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/artipilot-logo.png" alt="Artipilot" width={40} height={40} className="h-10 w-10 object-contain" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#00A884]">Private</p>
            <h1 className="text-xl font-semibold">Artipilot WhatsApp</h1>
          </div>
        </div>

        {showGate ? (
          <form onSubmit={unlockGate} className="mb-6 space-y-3">
            <p className="text-sm text-[#8696A0]">Enter the extra access password to continue.</p>
            <input
              type="password"
              value={gatePassword}
              onChange={(e) => setGatePassword(e.target.value)}
              placeholder="Access password"
              className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3 text-sm outline-none focus:border-[#00A884]"
            />
            {gateError ? <p className="text-sm text-red-400">{gateError}</p> : null}
            <button
              type="submit"
              disabled={gateSaving || !gatePassword.trim()}
              className="w-full rounded-xl bg-[#00A884] py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {gateSaving ? "Checking…" : "Unlock"}
            </button>
          </form>
        ) : null}

        <p className="mb-6 text-sm leading-6 text-[#8696A0]">
          Sign in with your approved admin Google account. Public registration is disabled.
        </p>

        {authError ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {authError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleGoogleLogin()}
          disabled={isSigningIn}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#111B21] disabled:opacity-70"
        >
          {isSigningIn ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#111B21]/20 border-t-[#111B21]" />
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0B141A] text-[#E9EDEF]">
          <p className="text-sm text-[#8696A0]">Loading…</p>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
