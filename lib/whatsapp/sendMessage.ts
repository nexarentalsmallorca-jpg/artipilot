import { getContactById } from "@/lib/db/contacts";
import { insertMessage } from "@/lib/db/messages";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWhatsAppText, normalizePhone } from "@/lib/whatsapp";
import { isPrivateSchemaReady } from "@/lib/whatsapp/syncToPrivate";

async function getWorkspaceId() {
  const forced = process.env.ARTIPILOT_WORKSPACE_ID?.trim();
  if (forced) return forced;
  const { data } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

async function sendViaLegacyTables(contactId: string, text: string) {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    throw new Error("No workspace configured (set ARTIPILOT_WORKSPACE_ID)");
  }

  const { data: contact } = await supabaseAdmin
    .from("artipilot_contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();

  if (!contact) throw new Error("Contact not found");

  const phone = normalizePhone(contact.phone);
  const send = await sendWhatsAppText(phone, text);

  const now = new Date().toISOString();
  const { data: message, error } = await supabaseAdmin
    .from("artipilot_messages")
    .insert({
      workspace_id: workspaceId,
      owner_user_id: contact.owner_user_id,
      contact_phone: phone,
      whatsapp_message_id: send.whatsappMessageId,
      role: "manual",
      direction: "outbound",
      message_type: "text",
      content: text,
      raw_payload: send.raw,
      created_at: now,
      delivery_status: send.ok ? "sent" : "failed",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await supabaseAdmin
    .from("artipilot_contacts")
    .update({
      last_message: text,
      last_message_at: now,
    })
    .eq("id", contactId);

  return { ok: send.ok, message, error: send.error || null };
}

export async function sendByPhone(to: string, text: string) {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    throw new Error("No workspace configured (set ARTIPILOT_WORKSPACE_ID)");
  }

  const phone = normalizePhone(to);
  const { data: contact } = await supabaseAdmin
    .from("artipilot_contacts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("phone", phone)
    .maybeSingle();

  if (contact?.id) {
    return sendViaLegacyTables(String(contact.id), text);
  }

  const send = await sendWhatsAppText(phone, text);
  const now = new Date().toISOString();

  const { data: message, error } = await supabaseAdmin
    .from("artipilot_messages")
    .insert({
      workspace_id: workspaceId,
      contact_phone: phone,
      whatsapp_message_id: send.whatsappMessageId,
      role: "manual",
      direction: "outbound",
      message_type: "text",
      content: text,
      raw_payload: send.raw,
      created_at: now,
      delivery_status: send.ok ? "sent" : "failed",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return { ok: send.ok, message, error: send.error || null };
}

export async function sendDashboardMessage(contactId: string, text: string) {
  const schemaReady = await isPrivateSchemaReady();

  if (schemaReady) {
    try {
      const contact = await getContactById(contactId);
      if (contact) {
        const pending = await insertMessage({
          contact_id: contactId,
          direction: "outbound",
          sender_type: "admin",
          message_type: "text",
          body: text,
          status: "pending",
        });

        const send = await sendWhatsAppText(contact.phone, text);

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

        if (error) throw new Error(error.message);
        return { ok: send.ok, message: updated, error: send.error || null };
      }
    } catch (error) {
      console.error("Private send failed, trying legacy:", error);
    }
  }

  return sendViaLegacyTables(contactId, text);
}
