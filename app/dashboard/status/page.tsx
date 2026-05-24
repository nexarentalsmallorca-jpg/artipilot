"use client";

import { useEffect, useState } from "react";

type Status = {
  hasPrivateSession: boolean;
  supabaseConfigured: boolean;
  whatsappTokenConfigured: boolean;
  whatsappPhoneNumberIdConfigured: boolean;
  openAiConfigured: boolean;
  totalContacts: number;
  totalMessages: number;
};

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/private/status", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load status");
        setStatus(data);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load status")
      );
  }, []);

  const rows = status
    ? [
        ["Private session", status.hasPrivateSession ? "Active" : "Missing"],
        ["Supabase", status.supabaseConfigured ? "Configured" : "Missing"],
        ["WhatsApp token", status.whatsappTokenConfigured ? "Set" : "Missing"],
        [
          "WhatsApp phone number ID",
          status.whatsappPhoneNumberIdConfigured ? "Set" : "Missing",
        ],
        ["OpenAI", status.openAiConfigured ? "Configured" : "Missing"],
        ["Total contacts", String(status.totalContacts)],
        ["Total messages", String(status.totalMessages)],
      ]
    : [];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-white">Status</h1>
      {error ? (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      ) : (
        <dl className="mt-6 space-y-3">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111B21] px-4 py-3"
            >
              <dt className="text-sm text-[#8696A0]">{label}</dt>
              <dd className="text-sm font-medium text-white">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
