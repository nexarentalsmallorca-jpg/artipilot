import { NextRequest, NextResponse } from "next/server";
import {
  generateAiReply,
  isOpenAiConfigured,
  translateMessageToEnglish,
} from "@/lib/ai/generateReply";
import {
  insertInboundMessage as saveInboundMessage,
  insertOutboundMessage,
  touchContactLastMessage,
  updateOutboundMessage,
} from "@/lib/db/private-inbox";
import { sendPushNotificationToAll } from "@/lib/push/sendPushNotification";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  isWhatsAppConfigured,
  normalizePhone,
  sendWhatsAppText,
} from "@/lib/whatsapp/send";

type WaMediaObject = {
  id?: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
  filename?: string;
};

type WaLocationObject = {
  latitude?: number;
  longitude?: number;
  name?: string;
  address?: string;
};

type WaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
  image?: WaMediaObject;
  video?: WaMediaObject;
  document?: WaMediaObject;
  audio?: WaMediaObject;
  sticker?: WaMediaObject;
  location?: WaLocationObject;
};

type WaContact = {
  wa_id?: string;
  profile?: {
    name?: string;
  };
};

type WaStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: {
    code?: number;
    title?: string;
    message?: string;
    error_data?: {
      details?: string;
    };
  }[];
};

type WaChangeValue = {
  messages?: WaMessage[];
  contacts?: WaContact[];
  statuses?: WaStatus[];
};

type WebhookBody = {
  entry?: {
    changes?: {
      value?: WaChangeValue;
    }[];
  }[];
};

type ArtipilotContact = {
  id: string;
  phone: string;
  name?: string | null;
  profile_name?: string | null;
  ai_enabled?: boolean | null;
  unread_count?: number | null;
};

type ArtipilotMessage = {
  id: string;
  contact_phone: string;
  role?: string | null;
  sender_type?: string | null;
  direction?: string | null;
  message_type?: string | null;
  content?: string | null;
  whatsapp_message_id?: string | null;
  delivery_status?: string | null;
  status_error?: string | null;
  created_at?: string | null;
};

type InboundMessageType =
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
  | "unknown";

type AiMediaType = "image" | "document" | "video" | "audio" | "unknown" | null;

type MediaForAi = {
  type: InboundMessageType;
  mediaId: string;
  caption: string;
  filename: string;
  mimeType: string;
} | null;

function logDebug(label: string, data?: unknown) {
  console.log(`[NERO_WEBHOOK] ${label}`, data ?? "");
}

function logError(label: string, error: unknown) {
  console.error(`[NERO_WEBHOOK_ERROR] ${label}`, error);
}

function getVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "";
}

function safeString(value: unknown) {
  return String(value || "").trim();
}

function waTimestamp(timestamp?: string) {
  if (!timestamp) {
    return new Date().toISOString();
  }

  const seconds = Number(timestamp);

  if (Number.isNaN(seconds)) {
    return new Date().toISOString();
  }

  return new Date(seconds * 1000).toISOString();
}

function getWebhookValues(body: WebhookBody) {
  const values: WaChangeValue[] = [];

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.value) {
        values.push(change.value);
      }
    }
  }

  return values;
}

function isRealTextMessage(message: WaMessage) {
  return message.type === "text" && Boolean(message.text?.body?.trim());
}

function normalizeInboundMessageType(value: unknown): InboundMessageType {
  const type = safeString(value).toLowerCase();

  if (
    type === "text" ||
    type === "image" ||
    type === "video" ||
    type === "document" ||
    type === "audio" ||
    type === "sticker" ||
    type === "location" ||
    type === "contacts" ||
    type === "interactive" ||
    type === "button"
  ) {
    return type;
  }

  return type ? "unknown" : "text";
}

