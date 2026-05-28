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
  blocked: boolean;
  needs_human_attention: boolean;
  human_attention_reason: string | null;
  human_attention_at: string | null;
};

export type ApiMessageType =
  | "text"
  | "image"
  | "video"
  | "document"
  | "audio"
  | "sticker"
  | "location"
  | "contacts"
  | "interactive"
  | "button"
  | "system"
  | "unknown";

export type ApiMessage = {
  id: string;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "admin" | "ai" | "system";
  body: string | null;
  status: string | null;
  created_at: string;
  message_type: ApiMessageType;
  media_id: string | null;
  media_url: string | null;
  english_translation: string | null;
  detected_language: string | null;
  translation_status: string | null;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function nullableString(value: unknown) {
  const clean = cleanString(value);
  return clean || null;
}

function booleanValue(value: unknown) {
  return value === true;
}

function isSchemaError(error: unknown) {
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
    message.includes("does not exist") ||
    message.includes("relation")
  );
}

function normalizeDirection(value: unknown): ApiMessage["direction"] {
  return value === "outbound" ? "outbound" : "inbound";
}

function normalizeMessageType(value: unknown): ApiMessageType {
  const clean = cleanString(value).toLowerCase();

  if (
    clean === "text" ||
    clean === "image" ||
    clean === "video" ||
    clean === "document" ||
    clean === "audio" ||
    clean === "sticker" ||
    clean === "location" ||
    clean === "contacts" ||
    clean === "interactive" ||
    clean === "button" ||
    clean === "system"
  ) {
    return clean;
  }

  return clean ? "unknown" : "text";
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

function getMessageContent(row: Record<string, unknown>) {
  return (
    (row.content as string) ??
    (row.body as string) ??
    (row.message as string) ??
    null
  );
}

function getMessageStatus(
  row: Record<string, unknown>,
  direction: ApiMessage["direction"]
) {
  return (
    (row.delivery_status as string) ??
    (row.status as string) ??
    (direction === "inbound" ? "received" : "sent")
  );
}

function getMessageCreatedAt(row: Record<string, unknown>) {
  return String(row.created_at || new Date().toISOString());
}

function getMediaId(row: Record<string, unknown>) {
  return (row.media_id as string) ?? (row.whatsapp_media_id as string) ?? null;
}

function getMediaUrl(row: Record<string, unknown>) {
  return (
    (row.media_url as string) ??
    (row.file_url as string) ??
    (row.attachment_url as string) ??
    null
  );
}

function getEnglishTranslation(row: Record<string, unknown>) {
  return (
    (row.english_translation as string) ??
    (row.translation_en as string) ??
    null
  );
}

function getDetectedLanguage(row: Record<string, unknown>) {
  return (
    (row.detected_language as string) ??
    (row.language as string) ??
    (row.source_language as string) ??
    null
  );
}

function getTranslationStatus(row: Record<string, unknown>) {
  return (
    (row.translation_status as string) ??
    (row.translation_state as string) ??
    null
  );
}

function getMediaPreview(messageType: ApiMessageType, body?: string | null) {
  const cleanBody = cleanString(body);

  if (cleanBody) {
    return cleanBody;
  }

  if (messageType === "image") {
    return "📷 Image";
  }

  if (messageType === "video") {
    return "🎥 Video";
  }

  if (messageType === "document") {
    return "📄 Document";
  }

  if (messageType === "audio") {
    return "🎧 Audio";
  }

  if (messageType === "sticker") {
    return "🏷️ Sticker";
  }

  return "New message";
}

function sortMessageRows(rows: Record<string, unknown>[]) {
  return [...rows].sort((a, b) => {
    const first = new Date(getMessageCreatedAt(a)).getTime();
    const second = new Date(getMessageCreatedAt(b)).getTime();

    if (Number.isNaN(first) || Number.isNaN(second)) {
      return 0;
    }

    return first - second;
  });
}

function uniqueRowsById(rows: Record<string, unknown>[]) {
  const map = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    const id = String(row.id || "");

    if (!id) {
      continue;
    }

    map.set(id, row);
  }

  return Array.from(map.values());
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
    blocked: booleanValue(row.blocked),
    needs_human_attention: booleanValue(row.needs_human_attention),
    human_attention_reason: (row.human_attention_reason as string) ?? null,
    human_attention_at: (row.human_attention_at as string) ?? null,
  };
}

