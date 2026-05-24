import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/whatsapp/send";

export type ApiContact = {
  id: string;
  phone: string;
  name: string | null;
  profile_name: string | null;
  ai_enabled: boolean;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type ApiMessage = {
  id: string;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "admin" | "ai" | "system";
  body: string | null;
  status: string | null;
  created_at: string;
};

function isColumnError(error: unknown) {
  const msg = String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      ""
  ).toLowerCase();
  return (
    msg.includes("column") ||
    msg.includes("schema cache") ||
    msg.includes("could not find")
  );
}

function mapRoleToSenderType(
  role: string | null | undefined,
  direction: string | null | undefined
): ApiMessage["sender_type"] {
  switch (role) {
    case "assistant":
      return "ai";
    case "manual":
      return "admin";
    case "system":
      return "system";
    case "customer":
      return "customer";
    default:
      return direction === "inbound" ? "customer" : "admin";
  }
}

function mapSenderTypeToRole(senderType: string) {
  switch (senderType) {
    case "ai":
      return "assistant";
    case "admin":
      return "manual";
    case "system":
      return "system";
    default:
      return "customer";
  }
}

export function normalizeContactRow(row: Record<string, unknown>): ApiContact {
  return {
    id: String(row.id),
    phone: String(row.phone || ""),
    name: (row.name as string) ?? null,
    profile_name: (row.profile_name as string) ?? null,
    ai_enabled: row.ai_enabled === false ? false : true,
    last_message: (row.last_message as string) ?? null,
    last_message_at: (row.last_message_at as string) ?? null,
    unread_count: Number(row.unread_count || 0),
  };
}

export function normalizeMessageRow(row: Record<string, unknown>): ApiMessage {
  const direction =
    row.direction === "outbound" ? "outbound" : ("inbound" as const);
  const body =
    (row.body as string) ??
    (row.content as string) ??
    (row.message as string) ??
    null;
  const status =
    (row.status as string) ??
    (row.delivery_status as string) ??
    (direction === "inbound" ? "received" : "sent");

  return {
    id: String(row.id),
    direction,
    sender_type:
      (row.sender_type as ApiMessage["sender_type"]) ||
      mapRoleToSenderType(row.role as string, direction),
    body,
    status,
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

export async function listContacts(): Promise<ApiContact[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("artipilot_contacts")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data || []).map((row) => normalizeContactRow(row as Record<string, unknown>));
}

export async function getContactById(contactId: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("artipilot_contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (error) throw error;
  return normalizeContactRow(data as Record<string, unknown>);
}

export async function listMessagesForContact(contactId: string): Promise<ApiMessage[]> {
  const db = getSupabaseAdmin();
  const contact = await getContactById(contactId);
  const phone = normalizePhone(contact.phone);

  const byContactId = await db
    .from("artipilot_messages")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true });

  if (!byContactId.error) {
    return (byContactId.data || []).map((row) =>
      normalizeMessageRow(row as Record<string, unknown>)
    );
  }

  if (!isColumnError(byContactId.error)) {
    throw byContactId.error;
  }

  const byPhone = await db
    .from("artipilot_messages")
    .select("*")
    .eq("contact_phone", phone)
    .order("created_at", { ascending: true });

  if (byPhone.error) throw byPhone.error;

  return (byPhone.data || []).map((row) =>
    normalizeMessageRow(row as Record<string, unknown>)
  );
}

