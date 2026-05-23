import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Message } from "@/lib/db/types";
import { touchContactLastMessage } from "@/lib/db/contacts";

export async function listMessagesForContact(contactId: string): Promise<Message[]> {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("contact_id", contactId)
    .eq("deleted_for_me", false)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as Message[];
}

export async function insertMessage(input: {
  contact_id: string;
  whatsapp_message_id?: string | null;
  direction: Message["direction"];
  sender_type: Message["sender_type"];
  message_type?: string;
  body: string | null;
  status?: string;
  status_error?: string | null;
  raw_payload?: unknown;
}): Promise<Message> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({
      contact_id: input.contact_id,
      whatsapp_message_id: input.whatsapp_message_id || null,
      direction: input.direction,
      sender_type: input.sender_type,
      message_type: input.message_type || "text",
      body: input.body,
      status: input.status || (input.direction === "inbound" ? "received" : "pending"),
      status_error: input.status_error || null,
      raw_payload: input.raw_payload || null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const preview = String(input.body || "").slice(0, 200) || `[${input.message_type || "message"}]`;
  await touchContactLastMessage(
    input.contact_id,
    preview,
    input.direction === "inbound"
  );

  return data as Message;
}

export async function updateMessageStatus(
  whatsappMessageId: string,
  status: string,
  raw?: unknown
) {
  const { data: msg } = await supabaseAdmin
    .from("messages")
    .select("id")
    .eq("whatsapp_message_id", whatsappMessageId)
    .maybeSingle();

  if (!msg?.id) return;

  await supabaseAdmin
    .from("messages")
    .update({
      status,
      updated_at: new Date().toISOString(),
      raw_payload: raw || null,
    })
    .eq("id", msg.id);

  await supabaseAdmin.from("message_status_events").insert({
    message_id: msg.id,
    whatsapp_message_id: whatsappMessageId,
    status,
    timestamp: new Date().toISOString(),
    raw_payload: raw || null,
  });
}

export async function deleteMessageForMe(messageId: string) {
  const { error } = await supabaseAdmin
    .from("messages")
    .update({ deleted_for_me: true, updated_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) throw new Error(error.message);
}

export async function deleteMessageForEveryone(messageId: string) {
  const { error } = await supabaseAdmin
    .from("messages")
    .update({
      deleted_for_everyone: true,
      body: "This message was deleted.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) throw new Error(error.message);
}

export async function getRecentMessagesForAi(
  contactId: string,
  limit = 20
): Promise<Message[]> {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("contact_id", contactId)
    .eq("deleted_for_me", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data || []) as Message[]).reverse();
}
