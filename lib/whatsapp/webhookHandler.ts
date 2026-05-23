import { NextRequest, NextResponse } from "next/server";
import { generateAiReply } from "@/lib/ai";
import { getContactById, upsertContactFromWhatsApp } from "@/lib/db/contacts";
import { insertMessage, updateMessageStatus } from "@/lib/db/messages";
import { getWhatsAppConfig, sendWhatsAppText } from "@/lib/whatsapp";

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
      "[Interactive]"
    );
  }
  return `[${type} message]`;
}

function isAiEnabled(contact: { ai_enabled: boolean; ai_paused_until: string | null }) {
  if (!contact.ai_enabled) return false;
  if (contact.ai_paused_until) {
    const until = new Date(contact.ai_paused_until).getTime();
    if (until > Date.now()) return false;
  }
  return true;
}

export async function handleWhatsAppWebhookGet(request: NextRequest) {
  const config = getWhatsAppConfig();
  const verifyToken = config?.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN;

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function handleWhatsAppWebhookPost(request: NextRequest) {
  try {
    const body = await request.json();
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
            await updateMessageStatus(waId, st, status);
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

          const contact = await upsertContactFromWhatsApp({
            whatsappId: from,
            phone: from,
            profileName: profile,
          });

          const text = extractMessageBody(msg);
          const inbound = await insertMessage({
            contact_id: contact.id,
            whatsapp_message_id: waMsgId,
            direction: "inbound",
            sender_type: "customer",
            message_type: String(msg.type || "text"),
            body: text,
            status: "received",
            raw_payload: msg,
          });

          void inbound;

          if (!isAiEnabled(contact)) continue;

          try {
            const reply = await generateAiReply({
              contactId: contact.id,
              customerMessage: text,
              customerName: contact.name || contact.profile_name,
            });

            if (!reply.trim()) continue;

            const send = await sendWhatsAppText(contact.phone, reply);
            await insertMessage({
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
            console.error("AI auto-reply error:", aiErr);
            await insertMessage({
              contact_id: contact.id,
              direction: "outbound",
              sender_type: "system",
              message_type: "text",
              body: "AI could not reply. The team will follow up.",
              status: "failed",
              status_error: aiErr instanceof Error ? aiErr.message : "AI error",
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 }
    );
  }
}
