"use client";

import { useCallback, useEffect, useState } from "react";
import PrivateDashboardShell from "@/components/dashboard/PrivateDashboardShell";
import { supabase } from "@/lib/supabaseClient";

type AiSettings = {
  ai_name: string;
  tone: string;
  main_job: string;
  business_rules: string;
  handoff_rules: string;
  same_language_reply: boolean;
  short_human_reply: boolean;
};

const empty: AiSettings = {
  ai_name: "Artipilot",
  tone: "Friendly and professional",
  main_job: "",
  business_rules: "",
  handoff_rules: "",
  same_language_reply: true,
  short_human_reply: true,
};

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AiSettings>(empty);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const headers = await authHeaders();
    const res = await fetch("/api/settings/ai", { headers });
    const data = await res.json();
    if (data.settings) {
      setSettings({
        ai_name: data.settings.ai_name || empty.ai_name,
        tone: data.settings.tone || empty.tone,
        main_job: data.settings.main_job || "",
        business_rules: data.settings.business_rules || "",
        handoff_rules: data.settings.handoff_rules || "",
        same_language_reply: data.settings.same_language_reply !== false,
        short_human_reply: data.settings.short_human_reply !== false,
      });
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function saveSettings() {
    setSaving(true);
    setNotice("");
    const headers = {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    };
    const res = await fetch("/api/settings/ai", {
      method: "POST",
      headers,
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setNotice(data.error || "Could not save settings.");
      return;
    }
    setNotice("AI settings saved.");
  }

  return (
    <PrivateDashboardShell title="AI settings">
      <div className="rounded-2xl border border-white/10 bg-[#111B21] p-5">
        <div className="grid gap-4">
          {(
            [
              ["ai_name", "AI name"],
              ["tone", "Tone"],
              ["main_job", "Main job"],
              ["business_rules", "Business rules"],
              ["handoff_rules", "Handoff rules"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-sm text-[#8696A0]">{label}</span>
              {key === "main_job" || key === "business_rules" || key === "handoff_rules" ? (
                <textarea
                  value={settings[key]}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3 text-sm outline-none focus:border-[#00A884]"
                />
              ) : (
                <input
                  value={settings[key]}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3 text-sm outline-none focus:border-[#00A884]"
                />
              )}
            </label>
          ))}

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.same_language_reply}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, same_language_reply: e.target.checked }))
              }
            />
            Reply in the customer&apos;s language when possible
          </label>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.short_human_reply}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, short_human_reply: e.target.checked }))
              }
            />
            Keep replies short and human
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={() => void saveSettings()}
            className="rounded-xl bg-[#00A884] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {notice ? <p className="text-sm text-[#8696A0]">{notice}</p> : null}
        </div>
      </div>
    </PrivateDashboardShell>
  );
}
