"use client";

import { useEffect, useState } from "react";

type Settings = {
  whatsappConfigured: boolean;
  openAiConfigured: boolean;
  supabaseConfigured: boolean;
  privateDomain: string;
  webhookUrl: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/private/settings", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load settings");
        setSettings(data);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load settings")
      );
  }, []);

  const rows = settings
    ? [
        ["WhatsApp configured", settings.whatsappConfigured ? "Yes" : "No"],
        ["OpenAI configured", settings.openAiConfigured ? "Yes" : "No"],
        ["Supabase configured", settings.supabaseConfigured ? "Yes" : "No"],
        ["Private domain", settings.privateDomain],
        ["Webhook URL", settings.webhookUrl],
      ]
    : [];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-white">Settings</h1>
      <p className="mt-2 text-sm text-[#8696A0]">
        Configuration status only. Secret values are never shown.
      </p>
      {error ? (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      ) : (
        <dl className="mt-6 space-y-3">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-[#111B21] px-4 py-3"
            >
              <dt className="text-xs uppercase tracking-wide text-[#8696A0]">
                {label}
              </dt>
              <dd className="mt-1 break-all text-sm text-white">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
