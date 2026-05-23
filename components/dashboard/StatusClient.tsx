"use client";

import { useEffect, useState } from "react";

type Status = {
  supabaseConfigured: boolean;
  whatsappTokenConfigured: boolean;
  whatsappPhoneNumberIdConfigured: boolean;
  openaiConfigured: boolean;
  whatsappConfigured: boolean;
  webhookUrl: string;
  totalContacts: number;
  totalMessages: number;
  lastMessageAt: string | null;
  privateDomain: string;
};

export default function StatusClient() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/status", { credentials: "include" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Failed to load status");
          return;
        }
        setStatus(data);
      })
      .catch(() => setError("Network error"));
  }, []);

  if (error) {
    return <p className="text-red-300">{error}</p>;
  }

  if (!status) {
    return <p className="text-[#8696A0]">Loading status…</p>;
  }

  const rows: [string, string][] = [
    ["Supabase", status.supabaseConfigured ? "Configured" : "Missing"],
    ["WhatsApp token", status.whatsappTokenConfigured ? "Configured" : "Missing"],
    [
      "WhatsApp phone number ID",
      status.whatsappPhoneNumberIdConfigured ? "Configured" : "Missing",
    ],
    [
      "WhatsApp ready to send",
      status.whatsappConfigured ? "Yes" : "No — check token and phone number ID",
    ],
    ["OpenAI", status.openaiConfigured ? "Configured" : "Missing"],
    ["Webhook URL", status.webhookUrl],
    ["Private domain", status.privateDomain],
    ["Total contacts", String(status.totalContacts)],
    ["Total messages", String(status.totalMessages)],
    ["Last message", status.lastMessageAt || "—"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">System Status</h1>
        <p className="mt-1 text-sm text-[#8696A0]">
          Safe overview — secret values are never shown.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111B21]">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 font-medium text-[#8696A0]">{label}</td>
                <td className="px-4 py-3 break-all text-[#e9edef]">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
