"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiSettingsMap } from "@/lib/db/types";
import {
  fetchPrivateApi,
  parsePrivateApiError,
  privateApiErrorLabel,
} from "@/lib/dashboard/privateFetch";

export default function SettingsClient() {
  const [settings, setSettings] = useState<AiSettingsMap>({});
  const [meta, setMeta] = useState<Record<string, string | null>>({});
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setNotice("");
    try {
      const res = await fetchPrivateApi("/api/settings/ai", { method: "GET" });
      const data = await res.json();
      if (!res.ok) {
        setNotice(await parsePrivateApiError("Settings", res));
        return;
      }
      if (data.settings) setSettings(data.settings);
      if (data.meta) setMeta(data.meta);
    } catch {
      setNotice(privateApiErrorLabel("Settings", "Network error"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const res = await fetchPrivateApi("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setNotice("Settings saved.");
        void load();
      } else {
        setNotice(await parsePrivateApiError("Settings", res));
      }
    } catch {
      setNotice(privateApiErrorLabel("Settings", "Network error"));
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof AiSettingsMap; label: string; rows?: number }[] = [
    { key: "ai_name", label: "AI name" },
    { key: "business_name", label: "Business name" },
    { key: "tone", label: "Tone" },
    { key: "main_job", label: "Main job", rows: 4 },
    { key: "business_rules", label: "Business rules", rows: 4 },
    { key: "handoff_rules", label: "Handoff rules", rows: 3 },
    { key: "language_rule", label: "Language rule" },
    { key: "booking_link", label: "Booking link" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="rounded-2xl border border-white/10 bg-[#111B21] p-4 text-sm text-[#8696A0] space-y-1">
        <p>Private domain: {meta.private_domain || "private.artipilot.com"}</p>
        <p>Security: {meta.security || "password protected"}</p>
        <p>WhatsApp phone number ID: {meta.whatsapp_phone_number_id || "Not set"}</p>
        <p className="break-all">Webhook: {meta.webhook_url}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111B21] p-4 space-y-4">
        <h2 className="font-medium text-[#E9EDEF]">AI instructions</h2>
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-sm text-[#8696A0]">{f.label}</span>
            {f.rows ? (
              <textarea
                rows={f.rows}
                value={settings[f.key] || ""}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, [f.key]: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm"
              />
            ) : (
              <input
                value={settings[f.key] || ""}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, [f.key]: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm"
              />
            )}
          </label>
        ))}
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-[#00A884] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {notice ? (
          <p
            className={`text-sm ${
              notice.includes("error:") ? "text-red-300" : "text-[#8696A0]"
            }`}
          >
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
