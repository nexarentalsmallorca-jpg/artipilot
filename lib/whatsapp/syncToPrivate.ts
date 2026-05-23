import { generateAiReply } from "@/lib/ai";
import { upsertContactFromWhatsApp } from "@/lib/db/contacts";
import { insertMessage, updateMessageStatus } from "@/lib/db/messages";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/whatsapp";

function extractMessageBody(msg: Record<string, unknown>): string {
  const type = String(msg.type || "text");
  if (type === "text") {
    return String((msg.text as { body?: string })?.body || "");
  }
  if (type === "button") {
    return String((msg.button as { text?: string })?.text || "");
  }
  if (type === "interactive") {
    const interactive = msg.interactive as {
      button_reply?: { title?: string };
      list_reply?: { title?: string };
    };
    return (
      interactive?.button_reply?.title ||
      interactive?.list_reply?.title ||
      `[${type}]`
    );
  }
  return `[${type} message]`;
}

function isDuplicateError(message: string) {
  const m = message.toLowerCase();
  return m.includes("duplicate") || m.includes("unique");
}

async function safeInsertMessage(
  input: Parameters<typeof insertMessage>[0]
): Promise<void> {
  try {
    await insertMessage(input);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isDuplicateError(msg)) return;
    throw error;
  }
}

function isAiEnabled(contact: {
  ai_enabled: boolean;
  ai_paused_until: string | null;
}) {
  if (!contact.ai_enabled) return false;
  if (contact.ai_paused_until) {
    if (new Date(contact.ai_paused_until).getTime() > Date.now()) return false;
  }
  return true;
}

/** Best-effort sync into contacts/messages tables (non-fatal). */
export async function syncWebhookBodyToPrivateTables(body: unknown) {
  const entries = (body as { entry?: unknown[] })?.entry || [];

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes || [];
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value || {};

      const statuses = (value.statuses || []) as Record<string, unknown>[];
      for (const status of statuses) {
        const waId = String(status.id || "");
        const st = String(status.status || "");
        if (waId && st) {
          try {
            await updateMessageStatus(waId, st, status);
          } catch {
            // status table may be missing
          }
        }
      }

      const messages = (value.messages || []) as Record<string, unknown>[];
      const waContacts = (value.contacts || []) as {
        wa_id?: string;
        profile?: { name?: string };
      }[];

      for (const msg of messages) {
        const from = String(msg.from || "");
        const waMsgId = String(msg.id || "");
        if (!from || !waMsgId) continue;

        const profile =
          waContacts.find((c) => c.wa_id === from)?.profile?.name || null;

        let contact;
        try {
          contact = await upsertContactFromWhatsApp({
            whatsappId: from,
            phone: from,
            profileName: profile,
          });
        } catch (error) {
          console.error("Private sync: contact upsert failed", error);
          continue;
        }

        const text = extractMessageBody(msg);

        try {
          await safeInsertMessage({
            contact_id: contact.id,
            whatsapp_message_id: waMsgId,
            direction: "inbound",
            sender_type: "customer",
            message_type: String(msg.type || "text"),
            body: text,
            status: "received",
            raw_payload: msg,
          });
        } catch (error) {
          console.error("Private sync: inbound message failed", error);
          continue;
        }

        if (!isAiEnabled(contact)) continue;

        try {
          const reply = await generateAiReply({
            contactId: contact.id,
            customerMessage: text,
            customerName: contact.name || contact.profile_name,
          });
          if (!reply.trim()) continue;

          const send = await sendWhatsAppText(contact.phone, reply);
          await safeInsertMessage({
            contact_id: contact.id,
            whatsapp_message_id: send.whatsappMessageId,
            direction: "outbound",
            sender_type: "ai",
            message_type: "text",
            body: reply,
            status: send.ok ? "sent" : "failed",
            status_error: send.error || null,
            raw_payload: send.raw,
          });
        } catch (aiErr) {
          console.error("Private sync: AI reply failed", aiErr);
        }
      }
    }
  }
}

export async function isPrivateSchemaReady(): Promise<boolean> {
  const { error } = await supabaseAdmin.from("contacts").select("id").limit(1);
  if (!error) return true;
  const msg = error.message.toLowerCase();
  return !msg.includes("does not exist") && !msg.includes("schema cache");
}