function getAiMediaType(messageType: InboundMessageType): AiMediaType {
  if (messageType === "image") return "image";
  if (messageType === "document") return "document";
  if (messageType === "video") return "video";
  if (messageType === "audio") return "audio";

  if (
    messageType === "sticker" ||
    messageType === "location" ||
    messageType === "contacts" ||
    messageType === "interactive" ||
    messageType === "button" ||
    messageType === "unknown"
  ) {
    return "unknown";
  }

  return null;
}

function getMediaFromMessage(message: WaMessage): MediaForAi {
  const type = normalizeInboundMessageType(message.type);

  if (type === "image" && message.image?.id) {
    return {
      type,
      mediaId: safeString(message.image.id),
      caption: safeString(message.image.caption),
      filename: "",
      mimeType: safeString(message.image.mime_type),
    };
  }

  if (type === "video" && message.video?.id) {
    return {
      type,
      mediaId: safeString(message.video.id),
      caption: safeString(message.video.caption),
      filename: "",
      mimeType: safeString(message.video.mime_type),
    };
  }

  if (type === "document" && message.document?.id) {
    return {
      type,
      mediaId: safeString(message.document.id),
      caption: safeString(message.document.caption),
      filename: safeString(message.document.filename),
      mimeType: safeString(message.document.mime_type),
    };
  }

  if (type === "audio" && message.audio?.id) {
    return {
      type,
      mediaId: safeString(message.audio.id),
      caption: "",
      filename: "",
      mimeType: safeString(message.audio.mime_type),
    };
  }

  if (type === "sticker" && message.sticker?.id) {
    return {
      type,
      mediaId: safeString(message.sticker.id),
      caption: "",
      filename: "",
      mimeType: safeString(message.sticker.mime_type),
    };
  }

  return null;
}

function getMediaProxyUrl(mediaId: string) {
  return `/api/whatsapp/media/${encodeURIComponent(mediaId)}`;
}

function getMessageBody(message: WaMessage) {
  if (message.type === "text" && message.text?.body?.trim()) {
    return message.text.body.trim();
  }

  const media = getMediaFromMessage(message);

  if (media) {
    if (media.caption) {
      return media.caption;
    }

    if (media.filename) {
      return media.filename;
    }

    if (media.type === "image") {
      return "📷 Image";
    }

    if (media.type === "video") {
      return "🎥 Video";
    }

    if (media.type === "document") {
      return "📄 Document";
    }

    if (media.type === "audio") {
      return "🎧 Audio";
    }

    if (media.type === "sticker") {
      return "🏷️ Sticker";
    }

    return "Media message";
  }

  if (message.type === "location" && message.location) {
    const name = safeString(message.location.name);
    const address = safeString(message.location.address);

    if (name || address) {
      return [name, address].filter(Boolean).join(" · ");
    }

    return `Location: ${message.location.latitude}, ${message.location.longitude}`;
  }

  return `[${message.type || "message"}]`;
}

function getMessageType(message: WaMessage): InboundMessageType {
  return normalizeInboundMessageType(message.type);
}

function getErrorMessage(error: unknown, fallback = "Unknown error") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  try {
    const json = JSON.stringify(error);

    if (json && json !== "{}") {
      return json;
    }
  } catch {
    // Ignore stringify errors.
  }

  return fallback;
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

function getAiDebugStatus() {
  return {
    supabaseConfigured: isSupabaseConfigured(),
    whatsappConfigured: isWhatsAppConfigured(),
    openAiConfigured: isOpenAiConfigured(),
    hasWhatsappToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
    hasPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()),
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
  };
}

function getContactDisplayName(contact: ArtipilotContact, fallbackPhone: string) {
  return (
    safeString(contact.name) ||
    safeString(contact.profile_name) ||
    safeString(fallbackPhone) ||
    "Customer"
  );
}

function getNotificationBody(name: string, text: string) {
  const cleanName = safeString(name);
  const cleanText = safeString(text);

  if (!cleanText) {
    return cleanName ? `${cleanName} sent a message` : "New customer message";
  }

  const preview =
    cleanText.length > 120 ? `${cleanText.slice(0, 117)}...` : cleanText;

  return cleanName ? `${cleanName}: ${preview}` : preview;
}