export function normalizeMessageRow(row: Record<string, unknown>): ApiMessage {
  const direction = normalizeDirection(row.direction);
  const messageType = normalizeMessageType(row.message_type);

  return {
    id: String(row.id),
    direction,
    sender_type:
      (row.sender_type as ApiMessage["sender_type"]) ||
      mapRoleToSenderType(row.role as string, direction),
    body: getMessageContent(row),
    status: getMessageStatus(row, direction),
    created_at: getMessageCreatedAt(row),
    message_type: messageType,
    media_id: getMediaId(row),
    media_url: getMediaUrl(row),
    english_translation: getEnglishTranslation(row),
    detected_language: getDetectedLanguage(row),
    translation_status: getTranslationStatus(row),
  };
}

function phoneLookupVariants(phone: string) {
  const original = cleanString(phone);
  const digits = normalizePhone(phone);
  const variants = new Set<string>();

  if (original) {
    variants.add(original);
  }

  if (digits) {
    variants.add(digits);
    variants.add(`+${digits}`);
  }

  if (digits.startsWith("34") && digits.length > 9) {
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

  if (!isSchemaError(primary.error)) {
    throw primary.error;
  }

  if (!fallback) {
    return;
  }

  const secondary = await db
    .from("artipilot_contacts")
    .update(fallback)
    .eq("id", contactId);

  if (secondary.error && !isSchemaError(secondary.error)) {
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

    if (!isSchemaError(error)) {
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
    .order("needs_human_attention", { ascending: false })
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (!primary.error) {
    return (primary.data || []).map((row) =>
      normalizeContactRow(row as Record<string, unknown>)
    );
  }

  if (!isSchemaError(primary.error)) {
    throw primary.error;
  }

  const fallback = await db.from("artipilot_contacts").select("*");

  if (fallback.error) {
    throw fallback.error;
  }

  return (fallback.data || [])
    .map((row) => normalizeContactRow(row as Record<string, unknown>))
    .sort((a, b) => {
      if (a.needs_human_attention !== b.needs_human_attention) {
        return a.needs_human_attention ? -1 : 1;
      }

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

  const allRows: Record<string, unknown>[] = [];

  for (const phone of phones) {
    const byContactPhone = await db
      .from("artipilot_messages")
      .select("*")
      .eq("contact_phone", phone)
      .order("created_at", { ascending: true });

    if (!byContactPhone.error) {
      allRows.push(
        ...((byContactPhone.data || []) as Record<string, unknown>[])
      );
      continue;
    }

    if (!isSchemaError(byContactPhone.error)) {
      throw byContactPhone.error;
    }
  }

  if (allRows.length > 0) {
    return sortMessageRows(uniqueRowsById(allRows)).map((row) =>
      normalizeMessageRow(row)
    );
  }

  const legacyByContactId = await db
    .from("artipilot_messages")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true });

  if (!legacyByContactId.error) {
    return ((legacyByContactId.data || []) as Record<string, unknown>[]).map(
      (row) => normalizeMessageRow(row)
    );
  }

  if (!isSchemaError(legacyByContactId.error)) {
    throw legacyByContactId.error;
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

  const modernUpdates: Record<string, unknown> = {
    ai_enabled: aiEnabled,
    updated_at: now,
  };

  if (aiEnabled) {
    modernUpdates.needs_human_attention = false;
    modernUpdates.human_attention_reason = null;
    modernUpdates.human_attention_at = null;
  }

  const primary = await db
    .from("artipilot_contacts")
    .update(modernUpdates)
    .eq("id", contactId)
    .select("*")
    .single();

  if (!primary.error && primary.data) {
    return normalizeContactRow(primary.data as Record<string, unknown>);
  }

  if (!isSchemaError(primary.error)) {
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

export async function blockContact(contactId: string): Promise<ApiContact> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const primary = await db
    .from("artipilot_contacts")
    .update({
      blocked: true,
      ai_enabled: false,
      needs_human_attention: false,
      human_attention_reason: null,
      human_attention_at: null,
      updated_at: now,
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (!primary.error && primary.data) {
    return normalizeContactRow(primary.data as Record<string, unknown>);
  }

  if (!isSchemaError(primary.error)) {
    throw primary.error;
  }

  const fallback = await db
    .from("artipilot_contacts")
    .update({
      ai_enabled: false,
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (fallback.error) {
    throw fallback.error;
  }

  return normalizeContactRow(fallback.data as Record<string, unknown>);
}

export async function unblockContact(contactId: string): Promise<ApiContact> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const primary = await db
    .from("artipilot_contacts")
    .update({
      blocked: false,
      updated_at: now,
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (!primary.error && primary.data) {
    return normalizeContactRow(primary.data as Record<string, unknown>);
  }

  if (!isSchemaError(primary.error)) {
    throw primary.error;
  }

  return getContactById(contactId);
}

export async function markContactHumanAttention(
  contactId: string,
  reason?: string | null
): Promise<ApiContact> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const cleanReason =
    nullableString(reason) ||
    "Customer requested human/team support or needs manual review.";

  const primary = await db
    .from("artipilot_contacts")
    .update({
      needs_human_attention: true,
      human_attention_reason: cleanReason,
      human_attention_at: now,
      ai_enabled: false,
      updated_at: now,
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (!primary.error && primary.data) {
    return normalizeContactRow(primary.data as Record<string, unknown>);
  }

  if (!isSchemaError(primary.error)) {
    throw primary.error;
  }

  const fallback = await db
    .from("artipilot_contacts")
    .update({
      ai_enabled: false,
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (fallback.error) {
    throw fallback.error;
  }

  return normalizeContactRow(fallback.data as Record<string, unknown>);
}

export async function clearContactHumanAttention(
  contactId: string
): Promise<ApiContact> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const primary = await db
    .from("artipilot_contacts")
    .update({
      needs_human_attention: false,
      human_attention_reason: null,
      human_attention_at: null,
      updated_at: now,
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (!primary.error && primary.data) {
    return normalizeContactRow(primary.data as Record<string, unknown>);
  }

  if (!isSchemaError(primary.error)) {
    throw primary.error;
  }

  return getContactById(contactId);
}

export async function deleteMessage(messageId: string) {
  const db = getSupabaseAdmin();
  const cleanId = cleanString(messageId);

  if (!cleanId) {
    throw new Error("messageId is required.");
  }

  const { error } = await db.from("artipilot_messages").delete().eq("id", cleanId);

  if (error) {
    throw error;
  }

  return { ok: true };
}

export async function deleteChat(contactId: string) {
  const db = getSupabaseAdmin();
  const contact = await getContactById(contactId);
  const phones = phoneLookupVariants(contact.phone);

  for (const phone of phones) {
    const byPhone = await db
      .from("artipilot_messages")
      .delete()
      .eq("contact_phone", phone);

    if (byPhone.error && !isSchemaError(byPhone.error)) {
      throw byPhone.error;
    }
  }

  const byContactId = await db
    .from("artipilot_messages")
    .delete()
    .eq("contact_id", contactId);

  if (byContactId.error && !isSchemaError(byContactId.error)) {
    throw byContactId.error;
  }

  const deleteContact = await db
    .from("artipilot_contacts")
    .delete()
    .eq("id", contactId);

  if (deleteContact.error) {
    throw deleteContact.error;
  }

  return { ok: true };
}

export async function insertOutboundMessage(params: {
  contactId: string;
  phone: string;
  body: string;
  senderType?: "admin" | "ai" | "system";
  status?: string;
  whatsappMessageId?: string | null;
  statusError?: string | null;
  deliveryError?: string | null;
  messageType?: ApiMessageType;
  mediaId?: string | null;
  mediaUrl?: string | null;
  raw?: unknown;
  englishTranslation?: string | null;
  detectedLanguage?: string | null;
  translationStatus?: string | null;
}) {
  const db = getSupabaseAdmin();
  const phone = normalizePhone(params.phone);
  const senderType = params.senderType || "admin";
  const status = params.status || "sent";
  const messageType =
    params.messageType || (senderType === "system" ? "system" : "text");
  const now = new Date().toISOString();

  const errorText = params.statusError ?? params.deliveryError ?? null;

  const fullPayload = {
    contact_phone: phone,
    whatsapp_message_id: params.whatsappMessageId ?? null,
    role: mapSenderTypeToRole(senderType),
    sender_type: senderType,
    direction: "outbound",
    message_type: messageType,
    content: params.body,
    media_id: params.mediaId ?? null,
    media_url: params.mediaUrl ?? null,
    english_translation: params.englishTranslation ?? null,
    detected_language: params.detectedLanguage ?? null,
    translation_status: params.translationStatus ?? null,
    delivery_status: status,
    status_error: errorText,
    delivery_error: errorText,
    raw_payload: params.raw ?? null,
    created_at: now,
    updated_at: now,
  };

  const simplePayload = {
    contact_phone: phone,
    whatsapp_message_id: params.whatsappMessageId ?? null,
    role: mapSenderTypeToRole(senderType),
    direction: "outbound",
    message_type: messageType,
    content: params.body,
    media_id: params.mediaId ?? null,
    media_url: params.mediaUrl ?? null,
    english_translation: params.englishTranslation ?? null,
    detected_language: params.detectedLanguage ?? null,
    translation_status: params.translationStatus ?? null,
    delivery_status: status,
    created_at: now,
  };

  const legacyPayload = {
    contact_phone: phone,
    whatsapp_message_id: params.whatsappMessageId ?? null,
    role: mapSenderTypeToRole(senderType),
    direction: "outbound",
    content: params.body,
    created_at: now,
  };

  return insertMessageWithFallback(db, [
    fullPayload,
    simplePayload,
    legacyPayload,
  ]);
}

export async function updateOutboundMessage(
  messageId: string,
  updates: Record<string, unknown>
) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const fullUpdates: Record<string, unknown> = {
    updated_at: now,
  };

  if ("status" in updates) {
    fullUpdates.delivery_status = updates.status;
  }

  if ("delivery_status" in updates) {
    fullUpdates.delivery_status = updates.delivery_status;
  }

  if ("status_error" in updates) {
    fullUpdates.status_error = updates.status_error;
    fullUpdates.delivery_error = updates.status_error;
  }

  if ("delivery_error" in updates) {
    fullUpdates.delivery_error = updates.delivery_error;
    fullUpdates.status_error = updates.delivery_error;
  }

  if ("whatsapp_message_id" in updates) {
    fullUpdates.whatsapp_message_id = updates.whatsapp_message_id;
  }

  if ("body" in updates) {
    fullUpdates.content = updates.body;
  }

  if ("content" in updates) {
    fullUpdates.content = updates.content;
  }

  if ("message_type" in updates) {
    fullUpdates.message_type = updates.message_type;
  }

  if ("media_id" in updates) {
    fullUpdates.media_id = updates.media_id;
  }

  if ("media_url" in updates) {
    fullUpdates.media_url = updates.media_url;
  }

  if ("raw_payload" in updates) {
    fullUpdates.raw_payload = updates.raw_payload;
  }

  if ("english_translation" in updates) {
    fullUpdates.english_translation = updates.english_translation;
  }

  if ("englishTranslation" in updates) {
    fullUpdates.english_translation = updates.englishTranslation;
  }

  if ("detected_language" in updates) {
    fullUpdates.detected_language = updates.detected_language;
  }

  if ("detectedLanguage" in updates) {
    fullUpdates.detected_language = updates.detectedLanguage;
  }

  if ("translation_status" in updates) {
    fullUpdates.translation_status = updates.translation_status;
  }

  if ("translationStatus" in updates) {
    fullUpdates.translation_status = updates.translationStatus;
  }

  const primary = await db
    .from("artipilot_messages")
    .update(fullUpdates)
    .eq("id", messageId)
    .select("*")
    .single();

  if (!primary.error && primary.data) {
    return normalizeMessageRow(primary.data as Record<string, unknown>);
  }

  if (!isSchemaError(primary.error)) {
    throw primary.error;
  }

  const simpleUpdates: Record<string, unknown> = {};

  if ("delivery_status" in fullUpdates) {
    simpleUpdates.delivery_status = fullUpdates.delivery_status;
  }

  if ("status_error" in fullUpdates) {
    simpleUpdates.status_error = fullUpdates.status_error;
  }

  if ("whatsapp_message_id" in fullUpdates) {
    simpleUpdates.whatsapp_message_id = fullUpdates.whatsapp_message_id;
  }

  if ("content" in fullUpdates) {
    simpleUpdates.content = fullUpdates.content;
  }

  if ("message_type" in fullUpdates) {
    simpleUpdates.message_type = fullUpdates.message_type;
  }

  if ("media_id" in fullUpdates) {
    simpleUpdates.media_id = fullUpdates.media_id;
  }

  if ("media_url" in fullUpdates) {
    simpleUpdates.media_url = fullUpdates.media_url;
  }

  if ("english_translation" in fullUpdates) {
    simpleUpdates.english_translation = fullUpdates.english_translation;
  }

  if ("detected_language" in fullUpdates) {
    simpleUpdates.detected_language = fullUpdates.detected_language;
  }

  if ("translation_status" in fullUpdates) {
    simpleUpdates.translation_status = fullUpdates.translation_status;
  }

  const secondary = await db
    .from("artipilot_messages")
    .update(simpleUpdates)
    .eq("id", messageId)
    .select("*")
    .single();

  if (!secondary.error && secondary.data) {
    return normalizeMessageRow(secondary.data as Record<string, unknown>);
  }

  if (!isSchemaError(secondary.error)) {
    throw secondary.error;
  }

  const legacyUpdates: Record<string, unknown> = {};

  if ("whatsapp_message_id" in fullUpdates) {
    legacyUpdates.whatsapp_message_id = fullUpdates.whatsapp_message_id;
  }

  if ("content" in fullUpdates) {
    legacyUpdates.content = fullUpdates.content;
  }

  const fallback = await db
    .from("artipilot_messages")
    .update(legacyUpdates)
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
  messageType?: ApiMessageType;
  mediaId?: string | null;
  mediaUrl?: string | null;
  englishTranslation?: string | null;
  detectedLanguage?: string | null;
  translationStatus?: string | null;
}) {
  const db = getSupabaseAdmin();
  const phone = normalizePhone(params.phone);
  const createdAt = params.createdAt || new Date().toISOString();
  const now = new Date().toISOString();
  const messageType = params.messageType || "text";

  const fullPayload = {
    contact_phone: phone,
    whatsapp_message_id: params.waMessageId || null,
    role: "customer",
    sender_type: "customer",
    direction: "inbound",
    message_type: messageType,
    content: params.body,
    media_id: params.mediaId ?? null,
    media_url: params.mediaUrl ?? null,
    english_translation: params.englishTranslation ?? null,
    detected_language: params.detectedLanguage ?? null,
    translation_status: params.translationStatus ?? null,
    delivery_status: "received",
    raw_payload: params.raw ?? null,
    created_at: createdAt,
    updated_at: now,
  };

  const simplePayload = {
    contact_phone: phone,
    whatsapp_message_id: params.waMessageId || null,
    role: "customer",
    direction: "inbound",
    message_type: messageType,
    content: params.body,
    media_id: params.mediaId ?? null,
    media_url: params.mediaUrl ?? null,
    english_translation: params.englishTranslation ?? null,
    detected_language: params.detectedLanguage ?? null,
    translation_status: params.translationStatus ?? null,
    delivery_status: "received",
    created_at: createdAt,
  };

  const legacyPayload = {
    contact_phone: phone,
    whatsapp_message_id: params.waMessageId || null,
    role: "customer",
    direction: "inbound",
    content: params.body,
    created_at: createdAt,
  };

  const message = await insertMessageWithFallback(db, [
    fullPayload,
    simplePayload,
    legacyPayload,
  ]);

  let unreadCount = 1;

  const contactResult = await db
    .from("artipilot_contacts")
    .select("unread_count")
    .eq("id", params.contactId)
    .maybeSingle();

  if (!contactResult.error && contactResult.data) {
    unreadCount = Number(contactResult.data.unread_count || 0) + 1;
  }

  const preview = getMediaPreview(messageType, params.body);

  await updateContactWithFallback(
    db,
    params.contactId,
    {
      last_message: preview,
      last_message_at: createdAt,
      unread_count: unreadCount,
      updated_at: now,
    },
    {
      last_message: preview,
      last_message_at: createdAt,
      unread_count: unreadCount,
    }
  );

  return message;
}

export async function updateMessageTranslation(
  messageId: string,
  params: {
    englishTranslation?: string | null;
    detectedLanguage?: string | null;
    translationStatus?: string | null;
  }
) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const fullUpdates = {
    english_translation: nullableString(params.englishTranslation),
    detected_language: nullableString(params.detectedLanguage),
    translation_status: nullableString(params.translationStatus) || "done",
    updated_at: now,
  };

  const primary = await db
    .from("artipilot_messages")
    .update(fullUpdates)
    .eq("id", messageId)
    .select("*")
    .single();

  if (!primary.error && primary.data) {
    return normalizeMessageRow(primary.data as Record<string, unknown>);
  }

  if (!isSchemaError(primary.error)) {
    throw primary.error;
  }

  const fallbackUpdates = {
    english_translation: fullUpdates.english_translation,
    detected_language: fullUpdates.detected_language,
    translation_status: fullUpdates.translation_status,
  };

  const fallback = await db
    .from("artipilot_messages")
    .update(fallbackUpdates)
    .eq("id", messageId)
    .select("*")
    .single();

  if (fallback.error) {
    throw fallback.error;
  }

  return normalizeMessageRow(fallback.data as Record<string, unknown>);
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
      last_message: text,
      last_message_at: now,
    }
  );
}