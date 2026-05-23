"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AccessDeniedPage() {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B141A] px-4 text-[#E9EDEF]">
      <div className="max-w-md rounded-2xl border border-white/10 bg-[#111B21] p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-[#8696A0]">
          Your account is not on the private admin allow list. This dashboard is not open for public
          signup.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl bg-[#00A884] px-4 py-3 text-sm font-semibold text-white"
          >
            Sign out
          </button>
          <Link href="/login" className="text-sm text-[#8696A0] hover:text-[#E9EDEF]">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
