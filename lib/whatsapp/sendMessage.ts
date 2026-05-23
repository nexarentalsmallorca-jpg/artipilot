import { getContactById } from "@/lib/db/contacts";
import { insertMessage } from "@/lib/db/messages";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getWhatsAppConfig, sendWhatsAppText } from "@/lib/whatsapp";

export async function sendDashboardMessage(contactId: string, text: string) {
  const contact = await getContactById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }
  if (contact.blocked) {
    throw new Error("Contact is blocked");
  }

  if (!getWhatsAppConfig()) {
    throw new Error(
      "WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Vercel."
    );
  }

  const to = contact.whatsapp_id || contact.phone;
  const pending = await insertMessage({
    contact_id: contactId,
    direction: "outbound",
    sender_type: "admin",
    message_type: "text",
    body: text,
    status: "pending",
  });

  const send = await sendWhatsAppText(to, text);

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
    throw new Error(error.message);
  }

  return { ok: send.ok, message: updated, error: send.error || null };
}
