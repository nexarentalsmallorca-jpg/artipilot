import { getAiSettings } from "@/lib/db/settings";
import { getRecentMessagesForAi } from "@/lib/db/messages";
import type { Message } from "@/lib/db/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

function formatHistory(messages: Message[]) {
  return messages
    .filter((m) => m.body && !m.deleted_for_everyone)
    .map((m) => {
      const who =
        m.sender_type === "customer"
          ? "Customer"
          : m.sender_type === "ai"
            ? "AI"
            : m.sender_type === "admin"
              ? "Admin"
              : "System";
      return `${who}: ${m.body}`;
    })
    .join("\n");
}

async function loadTrainingContext() {
  const { data } = await supabaseAdmin
    .from("training_knowledge")
    .select("title, category, content")
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (!data?.length) return "";
  return data
    .map((r) => `[${r.category || "General"}] ${r.title}\n${r.content}`)
    .join("\n\n");
}

export async function generateAiReply(input: {
  contactId: string;
  customerMessage: string;
  customerName?: string | null;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const settings = await getAiSettings();
  const training = await loadTrainingContext();
  const history = await getRecentMessagesForAi(input.contactId, 24);
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const system = `You are ${settings.ai_name || "Artipilot"}, the WhatsApp assistant for ${settings.business_name || "the business"}.

Tone: ${settings.tone || "Friendly and professional"}
Main job: ${settings.main_job || ""}
Business rules: ${settings.business_rules || ""}
Handoff rules: ${settings.handoff_rules || ""}
Language: ${settings.language_rule || "Reply in the customer's language."}
Booking link: ${settings.booking_link || "(none)"}

Active training knowledge:
${training || "(none yet)"}

Rules:
- Be short, friendly, human.
- Do not invent legal/insurance details.
- If unsure, say the team will confirm.
- Guide toward booking politely.
- Output only the reply text, no labels.`;

  const user = `Customer name: ${input.customerName || "Unknown"}
Recent conversation:
${formatHistory(history) || "(no prior messages)"}

Latest customer message:
${input.customerMessage}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err =
      (data as { error?: { message?: string } })?.error?.message ||
      "OpenAI request failed";
    throw new Error(err);
  }

  const text =
    (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
      ?.message?.content || "";

  return String(text).trim();
}

export async function generateAiSuggestion(
  contactId: string,
  customerMessage: string,
  customerName?: string | null
) {
  return generateAiReply({ contactId, customerMessage, customerName });
}
