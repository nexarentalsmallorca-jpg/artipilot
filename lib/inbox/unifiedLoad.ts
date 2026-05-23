import { listContacts, markContactRead } from "@/lib/db/contacts";
import { listMessagesForContact } from "@/lib/db/messages";
import type { Contact, Message } from "@/lib/db/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPrivateSchemaReady } from "@/lib/whatsapp/syncToPrivate";

type ContactRow = Contact & { last_message_preview?: string };

async function getWorkspaceId(): Promise<string | null> {
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

async function loadLastPreviews(contactIds: string[]) {
  const map: Record<string, string> = {};
  if (!contactIds.length) return map;

  const { data } = await supabaseAdmin
    .from("messages")
    .select("contact_id, body, created_at")
    .in("contact_id", contactIds)
    .eq("deleted_for_me", false)
    .order("created_at", { ascending: false });

  for (const row of data || []) {
    if (!map[row.contact_id]) {
      map[row.contact_id] = String(row.body || "").slice(0, 120);
    }
  }
  return map;
}

async function loadFromPrivateTables(contactId?: string | null) {
  const contacts = await listContacts();
  const previews = await loadLastPreviews(contacts.map((c) => c.id));
  const contactsWithPreview: ContactRow[] = contacts.map((c) => ({
    ...c,
    last_message_preview: previews[c.id] || "",
  }));

  if (!contactId) {
    return { contacts: contactsWithPreview, messages: [] as Message[], source: "private" as const };
  }

  const messages = await listMessagesForContact(contactId);
  await markContactRead(contactId);
  return { contacts: contactsWithPreview, messages, source: "private" as const };
}

function mapLegacyRole(role: string): Message["sender_type"] {
  if (role === "assistant") return "ai";
  if (role === "manual") return "admin";
  if (role === "system") return "system";
  return "customer";
}

async function loadFromLegacyTables(contactId?: string | null) {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    return { contacts: [] as ContactRow[], messages: [] as Message[], source: "legacy" as const };
  }

  const { data: legacyContacts, error: cErr } = await supabaseAdmin
    .from("artipilot_contacts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (cErr) throw new Error(cErr.message);

  const contacts: ContactRow[] = (legacyContacts || []).map((row) => ({
    id: String(row.id),
    whatsapp_id: row.phone || null,
    phone: String(row.phone || "").replace(/[^\d]/g, ""),
    name: row.name,
    profile_name: row.name,
    ai_enabled: row.ai_enabled !== false,
    ai_paused_until: null,
    archived: row.conversation_status === "closed",
    blocked: row.is_blocked === true,
    notes: row.customer_notes,
    last_message_at: row.last_message_at,
    unread_count: Number(row.unread_count || 0),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    last_message_preview: row.last_message || "",
  }));

  let messages: Message[] = [];
  const selected = contactId
    ? contacts.find((c) => c.id === contactId)
    : null;

  if (selected) {
    const { data: legacyMessages, error: mErr } = await supabaseAdmin
      .from("artipilot_messages")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("contact_phone", selected.phone)
      .order("created_at", { ascending: true });

    if (mErr) throw new Error(mErr.message);

    messages = (legacyMessages || []).map((row) => ({
      id: String(row.id),
      contact_id: selected.id,
      whatsapp_message_id: row.whatsapp_message_id,
      direction: row.direction === "outbound" ? "outbound" : "inbound",
      sender_type: mapLegacyRole(String(row.role || "customer")),
      message_type: row.message_type || "text",
      body: row.content,
      status: row.delivery_status || "received",
      status_error: null,
      deleted_for_me: false,
      deleted_for_everyone: false,
      raw_payload: row.raw_payload,
      created_at: row.created_at,
      updated_at: row.created_at,
    }));

    await supabaseAdmin
      .from("artipilot_contacts")
      .update({ unread_count: 0 })
      .eq("id", selected.id);
  }

  return { contacts, messages, source: "legacy" as const };
}

export async function loadUnifiedInbox(contactId?: string | null) {
  const schemaReady = await isPrivateSchemaReady();

  if (schemaReady) {
    try {
      const privateData = await loadFromPrivateTables(contactId);
      if (privateData.contacts.length > 0) {
        return privateData;
      }
    } catch (error) {
      console.error("Private inbox load failed, trying legacy:", error);
    }
  }

  try {
    return await loadFromLegacyTables(contactId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Inbox load failed";
    if (schemaReady) {
      try {
        return await loadFromPrivateTables(contactId);
      } catch {
        throw new Error(message);
      }
    }
    throw new Error(message);
  }
}
