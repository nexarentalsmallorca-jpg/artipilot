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

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function isColumnError(error: unknown) {
  const message = String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      (error as { hint?: string })?.hint ||
      ""
  ).toLowerCase();

  return (
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("does not exist")
  );
}

function mapRoleToSenderType(
  role: string | null | undefined,
  direction: string | null | undefined
): ApiMessage["sender_type"] {
  const cleanRole = cleanString(role).toLowerCase();

  if (cleanRole === "assistant" || cleanRole === "ai") {
    return "ai";
  }

  if (cleanRole === "manual" || cleanRole === "admin") {
    return "admin";
  }

  if (cleanRole === "system") {
    return "system";
  }

  if (cleanRole === "customer" || cleanRole === "user") {
    return "customer";
  }

  return direction === "inbound" ? "customer" : "admin";
}

function mapSenderTypeToRole(senderType: string) {
  const cleanSenderType = cleanString(senderType).toLowerCase();

  if (cleanSenderType === "ai") {
    return "assistant";
  }

  if (cleanSenderType === "admin") {
    return "manual";
  }

  if (cleanSenderType === "system") {
    return "system";
  }

  return "customer";
}

function normalizeDirection(value: unknown): ApiMessage["direction"] {
  return value === "outbound" ? "outbound" : "inbound";
}

export function normalizeContactRow(row: Record<string, unknown>): ApiContact {
  return {
    id: String(row.id),
    phone: String(row.phone || row.contact_phone || ""),
    name: (row.name as string) ?? null,
    profile_name: (row.profile_name as string) ?? null,
    ai_enabled: row.ai_enabled === false ? false : true,
    last_message: (row.last_message as string) ?? null,
    last_message_at: (row.last_message_at as string) ?? null,
    unread_count: Number(row.unread_count || 0),
  };
}

export function normalizeMessageRow(row: Record<string, unknown>): ApiMessage {
  const direction = normalizeDirection(row.direction);

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

function phoneLookupVariants(phone: string) {
  const digits = normalizePhone(phone);
  const variants = new Set<string>();

  if (digits) {
    variants.add(digits);
    variants.add(`+${digits}`);
  }

  if (digits.startsWith("34")) {
    variants.add(digits.slice(2));
    variants.add(`+${digits.slice(2)}`);
  }

  return [...variants].filter(Boolean);
}

async function updateContactWithFallback(
  db: SupabaseClient,
  contactId: string,
  modern: Record<string, unknown>,
  fallback?: Record<string, unknown>
) {
  const primary = await db
    .from("artipilot_contacts")
    .update(modern)
    .eq("id", contactId);

  if (!primary.error) {
    return;
  }

  if (!isColumnError(primary.error)) {
    throw primary.error;
  }

  if (!fallback) {
    return;
  }

  const secondary = await db
    .from("artipilot_contacts")
    .update(fallback)
    .eq("id", contactId);

  if (secondary.error && !isColumnError(secondary.error)) {
    throw secondary.error;
  }
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

    if (!error && data) {
      return normalizeMessageRow(data as Record<string, unknown>);
    }

    lastError = error;

    if (!isColumnError(error)) {
      throw error;
    }
  }

  throw lastError;
}

export async function listContacts(): Promise<ApiContact[]> {
  const db = getSupabaseAdmin();

  const primary = await db
    .from("artipilot_contacts")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (!primary.error) {
    return (primary.data || []).map((row) =>
      normalizeContactRow(row as Record<string, unknown>)
    );
  }

  if (!isColumnError(primary.error)) {
    throw primary.error;
  }

  const fallback = await db.from("artipilot_contacts").select("*");

  if (fallback.error) {
    throw fallback.error;
  }

  return (fallback.data || [])
    .map((row) => normalizeContactRow(row as Record<string, unknown>))
    .sort((a, b) => {
      const aTime = a.last_message_at
        ? new Date(a.last_message_at).getTime()
        : 0;
      const bTime = b.last_message_at
        ? new Date(b.last_message_at).getTime()
        : 0;

      return bTime - aTime;
    });
}

export async function getContactById(contactId: string): Promise<ApiContact> {
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("artipilot_contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (error) {
    throw error;
  }

  return normalizeContactRow(data as Record<string, unknown>);
}