function getInboxNotificationUrl(contactId: string) {
  const cleanContactId = safeString(contactId);

  if (!cleanContactId) {
    return "/dashboard/inbox";
  }

  return `/dashboard/inbox?contact=${encodeURIComponent(cleanContactId)}`;
}

async function translateForInbox(text: string) {
  const cleanText = safeString(text);

  if (!cleanText) {
    return {
      englishTranslation: null,
      detectedLanguage: null,
      translationStatus: "skipped" as const,
    };
  }

  return translateMessageToEnglish(cleanText);
}

async function notifyNewInboundMessage(params: {
  contact: ArtipilotContact;
  phone: string;
  text: string;
}) {
  try {
    const name = getContactDisplayName(params.contact, params.phone);

    logDebug("Push notification send started", {
      contactId: params.contact.id,
      phone: params.phone,
    });

    const result = await sendPushNotificationToAll({
      title: "New WhatsApp message",
      body: getNotificationBody(name, params.text),
      url: getInboxNotificationUrl(params.contact.id),
      tag: `artipilot-whatsapp-${params.contact.id}`,
      contactId: params.contact.id,
      phone: params.phone,
    });

    logDebug("Push notification result", result);

    return result;
  } catch (error) {
    logError("Push notification failed", error);

    return {
      ok: false,
      sent: 0,
      failed: 1,
      skipped: 0,
      totalSubscriptions: 0,
      error: getErrorMessage(error, "Push notification failed."),
    };
  }
}

async function messageAlreadyExists(whatsappMessageId?: string) {
  if (!whatsappMessageId) {
    return false;
  }

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("artipilot_messages")
    .select("id")
    .eq("whatsapp_message_id", whatsappMessageId)
    .maybeSingle();

  if (error) {
    logError("messageAlreadyExists failed", error);
    return false;
  }

  return Boolean(data?.id);
}

async function upsertContact(phone: string, profileName?: string | null) {
  const db = getSupabaseAdmin();
  const normalizedPhone = normalizePhone(phone);
  const cleanProfileName = safeString(profileName);
  const now = new Date().toISOString();

  logDebug("Upserting contact", {
    phone: normalizedPhone,
    profileName: cleanProfileName || null,
  });

  const { data: existing, error: existingError } = await db
    .from("artipilot_contacts")
    .select("id, phone, name, profile_name, ai_enabled, unread_count")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existingError) {
    logError("Contact lookup failed", existingError);
    throw existingError;
  }

  if (existing?.id) {
    const updates: Record<string, unknown> = {
      updated_at: now,
    };

    if (cleanProfileName && !existing.profile_name) {
      updates.profile_name = cleanProfileName;
    }

    if (cleanProfileName && !existing.name) {
      updates.name = cleanProfileName;
    }

    const { data: updated, error: updateError } = await db
      .from("artipilot_contacts")
      .update(updates)
      .eq("id", existing.id)
      .select("id, phone, name, profile_name, ai_enabled, unread_count")
      .single();

    if (updateError) {
      logError("Contact update failed", updateError);
      throw updateError;
    }

    return (updated || existing) as ArtipilotContact;
  }

  const { data: created, error: createError } = await db
    .from("artipilot_contacts")
    .insert({
      phone: normalizedPhone,
      name: cleanProfileName || null,
      profile_name: cleanProfileName || null,
      ai_enabled: true,
      unread_count: 0,
      last_message: null,
      last_message_at: null,
      created_at: now,
      updated_at: now,
    })
    .select("id, phone, name, profile_name, ai_enabled, unread_count")
    .single();

  if (createError) {
    logError("Contact create failed", createError);
    throw createError;
  }

  return created as ArtipilotContact;
}

