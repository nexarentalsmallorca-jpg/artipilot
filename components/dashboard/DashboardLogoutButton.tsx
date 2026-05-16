"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function LogoutIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function SwitchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

export default function DashboardLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    if (loading) return;

    try {
      setLoading(true);

      await supabase.auth.signOut();

      router.refresh();

      window.location.href = "/signup";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Could not log out. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[99999]">
      {open ? (
        <div className="mb-3 w-[230px] rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl">
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Account
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SwitchIcon className="h-4 w-4 text-slate-500" />
            {loading ? "Switching..." : "Switch account"}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogoutIcon className="h-4 w-4" />
            {loading ? "Logging out..." : "Log out"}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl transition hover:-translate-y-0.5 hover:bg-slate-50"
        aria-label="Open account menu"
      >
        <LogoutIcon className="h-5 w-5" />
      </button>
    </div>
  );
}