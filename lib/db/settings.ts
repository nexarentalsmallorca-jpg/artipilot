import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AiSettingsMap } from "@/lib/db/types";

const DEFAULTS: AiSettingsMap = {
  ai_name: "Artipilot",
  business_name: "Artipilot",
  tone: "Friendly, short, and professional",
  main_job:
    "Help customers with scooter and e-bike rentals: prices, availability, booking steps, pickup/return, and documents.",
  business_rules:
    "Reply in the customer's language. Be human and concise. Do not invent legal or insurance details. If unsure, say the team will confirm. Guide toward booking politely.",
  handoff_rules:
    "If the customer asks for a human, wants to complain, or needs confirmation you cannot give, pause and say the team will reply soon.",
  language_rule: "Always reply in the same language the customer used.",
  booking_link: "",
};

export async function getAiSettings(): Promise<AiSettingsMap> {
  const { data, error } = await supabaseAdmin.from("ai_settings").select("key, value");

  if (error) {
    console.error("ai_settings load error:", error.message);
    return { ...DEFAULTS };
  }

  const map: AiSettingsMap = { ...DEFAULTS };
  for (const row of data || []) {
    const key = row.key as keyof AiSettingsMap;
    const val = row.value;
    if (typeof val === "string") {
      map[key] = val;
    } else if (val && typeof val === "object" && "text" in (val as object)) {
      map[key] = String((val as { text: string }).text);
    } else if (val != null) {
      map[key] = String(val);
    }
  }
  return map;
}

export async function saveAiSettings(settings: AiSettingsMap) {
  const entries = Object.entries(settings).filter(([, v]) => v !== undefined);
  for (const [key, value] of entries) {
    await supabaseAdmin.from("ai_settings").upsert(
      {
        key,
        value: { text: value },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  }
}
