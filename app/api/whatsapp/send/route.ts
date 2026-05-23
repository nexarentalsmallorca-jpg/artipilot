import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { getContactById } from "@/lib/db/contacts";
import { insertMessage } from "@/lib/db/messages";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      contact_id?: string;
      body?: string;
      message?: string;
    };

    const contactId = String(body.contact_id || "").trim();
    const text = String(body.body || body.message || "").trim();

    if (!contactId || !text) {
      return NextResponse.json(
        { error: "contact_id and body are required" },
        { status: 400 }
      );
    }

    const contact = await getContactById(contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (contact.blocked) {
      return NextResponse.json({ error: "Contact is blocked" }, { status: 400 });
    }

    const pending = await insertMessage({
      contact_id: contactId,
      direction: "outbound",
      sender_type: "admin",
      message_type: "text",
      body: text,
      status: "pending",
    });

    const send = await sendWhatsAppText(contact.phone, text);

    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { data: updated, error } = await supabaseAdmin
      .from("messages")
      .update({
        whatsapp_message_id: send.whatsappMessageId,
        status: send.ok ? "sent" : "failed",
        status_error: send.error || null,
        raw_payload: send.raw,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pending.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: send.ok,
      message: updated,
      error: send.error || null,
    });
  } catch (error) {
    console.error("Send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 500 }
    );
  }
}
