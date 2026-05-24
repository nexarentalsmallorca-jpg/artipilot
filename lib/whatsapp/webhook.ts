import { NextRequest, NextResponse } from "next/server";
import { generateAiReply, isOpenAiConfigured } from "@/lib/ai/generateReply";
import {
  getContactById,
  insertInboundMessage,
  insertOutboundMessage,
  listMessagesForContact,
  updateOutboundMessage,
} from "@/lib/db/private-inbox";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { normalizePhone, sendWhatsAppText } from "@/lib/whatsapp/send";

type WaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type WaContact = {
  wa_id?: string;
  profile?: { name?: string };
};

type WaStatus = {
  id?: string;
  status?: string;
};

function getVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || "";
}

function waTimestamp(ts?: string) {
  if (!ts) return new Date().toISOString();
  const seconds = Number(ts);
  if (Number.isNaN(seconds)) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

function messageBody(msg: WaMessage) {
  if (msg.type === "text" && msg.text?.body) return msg.text.body;
  return `[${msg.type || "message"}]`;
}

async function upsertContact(phone: string, profileName?: string | null) {
  const db = getSupabaseAdmin();
  const normalized = normalizePhone(phone);

  const { data: existing } = await db
    .from("artipilot_contacts")
    .select("id, name, profile_name")
    .eq("phone", normalized)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (profileName && !existing.profile_name) {
      updates.profile_name = profileName;
    }
    if (profileName && !existing.name) {
      updates.name = profileName;
    }
    await db.from("artipilot_contacts").update(updates).eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created, error } = await db
    .from("artipilot_contacts")
    .insert({
      phone: normalized,
      name: profileName || null,
      profile_name: profileName || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return created.id as string;
}

async function maybeAutoReply(contactId: string, phone: string, inboundBody: string) {
  const contact = await getContactById(contactId);
  if (!contact.ai_enabled) return;
  if (!isOpenAiConfigured()) return;

  const recent = await listMessagesForContact(contactId);
  const history = recent
    .filter((m) => m.body)
    .map((m) => ({
      role:
        m.direction === "inbound"
          ? ("user" as const)
          : ("assistant" as const),
      content: String(m.body),
    }));

  let replyText: string;
  try {
    replyText = await generateAiReply({
      customerMessage: inboundBody,
      recentMessages: history,
    });
  } catch {
    return;
  }

  if (!replyText) return;

  const sendResult = await sendWhatsAppText(phone, replyText);
  const pending = await insertOutboundMessage({
    contactId,
    phone,
    body: replyText,
    senderType: "ai",
    status: sendResult.ok ? "sent" : "failed",
    whatsappMessageId: sendResult.ok ? sendResult.messageId : null,
    statusError: sendResult.ok ? null : sendResult.error,
  });

  if (!sendResult.ok && pending.id) {
    await updateOutboundMessage(pending.id, {
      status: "failed",
      status_error: sendResult.error,
    });
  }
}

async function handleStatusUpdate(status: WaStatus) {
  if (!status.id || !status.status) return;
  const db = getSupabaseAdmin();

  const modern = await db
    .from("artipilot_messages")
    .update({ status: status.status })
    .eq("whatsapp_message_id", status.id);

  if (modern.error) {
    await db
      .from("artipilot_messages")
      .update({ delivery_status: status.status })
      .eq("whatsapp_message_id", status.id);
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = getVerifyToken();

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: {
    entry?: {
      changes?: {
        value?: {
          messages?: WaMessage[];
          contacts?: WaContact[];
          statuses?: WaStatus[];
        };
      }[];
    }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const value = body.entry?.[0]?.changes?.[0]?.value;
  if (!value) {
    return NextResponse.json({ ok: true });
  }

  const profileMap = new Map<string, string>();
  for (const c of value.contacts || []) {
    if (c.wa_id && c.profile?.name) {
      profileMap.set(c.wa_id, c.profile.name);
    }
  }

  for (const status of value.statuses || []) {
    await handleStatusUpdate(status);
  }

  for (const msg of value.messages || []) {
    const from = msg.from;
    if (!from) continue;

    const phone = normalizePhone(from);
    const profileName = profileMap.get(from) || null;
    const text = messageBody(msg);
    const createdAt = waTimestamp(msg.timestamp);

    try {
      const contactId = await upsertContact(phone, profileName);
      await insertInboundMessage({
        contactId,
        phone,
        waMessageId: msg.id,
        body: text,
        createdAt,
        raw: msg,
      });
      if (msg.type === "text" && msg.text?.body) {
        await maybeAutoReply(contactId, phone, msg.text.body);
      }
    } catch (error) {
      console.error("Webhook message error:", error);
    }
  }

  return NextResponse.json({ ok: true });
}