async function updateContactAfterOutbound(params: {
  contactId?: string | null;
  phone: string;
  body: string;
}) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const query = db.from("artipilot_contacts").update({
    last_message: params.body,
    last_message_at: now,
    updated_at: now,
  });

  const { error } = params.contactId
    ? await query.eq("id", params.contactId)
    : await query.eq("phone", normalizePhone(params.phone));

  if (error) {
    logError("Contact outbound update failed", error);
  }
}

function getStatusError(status: WaStatus) {
  const firstError = status.errors?.[0];

  if (!firstError) {
    return null;
  }

  return {
    code: firstError.code || null,
    title: firstError.title || null,
    message: firstError.message || null,
    details: firstError.error_data?.details || null,
  };
}

async function handleStatusUpdate(status: WaStatus) {
  const whatsappMessageId = safeString(status.id);
  const deliveryStatus = safeString(status.status);
  const updatedAt = waTimestamp(status.timestamp);
  const statusError = getStatusError(status);

  if (!whatsappMessageId || !deliveryStatus) {
    return;
  }

  const db = getSupabaseAdmin();

  logDebug("Handling WhatsApp status update", {
    whatsappMessageId,
    deliveryStatus,
    statusError,
  });

  const updates: Record<string, unknown> = {
    delivery_status: deliveryStatus,
    delivery_updated_at: updatedAt,
    updated_at: new Date().toISOString(),
  };

  if (deliveryStatus === "delivered") {
    updates.delivered_at = updatedAt;
  }

  if (deliveryStatus === "read") {
    updates.read_at = updatedAt;
  }

  if (deliveryStatus === "failed") {
    updates.delivery_error = statusError || status.errors || null;
    updates.status_error =
      statusError?.message ||
      statusError?.details ||
      statusError?.title ||
      "WhatsApp delivery failed.";
  }

  const primary = await db
    .from("artipilot_messages")
    .update(updates)
    .eq("whatsapp_message_id", whatsappMessageId);

  if (!primary.error) {
    return;
  }

  if (!isSchemaError(primary.error)) {
    logError("Status update failed", primary.error);
    return;
  }

  const simpleUpdates: Record<string, unknown> = {
    delivery_status: deliveryStatus,
    updated_at: new Date().toISOString(),
  };

  if (deliveryStatus === "failed") {
    simpleUpdates.status_error =
      statusError?.message ||
      statusError?.details ||
      statusError?.title ||
      "WhatsApp delivery failed.";
  }

  const fallback = await db
    .from("artipilot_messages")
    .update(simpleUpdates)
    .eq("whatsapp_message_id", whatsappMessageId);

  if (fallback.error) {
    logError("Fallback status update failed", fallback.error);
  }
}

async function listRecentMessagesForPhone(phone: string) {
  const db = getSupabaseAdmin();
  const normalizedPhone = normalizePhone(phone);

  const { data, error } = await db
    .from("artipilot_messages")
    .select(
      "id, contact_phone, role, sender_type, direction, message_type, content, whatsapp_message_id, delivery_status, status_error, created_at"
    )
    .eq("contact_phone", normalizedPhone)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!error) {
    return ([...(data || [])].reverse() as ArtipilotMessage[]);
  }

  if (!isSchemaError(error)) {
    logError("Recent messages lookup failed", error);
    return [];
  }

  const fallback = await db
    .from("artipilot_messages")
    .select(
      "id, contact_phone, role, direction, message_type, content, whatsapp_message_id, delivery_status, status_error, created_at"
    )
    .eq("contact_phone", normalizedPhone)
    .order("created_at", { ascending: false })
    .limit(30);

  if (fallback.error) {
    logError("Fallback recent messages lookup failed", fallback.error);
    return [];
  }

  return ([...(fallback.data || [])].reverse() as ArtipilotMessage[]);
}

function buildHistoryForAi(messages: ArtipilotMessage[]) {
  return messages
    .filter((message) => safeString(message.content))
    .filter((message) => {
      const messageType = safeString(message.message_type).toLowerCase();
      return !messageType || messageType === "text";
    })
    .slice(-20)
    .map((message) => ({
      role:
        message.direction === "inbound"
          ? ("user" as const)
          : ("assistant" as const),
      content: safeString(message.content),
    }));
}

