"use client";

import { useEffect, useMemo, useState } from "react";

type Status = {
  hasPrivateSession: boolean;
  supabaseConfigured: boolean;
  whatsappTokenConfigured: boolean;
  whatsappPhoneNumberIdConfigured: boolean;
  openAiConfigured: boolean;
  totalContacts: number;
  totalMessages: number;
};

type StatusRow = {
  label: string;
  value: string;
  ok: boolean;
  description: string;
};

function statusText(ok: boolean) {
  return ok ? "OK" : "Missing";
}

function statusClass(ok: boolean) {
  return ok
    ? "bg-emerald-500/15 text-emerald-300"
    : "bg-red-500/15 text-red-300";
}

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStatus() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/private/status", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load status.");
      }

      setStatus(data);
    } catch (error) {
      console.error("Status page error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load status."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  const rows = useMemo<StatusRow[]>(() => {
    if (!status) {
      return [];
    }

    return [
      {
        label: "Private session",
        value: status.hasPrivateSession ? "Active" : "Missing",
        ok: status.hasPrivateSession,
        description: "Confirms that your private dashboard login cookie works.",
      },
      {
        label: "Supabase",
        value: statusText(status.supabaseConfigured),
        ok: status.supabaseConfigured,
        description:
          "Needed to save contacts, messages, AI status, and quick replies.",
      },
      {
        label: "WhatsApp access token",
        value: statusText(status.whatsappTokenConfigured),
        ok: status.whatsappTokenConfigured,
        description: "Needed to send WhatsApp replies from the dashboard.",
      },
      {
        label: "WhatsApp phone number ID",
        value: statusText(status.whatsappPhoneNumberIdConfigured),
        ok: status.whatsappPhoneNumberIdConfigured,
        description:
          "Needed so Meta knows which WhatsApp Business number sends messages.",
      },
      {
        label: "OpenAI",
        value: statusText(status.openAiConfigured),
        ok: status.openAiConfigured,
        description: "Needed for Nero AI suggestions and automatic replies.",
      },
    ];
  }, [status]);

  const allCoreOk =
    status?.hasPrivateSession &&
    status?.supabaseConfigured &&
    status?.whatsappTokenConfigured &&
    status?.whatsappPhoneNumberIdConfigured &&
    status?.openAiConfigured;

  return (
    <div className="h-full overflow-y-auto bg-[#0b141a] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00a884]">
              Private system
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              System Status
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8696a0]">
              Check if your private WhatsApp AI system is connected correctly.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loading}
            className="rounded-full bg-[#00a884] px-5 py-3 text-sm font-black text-black transition hover:bg-[#06cf9c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Checking..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-6 text-red-200">
            {error}
          </div>
        ) : null}

        {loading && !status ? (
          <div className="rounded-3xl border border-white/10 bg-[#111b21] p-6 text-sm text-[#8696a0]">
            Checking your private WhatsApp AI setup...
          </div>
        ) : null}

        {status ? (
          <>
            <div
              className={[
                "mb-5 rounded-3xl border p-5",
                allCoreOk
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-yellow-500/30 bg-yellow-500/10",
              ].join(" ")}
            >
              <p
                className={[
                  "text-sm font-black",
                  allCoreOk ? "text-emerald-300" : "text-yellow-200",
                ].join(" ")}
              >
                {allCoreOk
                  ? "Everything important looks connected."
                  : "Some important settings are missing."}
              </p>

              <p className="mt-2 text-sm leading-6 text-[#cbd5dc]">
                If something is missing, check your Vercel environment variables
                and redeploy the project.
              </p>
            </div>

            <div className="grid gap-3">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-3xl border border-white/10 bg-[#111b21] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-black text-white">
                        {row.label}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-[#8696a0]">
                        {row.description}
                      </p>
                    </div>

                    <span
                      className={[
                        "shrink-0 rounded-full px-3 py-1 text-xs font-black",
                        statusClass(row.ok),
                      ].join(" ")}
                    >
                      {row.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-[#111b21] p-5">
                <p className="text-sm text-[#8696a0]">Total contacts</p>
                <p className="mt-2 text-3xl font-black text-white">
                  {status.totalContacts}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#111b21] p-5">
                <p className="text-sm text-[#8696a0]">Total messages</p>
                <p className="mt-2 text-3xl font-black text-white">
                  {status.totalMessages}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}