"use client";

import { useEffect, useState } from "react";

type Settings = {
  whatsappConfigured: boolean;
  openAiConfigured: boolean;
  supabaseConfigured: boolean;
  privateDomain: string;
  webhookUrl: string;
};

type SettingRow = {
  label: string;
  value: string;
  ok?: boolean;
  description: string;
};

function statusBadge(ok: boolean) {
  return ok ? "Configured" : "Missing";
}

function statusClass(ok: boolean) {
  return ok
    ? "border-[#c8f7c0] bg-[#e7fce3] text-[#008069]"
    : "border-red-200 bg-red-50 text-red-700";
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadSettings() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/private/settings", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load settings.");
      }

      setSettings(data);
    } catch (error) {
      console.error("Settings page error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load settings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  const rows: SettingRow[] = settings
    ? [
        {
          label: "WhatsApp API",
          value: statusBadge(settings.whatsappConfigured),
          ok: settings.whatsappConfigured,
          description:
            "Used to send manual replies and automatic Nero AI replies through WhatsApp.",
        },
        {
          label: "OpenAI",
          value: statusBadge(settings.openAiConfigured),
          ok: settings.openAiConfigured,
          description:
            "Used to generate Nero AI replies and message suggestions.",
        },
        {
          label: "Supabase",
          value: statusBadge(settings.supabaseConfigured),
          ok: settings.supabaseConfigured,
          description:
            "Used to store contacts, messages, quick replies, AI status, and inbox data.",
        },
        {
          label: "Private domain",
          value: settings.privateDomain || "Not set",
          description:
            "The private domain or subdomain where your dashboard should be used.",
        },
        {
          label: "Webhook URL",
          value: settings.webhookUrl || "Not available",
          description:
            "This is the URL that should be connected inside Meta WhatsApp webhook settings.",
        },
      ]
    : [];

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] px-4 py-6 text-[#111b21] md:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#008069]">
              Private system
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111b21]">
              Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667781]">
              Configuration overview for your private WhatsApp AI system.
              Secret values are never shown here.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={loading}
            className="rounded-full bg-[#00a884] px-5 py-3 text-sm font-black text-white transition hover:bg-[#008f72] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {loading && !settings ? (
          <div className="rounded-3xl border border-[#d1d7db] bg-white p-6 text-sm text-[#667781] shadow-sm">
            Loading private dashboard settings...
          </div>
        ) : null}

        {settings ? (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.label}
                className="rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-[#111b21]">
                      {row.label}
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-[#667781]">
                      {row.description}
                    </p>
                  </div>

                  {typeof row.ok === "boolean" ? (
                    <span
                      className={[
                        "shrink-0 rounded-full border px-3 py-1 text-xs font-black",
                        statusClass(row.ok),
                      ].join(" ")}
                    >
                      {row.value}
                    </span>
                  ) : (
                    <p className="max-w-full break-all rounded-2xl bg-[#f0f2f5] px-3 py-2 text-sm font-semibold text-[#111b21] md:max-w-md">
                      {row.value}
                    </p>
                  )}
                </div>
              </div>
            ))}

            <div className="rounded-3xl border border-yellow-300 bg-yellow-50 p-5 shadow-sm">
              <h2 className="text-sm font-black text-yellow-800">
                Important
              </h2>

              <p className="mt-2 text-sm leading-6 text-yellow-900">
                If you change any Vercel environment variable, redeploy the
                project. Otherwise the dashboard may still use the old values.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}