function looksLikeDocumentOrLicenceText(value: string) {
  const text = safeString(value).toLowerCase();

  if (!text) {
    return false;
  }

  return (
    text.includes("licence") ||
    text.includes("license") ||
    text.includes("driving") ||
    text.includes("driver") ||
    text.includes("passport") ||
    text.includes("id") ||
    text.includes("dni") ||
    text.includes("document") ||
    text.includes("permiso") ||
    text.includes("carnet") ||
    text.includes("conducir") ||
    text.includes("passeport") ||
    text.includes("führerschein") ||
    text.includes("ausweis") ||
    text.includes("patente")
  );
}

function buildAiInputFromInboundMessage(params: {
  message: WaMessage;
  savedText: string;
  messageType: InboundMessageType;
  media: MediaForAi;
}) {
  const savedText = safeString(params.savedText);
  const caption = safeString(params.media?.caption);
  const filename = safeString(params.media?.filename);
  const mimeType = safeString(params.media?.mimeType);
  const type = params.messageType;

  if (type === "text") {
    return savedText;
  }

  const combinedText = [savedText, caption, filename, mimeType]
    .filter(Boolean)
    .join(" ");

  const mightBeLicenceOrId = looksLikeDocumentOrLicenceText(combinedText);

  if (type === "image") {
    if (mightBeLicenceOrId) {
      return [
        "Customer sent an image that may be a driving licence, ID, passport, or rental document.",
        caption ? `Customer caption: ${caption}` : "",
        "Reply politely. Do not approve or reject the document yourself. Say you will forward this image to the team so they can check and confirm it. Remind the customer to bring the original driving licence and ID/passport at pickup.",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return [
      "Customer sent an image/photo.",
      caption ? `Customer caption: ${caption}` : "",
      "Reply naturally and politely. If it looks like a licence, ID, passport, or document, say the team will check it. If the image context is unclear, acknowledge it and ask how you can help.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (type === "document") {
    if (mightBeLicenceOrId) {
      return [
        "Customer sent a document that may be a driving licence, ID, passport, or rental document.",
        filename ? `Filename: ${filename}` : "",
        caption ? `Customer caption: ${caption}` : "",
        "Reply politely. Do not approve or reject the document yourself. Say you will forward it to the team so they can check and confirm it. Remind the customer to bring the original driving licence and ID/passport at pickup.",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return [
      "Customer sent a document/file.",
      filename ? `Filename: ${filename}` : "",
      caption ? `Customer caption: ${caption}` : "",
      "Reply naturally and politely. If it is for licence/ID verification, say the team will check and confirm it.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (type === "video") {
    return [
      "Customer sent a video.",
      caption ? `Customer caption: ${caption}` : "",
      "Reply naturally and politely. If it is about an active rental problem, accident, damage, or mechanical issue, prioritise safety and urgent support according to the NEXA rules.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (type === "location" && params.message.location) {
    const latitude = params.message.location.latitude;
    const longitude = params.message.location.longitude;
    const name = safeString(params.message.location.name);
    const address = safeString(params.message.location.address);

    return [
      "Customer shared a location.",
      name ? `Location name: ${name}` : "",
      address ? `Address: ${address}` : "",
      latitude && longitude ? `Coordinates: ${latitude}, ${longitude}` : "",
      "Reply naturally and ask what they need help with. Do not promise delivery or pickup at that location unless the team has confirmed it.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (type === "audio") {
    return "Customer sent an audio/voice message. Politly say you received it, but ask them to type the main details so you can help accurately with booking, licence, price, or rental support.";
  }

  if (type === "sticker") {
    return "Customer sent a sticker. Reply briefly and politely only if it makes sense; otherwise ask how you can help with booking, prices, licence, location, or rental support.";
  }

  return savedText || `Customer sent a ${type} message. Reply politely and ask how you can help.`;
}

function shouldAutoReplyToMessageType(messageType: InboundMessageType) {
  return (
    messageType === "text" ||
    messageType === "image" ||
    messageType === "document" ||
    messageType === "video" ||
    messageType === "location" ||
    messageType === "audio"
  );
}

async function maybeAutoReply(params: {
  contact: ArtipilotContact;
  phone: string;
  inboundBody: string;
  messageType: InboundMessageType;
  media: MediaForAi;
  detectedLanguage?: string | null;
}) {
  const phone = normalizePhone(params.phone);
  const inboundBody = safeString(params.inboundBody);
  const messageType = params.messageType;

  logDebug("Auto reply check started", {
    phone,
    contactId: params.contact.id,
    aiEnabled: params.contact.ai_enabled,
    inboundBody,
    messageType,
    mediaId: params.media?.mediaId || null,
    detectedLanguage: params.detectedLanguage || null,
    config: getAiDebugStatus(),
  });

  if (!params.contact?.id) {
    logDebug("Auto reply skipped: contact missing");
    return;
  }

  if (params.contact.ai_enabled === false) {
    logDebug("Auto reply skipped: AI disabled for contact", { phone });
    return;
  }

  if (!shouldAutoReplyToMessageType(messageType)) {
    logDebug("Auto reply skipped: unsupported message type", {
      messageType,
    });
    return;
  }

  if (!inboundBody) {
    logDebug("Auto reply skipped: empty AI input");
    return;
  }

  if (!isOpenAiConfigured()) {
    logError("Auto reply skipped: OpenAI is not configured", getAiDebugStatus());
    return;
  }

  if (!isWhatsAppConfigured()) {
    logError(
      "Auto reply skipped: WhatsApp sender is not configured",
      getAiDebugStatus()
    );
    return;
  }

  const recentMessages = await listRecentMessagesForPhone(phone);
  const history = buildHistoryForAi(recentMessages);
  const inboundCount = recentMessages.filter(
    (message) => message.direction === "inbound"
  ).length;

  const isFirstCustomerChat = inboundCount <= 1;

  logDebug("Generating Nero reply", {
    phone,
    contactId: params.contact.id,
    recentMessagesCount: recentMessages.length,
    historyCount: history.length,
    isFirstCustomerChat,
    messageType,
  });

  let replyText = "";

  try {
    replyText = await generateAiReply({
      customerMessage: inboundBody,
      recentMessages: history,
      isFirstCustomerChat,
      contactId: params.contact.id,
      phone,
      customerName: getContactDisplayName(params.contact, phone),
      detectedLanguage: params.detectedLanguage || null,
      hasMedia: messageType !== "text",
      mediaType: getAiMediaType(messageType),
    });
  } catch (error) {
    logError("Nero AI generation failed", error);
    return;
  }

  replyText = safeString(replyText);

  if (!replyText) {
    logError("Nero AI returned empty reply", { phone });
    return;
  }

  const aiTranslation = await translateForInbox(replyText);

  let pendingMessage: { id: string } | null = null;

  try {
    pendingMessage = await insertOutboundMessage({
      contactId: params.contact.id,
      phone,
      body: replyText,
      senderType: "ai",
      status: "pending",
      whatsappMessageId: null,
      statusError: null,
      messageType: "text",
      mediaId: null,
      mediaUrl: null,
      englishTranslation: aiTranslation.englishTranslation,
      detectedLanguage: aiTranslation.detectedLanguage,
      translationStatus: aiTranslation.translationStatus,
    });
  } catch (error) {
    logError("Could not save pending Nero reply", error);
    return;
  }

  logDebug("Sending Nero reply through WhatsApp", {
    phone,
    messageId: pendingMessage.id,
  });

  const sendResult = await sendWhatsAppText(phone, replyText);

  if (!sendResult.ok) {
    logError("WhatsApp send failed for Nero reply", {
      error: sendResult.error,
      raw: sendResult,
    });

    await updateOutboundMessage(pendingMessage.id, {
      status: "failed",
      delivery_status: "failed",
      status_error: sendResult.error || "Unknown WhatsApp send error",
      delivery_error: sendResult.error || "Unknown WhatsApp send error",
      whatsapp_message_id: null,
      message_type: "text",
      media_id: null,
      media_url: null,
    });

    return;
  }

  await updateOutboundMessage(pendingMessage.id, {
    status: "sent",
    delivery_status: "sent",
    status_error: null,
    delivery_error: null,
    whatsapp_message_id: sendResult.messageId || null,
    message_type: "text",
    media_id: null,
    media_url: null,
  });

  await updateContactAfterOutbound({
    contactId: params.contact.id,
    phone,
    body: replyText,
  });

  logDebug("Nero auto reply sent successfully", {
    phone,
    whatsappMessageId: sendResult.messageId || null,
  });
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const verifyToken = getVerifyToken();

  if (!verifyToken) {
    return NextResponse.json(
      { error: "WHATSAPP_VERIFY_TOKEN is not configured." },
      { status: 500 }
    );
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured." },
      { status: 500 }
    );
  }

  let body: WebhookBody;

  try {
    body = await request.json();
  } catch (error) {
    logError("Invalid webhook JSON", error);
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const values = getWebhookValues(body);

  if (values.length === 0) {
    logDebug("Webhook received without values");
    return NextResponse.json({ ok: true });
  }

  for (const value of values) {
    const profileMap = new Map<string, string>();

    for (const contact of value.contacts || []) {
      if (contact.wa_id && contact.profile?.name) {
        profileMap.set(contact.wa_id, contact.profile.name);
      }
    }

    for (const status of value.statuses || []) {
      try {
        await handleStatusUpdate(status);
      } catch (error) {
        logError("Webhook status handling failed", error);
      }
    }

    for (const message of value.messages || []) {
      const from = safeString(message.from);

      if (!from) {
        logDebug("Skipped message: missing from");
        continue;
      }

      const phone = normalizePhone(from);
      const profileName = profileMap.get(from) || null;
      const text = getMessageBody(message);
      const createdAt = waTimestamp(message.timestamp);
      const whatsappMessageId = safeString(message.id);
      const messageType = getMessageType(message);
      const media = getMediaFromMessage(message);
      const mediaId = media?.mediaId || null;
      const mediaUrl = mediaId ? getMediaProxyUrl(mediaId) : null;

      logDebug("Incoming WhatsApp message received", {
        phone,
        whatsappMessageId,
        messageType,
        mediaId,
        mediaUrl,
        isText: isRealTextMessage(message),
      });

      try {
        const duplicate = await messageAlreadyExists(whatsappMessageId);

        if (duplicate) {
          logDebug("Skipped duplicate WhatsApp message", {
            whatsappMessageId,
          });
          continue;
        }

        const contact = await upsertContact(phone, profileName);
        const inboundTranslation = await translateForInbox(text);

        await saveInboundMessage({
          contactId: contact.id,
          phone,
          body: text,
          waMessageId: whatsappMessageId || undefined,
          createdAt,
          raw: message,
          messageType,
          mediaId,
          mediaUrl,
          englishTranslation: inboundTranslation.englishTranslation,
          detectedLanguage: inboundTranslation.detectedLanguage,
          translationStatus: inboundTranslation.translationStatus,
        });

        await touchContactLastMessage(contact.id, text);

        await notifyNewInboundMessage({
          contact,
          phone,
          text,
        });

        const aiInput = buildAiInputFromInboundMessage({
          message,
          savedText: text,
          messageType,
          media,
        });

        await maybeAutoReply({
          contact,
          phone,
          inboundBody: aiInput,
          messageType,
          media,
          detectedLanguage: inboundTranslation.detectedLanguage,
        });
      } catch (error) {
        logError("Webhook message handling failed", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}