import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import {
  getContactById,
  insertOutboundMessage,
  touchContactLastMessage,
  updateOutboundMessage,
} from "@/lib/db/private-inbox";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { isWhatsAppConfigured, sendWhatsAppText } from "@/lib/whatsapp/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = await requirePrivateSession(request);
  if (denied) return denied;

  const body = await request.json();
  const contactId = String(body.contact_id || "");
  const text = String(body.body || "").trim();

  if (!contactId || !text) {
    return NextResponse.json(
      { error: "contact_id and body are required" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp sender is not configured." },
      { status: 503 }
    );
  }

  try {
    const contact = await getContactById(contactId);
    const pending = await insertOutboundMessage({
      contactId: contact.id,
      phone: contact.phone,
      body: text,
      senderType: "admin",
      status: "pending",
    });

    const sendResult = await sendWhatsAppText(contact.phone, text);

    const saved = await updateOutboundMessage(pending.id, {
      status: sendResult.ok ? "sent" : "failed",
      status_error: sendResult.ok ? null : sendResult.error,
      whatsapp_message_id: sendResult.ok ? sendResult.messageId : null,
    });

    await touchContactLastMessage(contact.id, text);

    if (!sendResult.ok) {
      return NextResponse.json(
        { message: saved, error: sendResult.error },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