export async function listMessagesForContact(
  contactId: string
): Promise<ApiMessage[]> {
  const db = getSupabaseAdmin();
  const contact = await getContactById(contactId);
  const phones = phoneLookupVariants(contact.phone);

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

  for (const phone of phones) {
    const byContactPhone = await db
      .from("artipilot_messages")
      .select("*")
      .eq("contact_phone", phone)
      .order("created_at", { ascending: true });

    if (!byContactPhone.error && (byContactPhone.data?.length || 0) > 0) {
      return (byContactPhone.data || []).map((row) =>
        normalizeMessageRow(row as Record<string, unknown>)
      );
    }

    if (byContactPhone.error && !isColumnError(byContactPhone.error)) {
      throw byContactPhone.error;
    }

    const byPhone = await db
      .from("artipilot_messages")
      .select("*")
      .eq("phone", phone)
      .order("created_at", { ascending: true });

    if (!byPhone.error && (byPhone.data?.length || 0) > 0) {
      return (byPhone.data || []).map((row) =>
        normalizeMessageRow(row as Record<string, unknown>)
      );
    }

    if (byPhone.error && !isColumnError(byPhone.error)) {
      throw byPhone.error;
    }
  }

  return [];
}

export async function markContactRead(contactId: string) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  await updateContactWithFallback(
    db,
    contactId,
    {
      unread_count: 0,
      updated_at: now,
    },
    {
      unread_count: 0,
    }
  );
}

export async function updateContactAi(
  contactId: string,
  aiEnabled: boolean
): Promise<ApiContact> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const primary = await db
    .from("artipilot_contacts")
    .update({
      ai_enabled: aiEnabled,
      updated_at: now,
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (!primary.error && primary.data) {
    return normalizeContactRow(primary.data as Record<string, unknown>);
  }

  if (!isColumnError(primary.error)) {
    throw primary.error;
  }

  const fallback = await db
    .from("artipilot_contacts")
    .update({
      ai_enabled: aiEnabled,
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (fallback.error) {
    throw fallback.error;
  }

  return normalizeContactRow(fallback.data as Record<string, unknown>);
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
    updated_at: now,
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
    updated_at: now,
  };

  return insertMessageWithFallback(db, [modern, legacy]);
}

export async function updateOutboundMessage(
  messageId: string,
  updates: Record<string, unknown>
) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const modern: Record<string, unknown> = {
    ...updates,
    updated_at: now,
  };

  const legacy: Record<string, unknown> = {
    ...updates,
    updated_at: now,
  };

  if (updates.status) {
    legacy.delivery_status = updates.status;
  }

  if (updates.body) {
    legacy.content = updates.body;
  }

  const primary = await db
    .from("artipilot_messages")
    .update(modern)
    .eq("id", messageId)
    .select("*")
    .single();

  if (!primary.error && primary.data) {
    return normalizeMessageRow(primary.data as Record<string, unknown>);
  }

  if (!isColumnError(primary.error)) {
    throw primary.error;
  }

  const fallback = await db
    .from("artipilot_messages")
    .update(legacy)
    .eq("id", messageId)
    .select("*")
    .single();

  if (fallback.error) {
    throw fallback.error;
  }

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
  const createdAt = params.createdAt || new Date().toISOString();
  const now = new Date().toISOString();

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
    created_at: createdAt,
    updated_at: now,
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
    created_at: createdAt,
    updated_at: now,
  };

  const message = await insertMessageWithFallback(db, [modern, legacy]);

  let unreadCount = 1;

  const contactResult = await db
    .from("artipilot_contacts")
    .select("unread_count")
    .eq("id", params.contactId)
    .maybeSingle();

  if (!contactResult.error && contactResult.data) {
    unreadCount = Number(contactResult.data.unread_count || 0) + 1;
  }

  await updateContactWithFallback(
    db,
    params.contactId,
    {
      last_message: params.body,
      last_message_at: createdAt,
      unread_count: unreadCount,
      updated_at: now,
    },
    {
      last_message_at: createdAt,
      unread_count: unreadCount,
    }
  );

  return message;
}

export async function touchContactLastMessage(contactId: string, text: string) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  await updateContactWithFallback(
    db,
    contactId,
    {
      last_message: text,
      last_message_at: now,
      updated_at: now,
    },
    {
      last_message_at: now,
    }
  );
}