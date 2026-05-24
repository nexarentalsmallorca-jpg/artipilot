import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isWhatsAppConfigured, sendWhatsAppText } from "@/lib/whatsapp/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
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

  if (!isWhatsAppConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp sender is not configured." },
      { status: 503 }
    );
  }

  const db = getSupabaseAdmin();
  const { data: contact, error: contactError } = await db
    .from("artipilot_contacts")
    .select("id, phone")
    .eq("id", contactId)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const { data: pending, error: insertError } = await db
    .from("artipilot_messages")
    .insert({
      contact_id: contact.id,
      phone: contact.phone,
      direction: "outbound",
      sender_type: "admin",
      message_type: "text",
      body: text,
      status: "pending",
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const sendResult = await sendWhatsAppText(contact.phone, text);
  const now = new Date().toISOString();

  const { data: saved, error: updateError } = await db
    .from("artipilot_messages")
    .update({
      status: sendResult.ok ? "sent" : "failed",
      status_error: sendResult.ok ? null : sendResult.error,
      whatsapp_message_id: sendResult.ok ? sendResult.messageId : null,
    })
    .eq("id", pending.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await db
    .from("artipilot_contacts")
    .update({
      last_message: text,
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", contact.id);

  if (!sendResult.ok) {
    return NextResponse.json(
      { message: saved, error: sendResult.error },
      { status: 502 }
    );
  }

  return NextResponse.json({ message: saved });
}
