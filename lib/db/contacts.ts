import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Contact } from "@/lib/db/types";
import { normalizePhone } from "@/lib/whatsapp";

export async function listContacts(): Promise<Contact[]> {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data || []) as Contact[];
}

export async function getContactById(id: string): Promise<Contact | null> {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Contact) || null;
}

export async function upsertContactFromWhatsApp(input: {
  whatsappId: string;
  phone: string;
  profileName?: string | null;
}): Promise<Contact> {
  const phone = normalizePhone(input.phone) || input.phone;
  const now = new Date().toISOString();

  let existing = null;
  const byWa = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("whatsapp_id", input.whatsappId)
    .maybeSingle();
  existing = byWa.data;

  if (!existing) {
    const byPhone = await supabaseAdmin
      .from("contacts")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();
    existing = byPhone.data;
  }

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("contacts")
      .update({
        whatsapp_id: input.whatsappId,
        phone,
        profile_name: input.profileName || existing.profile_name,
        name: existing.name || input.profileName || null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as Contact;
  }

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .insert({
      whatsapp_id: input.whatsappId,
      phone,
      profile_name: input.profileName || null,
      name: input.profileName || null,
      ai_enabled: true,
      unread_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function touchContactLastMessage(
  contactId: string,
  preview: string,
  incrementUnread: boolean
) {
  const contact = await getContactById(contactId);
  if (!contact) return;

  const { error } = await supabaseAdmin
    .from("contacts")
    .update({
      last_message_at: new Date().toISOString(),
      unread_count: incrementUnread
        ? Number(contact.unread_count || 0) + 1
        : contact.unread_count,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  if (error) throw new Error(error.message);

  void preview;
}

export async function markContactRead(contactId: string) {
  const { error } = await supabaseAdmin
    .from("contacts")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("id", contactId);

  if (error) throw new Error(error.message);
}

export async function setContactAiEnabled(contactId: string, enabled: boolean) {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .update({
      ai_enabled: enabled,
      ai_paused_until: enabled ? null : new Date(Date.now() + 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function updateContactFields(
  contactId: string,
  fields: Partial<Pick<Contact, "archived" | "blocked" | "notes" | "name">>
) {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.notes !== undefined) payload.notes = fields.notes;
  if (fields.archived !== undefined) payload.archived = fields.archived;
  if (fields.blocked !== undefined) payload.blocked = fields.blocked;
  if (fields.name !== undefined) payload.name = fields.name;

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .update(payload)
    .eq("id", contactId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Contact;
}