export async function markContactRead(contactId: string) {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("artipilot_contacts")
    .update({
      unread_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  if (error && !isColumnError(error)) {
    throw error;
  }
}

export async function updateContactAi(
  contactId: string,
  aiEnabled: boolean
): Promise<ApiContact> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("artipilot_contacts")
    .update({
      ai_enabled: aiEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeContactRow(data as Record<string, unknown>);
}

async function insertMessageWithFallback(
  db: SupabaseClient,
  payloads: Record<string, unknown>[]
) {
  let lastError: unknown = null;

  for (const payload of payloads) {
    const { data, error } = await db
      .from("artipilot_messages")
      .insert(payload)
      .select("*")
      .single();

    if (!error) {
      return normalizeMessageRow(data as Record<string, unknown>);
    }

    lastError = error;
    if (!isColumnError(error)) {
      throw error;
    }
  }

  throw lastError;
}

export async function insertOutboundMessage(params: {
  contactId: string;
  phone: string;
  body: string;
  senderType?: "admin" | "ai" | "system";
  status?: string;
  whatsappMessageId?: string | null;
  statusError?: string | null;
}) {
  const db = getSupabaseAdmin();
  const phone = normalizePhone(params.phone);
  const senderType = params.senderType || "admin";
  const status = params.status || "pending";
  const now = new Date().toISOString();

  const modern = {
    contact_id: params.contactId,
    phone,
    direction: "outbound",
    sender_type: senderType,
    message_type: "text",
    body: params.body,
    status,
    status_error: params.statusError ?? null,
    whatsapp_message_id: params.whatsappMessageId ?? null,
    created_at: now,
  };

  const legacy = {
    contact_id: params.contactId,
    contact_phone: phone,
    direction: "outbound",
    role: mapSenderTypeToRole(senderType),
    sender_type: senderType,
    message_type: "text",
    content: params.body,
    body: params.body,
    delivery_status: status,
    status,
    status_error: params.statusError ?? null,
    whatsapp_message_id: params.whatsappMessageId ?? null,
    created_at: now,
  };

  return insertMessageWithFallback(db, [modern, legacy]);
}

export async function updateOutboundMessage(
  messageId: string,
  updates: Record<string, unknown>
) {
  const db = getSupabaseAdmin();
  const modern = { ...updates };
  const legacy: Record<string, unknown> = { ...updates };

  if (updates.status) {
    legacy.delivery_status = updates.status;
  }
  if (updates.body) {
    legacy.content = updates.body;
  }

  const { data, error } = await db
    .from("artipilot_messages")
    .update(modern)
    .eq("id", messageId)
    .select("*")
    .single();

  if (!error) {
    return normalizeMessageRow(data as Record<string, unknown>);
  }

  if (!isColumnError(error)) {
    throw error;
  }

  const fallback = await db
    .from("artipilot_messages")
    .update(legacy)
    .eq("id", messageId)
    .select("*")
    .single();

  if (fallback.error) throw fallback.error;
  return normalizeMessageRow(fallback.data as Record<string, unknown>);
}

export async function insertInboundMessage(params: {
  contactId: string;
  phone: string;
  body: string;
  waMessageId?: string | null;
  createdAt: string;
  raw?: unknown;
}) {
  const db = getSupabaseAdmin();
  const phone = normalizePhone(params.phone);
  const now = params.createdAt;

  const modern = {
    contact_id: params.contactId,
    phone,
    whatsapp_message_id: params.waMessageId || null,
    direction: "inbound",
    sender_type: "customer",
    message_type: "text",
    body: params.body,
    status: "received",
    raw_payload: params.raw ?? null,
    created_at: now,
  };

  const legacy = {
    contact_id: params.contactId,
    contact_phone: phone,
    whatsapp_message_id: params.waMessageId || null,
    direction: "inbound",
    role: "customer",
    sender_type: "customer",
    message_type: "text",
    content: params.body,
    body: params.body,
    delivery_status: "received",
    status: "received",
    raw_payload: params.raw ?? null,
    created_at: now,
  };

  const message = await insertMessageWithFallback(db, [modern, legacy]);

  const { data: contact } = await db
    .from("artipilot_contacts")
    .select("unread_count")
    .eq("id", params.contactId)
    .maybeSingle();

  const unread = Number(contact?.unread_count || 0) + 1;

  const { error: touchError } = await db
    .from("artipilot_contacts")
    .update({
      last_message: params.body,
      last_message_at: now,
      unread_count: unread,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.contactId);

  if (touchError && isColumnError(touchError)) {
    await db
      .from("artipilot_contacts")
      .update({
        last_message_at: now,
        unread_count: unread,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.contactId);
  } else if (touchError) {
    throw touchError;
  }

  return message;
}

export async function touchContactLastMessage(
  contactId: string,
  text: string
) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await db
    .from("artipilot_contacts")
    .update({
      last_message: text,
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", contactId);

  if (error && !isColumnError(error)) {
    const { error: fallbackError } = await db
      .from("artipilot_contacts")
      .update({
        last_message_at: now,
        updated_at: now,
      })
      .eq("id", contactId);

    if (fallbackError) throw fallbackError;
  }
}
