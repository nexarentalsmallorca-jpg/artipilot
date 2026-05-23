"use client";

import { useEffect, useState } from "react";

type Status = {
  private_domain: string;
  security: string;
  supabase: boolean;
  openai: boolean;
  whatsapp: {
    configured: boolean;
    phone_number_id: string | null;
    verify_token_set: boolean;
  };
  webhook_url: string;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  total_contacts: number;
  total_messages: number;
  total_ai_on_contacts: number;
};

export default function StatusClient() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status", { credentials: "include" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => undefined);
  }, []);

  if (!status) {
    return <p className="p-6 text-[#8696A0]">Loading status…</p>;
  }

  const rows = [
    ["Supabase", status.supabase ? "Configured" : "Missing"],
    ["OpenAI", status.openai ? "Configured" : "Missing"],
    [
      "WhatsApp",
      status.whatsapp.configured
        ? `OK · Phone ID ${status.whatsapp.phone_number_id}`
        : "Missing token or phone number ID",
    ],
    ["Verify token", status.whatsapp.verify_token_set ? "Set" : "Missing"],
    ["Webhook URL", status.webhook_url],
    ["Last inbound", status.last_inbound_at || "—"],
    ["Last outbound", status.last_outbound_at || "—"],
    ["Total contacts", String(status.total_contacts)],
    ["Total messages", String(status.total_messages)],
    ["AI ON contacts", String(status.total_ai_on_contacts)],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">System Status</h1>
      <p className="text-sm text-[#8696A0]">
        Safe overview — no secrets are shown.
      </p>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111B21]">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 font-medium text-[#8696A0]">{label}</td>
                <td className="px-4 py-3 break-all">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
