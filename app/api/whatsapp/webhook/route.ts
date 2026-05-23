import { NextRequest, NextResponse } from "next/server";
import {
  ArtipilotChatMessage,
  generateArtipilotReply,
  shouldMarkHumanAttentionFromText,
} from "@/lib/artipilotAi";
import { loadActiveTrainingContext } from "@/lib/ai/trainingContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendCustomerMessagePushNotification } from "@/lib/sendPushNotification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WhatsAppMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
  image?: {
    id?: string;
    mime_type?: string;
    sha256?: string;
    caption?: string;
  };
  document?: {
    id?: string;
    filename?: string;
    mime_type?: string;
    sha256?: string;
    caption?: string;
  };
  audio?: {
    id?: string;
    mime_type?: string;
    sha256?: string;
  };
  video?: {
    id?: string;
    mime_type?: string;
    sha256?: string;
    caption?: string;
  };
  sticker?: {
    id?: string;
    mime_type?: string;
    sha256?: string;
    animated?: boolean;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
  };
  button?: {
    text?: string;
    payload?: string;
  };
  interactive?: {
    type?: string;
    button_reply?: {
      id?: string;
      title?: string;
    };
    list_reply?: {
      id?: string;
      title?: string;
      description?: string;
    };
  };
};

type WhatsAppContact = {
  wa_id?: string;
  profile?: {
    name?: string;
  };
};

type WhatsAppStatus = {
  id?: string;
  status?: "sent" | "delivered" | "read" | "failed" | string;
  timestamp?: string;
  recipient_id?: string;
  errors?: unknown[];
};

type Workspace = {
  id: string;
  owner_user_id: string;
  business_name: string | null;
  business_type: string | null;
  main_language: string | null;
  ai_job: string | null;
  business_rules: string | null;
};

type ArtipilotContactRow = {
  id: string;
  workspace_id: string | null;
  owner_user_id: string | null;
  phone: string;
  name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  ai_enabled: boolean | null;
  needs_human_attention?: boolean | null;
  human_attention_reason?: string | null;
  conversation_status?: string | null;
  assigned_to?: string | null;
  last_ai_summary?: string | null;
  is_blocked?: boolean | null;
  is_muted?: boolean | null;
  muted_until?: string | null;
  is_starred?: boolean | null;
  customer_notes?: string | null;
  profile_image_url?: string | null;
};

type DownloadedMedia = {
  mediaId: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  mediaSize: number | null;
  storagePath: string | null;
  error?: string | null;
};

type MessageExtras = {
  media_id?: string | null;
  media_url?: string | null;
  media_mime_type?: string | null;
  media_filename?: string | null;
  media_size?: number | null;
  media_storage_path?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  location_address?: string | null;
  link_url?: string | null;
};

function getVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || "artipilot_verify_token_123";
}

function getAccessToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
}

function getPhoneNumberId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID;
}

function getWhatsappMediaBucket() {
  return process.env.SUPABASE_WHATSAPP_MEDIA_BUCKET || "artipilot-whatsapp-media";
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function hasColumnError(error: unknown) {
  const message = String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      ""
  ).toLowerCase();

  return (
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("could not find")
  );
}

function getTimestamp(timestamp?: string) {
  if (!timestamp) return new Date().toISOString();

  const seconds = Number(timestamp);

  if (Number.isNaN(seconds)) return new Date().toISOString();

  return new Date(seconds * 1000).toISOString();
}

function getFirstLink(text: string) {
  const match = String(text || "").match(/https?:\/\/[^\s]+/i);
  return match?.[0] || null;
}

function getMediaDetails(message: WhatsAppMessage) {
  const type = message.type || "unknown";

  if (type === "image" && message.image?.id) {
    return {
      mediaId: message.image.id,
      mimeType: message.image.mime_type || "image/jpeg",
      filename: null,
      caption: message.image.caption || null,
    };
  }

  if (type === "video" && message.video?.id) {
    return {
      mediaId: message.video.id,
      mimeType: message.video.mime_type || "video/mp4",
      filename: null,
      caption: message.video.caption || null,
    };
  }

  if (type === "audio" && message.audio?.id) {
    return {
      mediaId: message.audio.id,
      mimeType: message.audio.mime_type || "audio/ogg",
      filename: null,
      caption: null,
    };
  }

  if (type === "document" && message.document?.id) {
    return {
      mediaId: message.document.id,
      mimeType: message.document.mime_type || "application/octet-stream",
      filename: message.document.filename || null,
      caption: message.document.caption || null,
    };
  }

  if (type === "sticker" && message.sticker?.id) {
    return {
      mediaId: message.sticker.id,
      mimeType: message.sticker.mime_type || "image/webp",
      filename: null,
      caption: null,
    };
  }

  return null;
}

function getExtensionFromMime(mimeType?: string | null) {
  const mime = String(mimeType || "").toLowerCase();

  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("msword")) return "doc";
  if (mime.includes("wordprocessingml")) return "docx";
  if (mime.includes("spreadsheetml")) return "xlsx";
  if (mime.includes("excel")) return "xls";

  return "bin";
}

function sanitizeFilename(filename: string) {
  return String(filename || "file")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

function getMessageContent(message: WhatsAppMessage) {
  const type = message.type || "unknown";

  if (type === "text") {
    return message.text?.body || "";
  }

  if (type === "image") {
    return message.image?.caption || "[Image received]";
  }

  if (type === "document") {
    return (
      message.document?.caption ||
      `[Document received${
        message.document?.filename ? `: ${message.document.filename}` : ""
      }]`
    );
  }

  if (type === "audio") {
    return "[Audio message received]";
  }

  if (type === "video") {
    return message.video?.caption || "[Video received]";
  }

  if (type === "sticker") {
    return "[Sticker received]";
  }

  if (type === "location") {
    const name = message.location?.name;
    const address = message.location?.address;

    if (name && address) return `[Location received: ${name} - ${address}]`;
    if (name) return `[Location received: ${name}]`;
    if (address) return `[Location received: ${address}]`;

    return "[Location received]";
  }

  if (type === "button") {
    return message.button?.text || message.button?.payload || "[Button reply]";
  }

  if (type === "interactive") {
    const buttonTitle = message.interactive?.button_reply?.title;
    const listTitle = message.interactive?.list_reply?.title;

    return buttonTitle || listTitle || "[Interactive message received]";
  }

  return `[Unsupported message type received: ${type}]`;
}

function shouldAiReply(messageType: string) {
  return (
    messageType === "text" ||
    messageType === "button" ||
    messageType === "interactive"
  );
}

function isOwnerPrivacyQuestion(message: string) {
  const text = String(message || "").toLowerCase();

  const checks = [
    "who is the owner",
    "who owns",
    "owner name",
    "company owner",
    "business owner",
    "who is your boss",
    "who is the boss",
    "internal staff",
    "staff details",
    "who founded",
    "founder name",
  ];

  return checks.some((word) => text.includes(word));
}

function getOwnerPrivacyReply() {
  return "For company privacy, I’m not able to share the owner or internal staff details. I can still help you with rentals, prices, location, licence rules, deposit, or booking details. 😊";
}

function detectHumanAttentionReason(message: string) {
  const text = String(message || "").toLowerCase();

  const checks: { words: string[]; reason: string }[] = [
    {
      words: [
        "human",
        "real person",
        "real human",
        "team",
        "staff",
        "manager",
        "agent",
        "representative",
        "talk to someone",
        "speak to someone",
        "talk to your team",
        "speak with your team",
        "pass me to",
        "connect me",
        "call me",
        "can someone call",
        "can you call",
      ],
      reason: "Customer asked for human/team help",
    },
    {
      words: [
        "urgent",
        "emergency",
        "help now",
        "asap",
        "accident",
        "crash",
        "injured",
        "hurt",
        "hospital",
        "police",
        "112",
      ],
      reason: "Urgent or emergency message",
    },
    {
      words: [
        "flat tire",
        "flat tyre",
        "puncture",
        "broken",
        "not working",
        "won't start",
        "wont start",
        "doesn't start",
        "doesnt start",
        "stopped",
        "engine",
        "battery",
        "damage",
        "damaged",
        "stolen",
        "lost key",
        "key lost",
        "oil",
        "check oil",
        "aceite",
        "voyant",
        "témoin",
      ],
      reason: "Vehicle problem or incident",
    },
    {
      words: [
        "refund",
        "complaint",
        "angry",
        "bad service",
        "not happy",
        "cancel booking",
        "cancel reservation",
        "cancellation",
        "money back",
      ],
      reason: "Complaint, refund or cancellation risk",
    },
  ];

  for (const check of checks) {
    if (check.words.some((word) => text.includes(word))) {
      return check.reason;
    }
  }

  return "";
}

async function getDefaultWorkspace(): Promise<Workspace | null> {
  const workspaceIdFromEnv = process.env.ARTIPILOT_WORKSPACE_ID;

  if (workspaceIdFromEnv) {
    const { data, error } = await supabaseAdmin
      .from("artipilot_workspaces")
      .select(
        "id, owner_user_id, business_name, business_type, main_language, ai_job, business_rules"
      )
      .eq("id", workspaceIdFromEnv)
      .maybeSingle();

    if (error) {
      console.error("Workspace ENV lookup error:", error);
      return null;
    }

    if (data) return data as Workspace;
  }

  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select(
      "id, owner_user_id, business_name, business_type, main_language, ai_job, business_rules"
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Workspace fallback lookup error:", error);
    return null;
  }

  return (data as Workspace | null) || null;
}

async function downloadAndStoreWhatsAppMedia({
  workspace,
  phone,
  message,
}: {
  workspace: Workspace;
  phone: string;
  message: WhatsAppMessage;
}): Promise<DownloadedMedia | null> {
  const accessToken = getAccessToken();
  const mediaDetails = getMediaDetails(message);

  if (!mediaDetails?.mediaId) return null;

  const baseResult: DownloadedMedia = {
    mediaId: mediaDetails.mediaId,
    mediaUrl: null,
    mediaMimeType: mediaDetails.mimeType || null,
    mediaFilename: mediaDetails.filename || null,
    mediaSize: null,
    storagePath: null,
    error: null,
  };

  if (!accessToken) {
    return {
      ...baseResult,
      error: "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_TOKEN",
    };
  }

  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/v25.0/${mediaDetails.mediaId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const metaData = await metaRes.json();

    if (!metaRes.ok || !metaData?.url) {
      console.error("WhatsApp media metadata error:", metaData);

      return {
        ...baseResult,
        error:
          metaData?.error?.message ||
          "Could not get WhatsApp media download URL",
      };
    }

    const fileRes = await fetch(metaData.url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!fileRes.ok) {
      const errorText = await fileRes.text();

      console.error("WhatsApp media download error:", errorText);

      return {
        ...baseResult,
        error: "Could not download WhatsApp media file",
      };
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType =
      metaData.mime_type || mediaDetails.mimeType || "application/octet-stream";
    const extension = getExtensionFromMime(mimeType);

    const cleanFilename = mediaDetails.filename
      ? sanitizeFilename(mediaDetails.filename)
      : `${message.type || "media"}-${message.id || Date.now()}.${extension}`;

    const storagePath = `${workspace.id}/${phone}/${Date.now()}-${cleanFilename}`;

    const bucket = getWhatsappMediaBucket();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase media upload error:", uploadError);

      return {
        ...baseResult,
        mediaMimeType: mimeType,
        mediaFilename: cleanFilename,
        mediaSize: buffer.length,
        storagePath,
        error: uploadError.message,
      };
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return {
      mediaId: mediaDetails.mediaId,
      mediaUrl: publicUrlData?.publicUrl || null,
      mediaMimeType: mimeType,
      mediaFilename: cleanFilename,
      mediaSize: buffer.length,
      storagePath,
      error: null,
    };
  } catch (error) {
    console.error("downloadAndStoreWhatsAppMedia error:", error);

    return {
      ...baseResult,
      error: error instanceof Error ? error.message : "Media download failed",
    };
  }
}

async function sendWhatsAppText(to: string, text: string) {
  const accessToken = getAccessToken();
  const phoneNumberId = getPhoneNumberId();

  if (!accessToken) {
    throw new Error("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_TOKEN");
  }

  if (!phoneNumberId) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID");
  }

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: text,
        },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("WhatsApp send error:", data);

    const message =
      data?.error?.message ||
      data?.error?.code ||
      "Failed to send WhatsApp message";

    throw new Error(message);
  }

  return data;
}

async function saveSystemMessage({
  workspace,
  phone,
  content,
  error,
}: {
  workspace: Workspace;
  phone: string;
  content: string;
  error: unknown;
}) {
  const now = new Date().toISOString();

  const { error: insertError } = await supabaseAdmin
    .from("artipilot_messages")
    .insert({
      workspace_id: workspace.id,
      owner_user_id: workspace.owner_user_id,
      contact_phone: phone,
      whatsapp_message_id: null,
      role: "system",
      direction: "outbound",
      message_type: "system",
      content,
      raw_payload: {
        error: error instanceof Error ? error.message : String(error),
      },
      created_at: now,
    });

  if (insertError) {
    console.error("Error saving system message:", insertError);
  }
}

async function findExistingContact({
  workspace,
  phone,
}: {
  workspace: Workspace;
  phone: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_contacts")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", workspace.owner_user_id)
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("Existing contact lookup error:", error);
    return null;
  }

  return (data as ArtipilotContactRow | null) || null;
}

async function updateContactWithFallback({
  contactId,
  updateData,
  fallbackData,
}: {
  contactId: string;
  updateData: Record<string, unknown>;
  fallbackData: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_contacts")
    .update(updateData)
    .eq("id", contactId)
    .select("*")
    .single();

  if (!error) return data as ArtipilotContactRow;

  if (!hasColumnError(error)) {
    console.error("Error updating contact:", error);
    return null;
  }

  console.warn("Contact update fallback used:", error.message);

  const { data: fallbackResult, error: fallbackError } = await supabaseAdmin
    .from("artipilot_contacts")
    .update(fallbackData)
    .eq("id", contactId)
    .select("*")
    .single();

  if (fallbackError) {
    console.error("Fallback contact update error:", fallbackError);
    return null;
  }

  return fallbackResult as ArtipilotContactRow;
}

async function insertContactWithFallback({
  insertData,
  fallbackData,
}: {
  insertData: Record<string, unknown>;
  fallbackData: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_contacts")
    .insert(insertData)
    .select("*")
    .single();

  if (!error) return data as ArtipilotContactRow;

  if (!hasColumnError(error)) {
    console.error("Error inserting contact:", error);
    return null;
  }

  console.warn("Contact insert fallback used:", error.message);

  const { data: fallbackResult, error: fallbackError } = await supabaseAdmin
    .from("artipilot_contacts")
    .insert(fallbackData)
    .select("*")
    .single();

  if (fallbackError) {
    console.error("Fallback contact insert error:", fallbackError);
    return null;
  }

  return fallbackResult as ArtipilotContactRow;
}

async function createOrUpdateContact({
  workspace,
  phone,
  customerName,
  content,
  messageTime,
  needsHumanAttention,
  humanAttentionReason,
}: {
  workspace: Workspace;
  phone: string;
  customerName: string | null;
  content: string;
  messageTime: string;
  needsHumanAttention: boolean;
  humanAttentionReason: string;
}) {
  const existingContact = await findExistingContact({ workspace, phone });

  const nextUnreadCount = Number(existingContact?.unread_count || 0) + 1;
  const aiEnabled = existingContact?.ai_enabled === false ? false : true;

  if (existingContact?.id) {
    const fallbackData = {
      name: customerName || existingContact.name || null,
      last_message: content,
      last_message_at: messageTime,
      unread_count: nextUnreadCount,
      ai_enabled: aiEnabled,
    };

    const updateData = {
      ...fallbackData,
      needs_human_attention:
        existingContact.needs_human_attention || needsHumanAttention,
      human_attention_reason:
        humanAttentionReason || existingContact.human_attention_reason || null,
      conversation_status: existingContact.conversation_status || "open",
      is_blocked: existingContact.is_blocked || false,
      is_muted: existingContact.is_muted || false,
      muted_until: existingContact.muted_until || null,
      is_starred: existingContact.is_starred || false,
      profile_image_url: existingContact.profile_image_url || null,
    };

    return updateContactWithFallback({
      contactId: existingContact.id,
      updateData,
      fallbackData,
    });
  }

  const fallbackData = {
    workspace_id: workspace.id,
    owner_user_id: workspace.owner_user_id,
    phone,
    name: customerName,
    last_message: content,
    last_message_at: messageTime,
    unread_count: nextUnreadCount,
    ai_enabled: true,
  };

  const insertData = {
    ...fallbackData,
    needs_human_attention: needsHumanAttention,
    human_attention_reason: humanAttentionReason || null,
    conversation_status: "open",
    assigned_to: null,
    last_ai_summary: null,
    is_blocked: false,
    is_muted: false,
    muted_until: null,
    is_starred: false,
    customer_notes: null,
    profile_image_url: null,
  };

  return insertContactWithFallback({
    insertData,
    fallbackData,
  });
}

async function messageAlreadyExists(messageId?: string) {
  if (!messageId) return false;

  const { data, error } = await supabaseAdmin
    .from("artipilot_messages")
    .select("id")
    .eq("whatsapp_message_id", messageId)
    .maybeSingle();

  if (error) {
    console.error("Duplicate check error:", error);
    return false;
  }

  return Boolean(data?.id);
}

async function saveIncomingMessage({
  workspace,
  phone,
  message,
  messageType,
  content,
  messageTime,
  rawPayload,
  extras,
}: {
  workspace: Workspace;
  phone: string;
  message: WhatsAppMessage;
  messageType: string;
  content: string;
  messageTime: string;
  rawPayload: unknown;
  extras?: MessageExtras;
}) {
  const enrichedRawPayload = {
    original_webhook_payload: rawPayload,
    artipilot_extras: extras || {},
  };

  const fullPayload = {
    workspace_id: workspace.id,
    owner_user_id: workspace.owner_user_id,
    contact_phone: phone,
    whatsapp_message_id: message.id || null,
    role: "customer",
    direction: "inbound",
    message_type: messageType,
    content,
    raw_payload: enrichedRawPayload,
    delivery_status: "received",
    delivery_updated_at: messageTime,
    delivered_at: messageTime,
    read_at: null,
    media_id: extras?.media_id || null,
    media_url: extras?.media_url || null,
    media_mime_type: extras?.media_mime_type || null,
    media_filename: extras?.media_filename || null,
    media_size: extras?.media_size || null,
    media_storage_path: extras?.media_storage_path || null,
    latitude: extras?.latitude || null,
    longitude: extras?.longitude || null,
    location_name: extras?.location_name || null,
    location_address: extras?.location_address || null,
    link_url: extras?.link_url || null,
    created_at: messageTime,
  };

  const fallbackPayload = {
    workspace_id: workspace.id,
    owner_user_id: workspace.owner_user_id,
    contact_phone: phone,
    whatsapp_message_id: message.id || null,
    role: "customer",
    direction: "inbound",
    message_type: messageType,
    content,
    raw_payload: enrichedRawPayload,
    created_at: messageTime,
  };

  const { error } = await supabaseAdmin
    .from("artipilot_messages")
    .insert(fullPayload);

  if (!error) return true;

  if (!hasColumnError(error)) {
    console.error("Error saving incoming message:", error);
    return false;
  }

  console.warn("Incoming message fallback used:", error.message);

  const { error: fallbackError } = await supabaseAdmin
    .from("artipilot_messages")
    .insert(fallbackPayload);

  if (fallbackError) {
    console.error("Fallback error saving incoming message:", fallbackError);
    return false;
  }

  return true;
}

async function sendInboundCustomerPushNotification({
  workspace,
  phone,
  customerName,
  content,
}: {
  workspace: Workspace;
  phone: string;
  customerName: string | null;
  content: string;
}) {
  try {
    await sendCustomerMessagePushNotification({
      workspaceId: workspace.id,
      ownerUserId: workspace.owner_user_id,
      customerName,
      customerPhone: phone,
      messagePreview: content,
    });

    console.log("✅ Customer push notification sent:", {
      workspaceId: workspace.id,
      ownerUserId: workspace.owner_user_id,
      phone,
    });
  } catch (pushError) {
    console.error("Customer push notification failed:", pushError);
  }
}

async function getRecentMessages({
  workspace,
  phone,
}: {
  workspace: Workspace;
  phone: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_messages")
    .select("role, direction, content, created_at")
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", workspace.owner_user_id)
    .eq("contact_phone", phone)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Recent messages lookup error:", error);
    return [];
  }

  return (
    ((data || [])
      .reverse()
      .filter((message) => String(message.content || "").trim()) as ArtipilotChatMessage[]) ||
    []
  );
}

async function saveAiReply({
  workspace,
  phone,
  aiReply,
  whatsappData,
  role = "assistant",
}: {
  workspace: Workspace;
  phone: string;
  aiReply: string;
  whatsappData: unknown;
  role?: "assistant" | "system";
}) {
  const whatsappMessageId =
    (whatsappData as { messages?: { id?: string }[] })?.messages?.[0]?.id ||
    null;

  const now = new Date().toISOString();

  const fullPayload = {
    workspace_id: workspace.id,
    owner_user_id: workspace.owner_user_id,
    contact_phone: phone,
    whatsapp_message_id: whatsappMessageId,
    role,
    direction: "outbound",
    message_type: "text",
    content: aiReply,
    raw_payload: whatsappData,
    delivery_status: whatsappMessageId ? "sent" : "failed",
    delivery_updated_at: now,
    delivered_at: null,
    read_at: null,
    created_at: now,
  };

  const fallbackPayload = {
    workspace_id: workspace.id,
    owner_user_id: workspace.owner_user_id,
    contact_phone: phone,
    whatsapp_message_id: whatsappMessageId,
    role,
    direction: "outbound",
    message_type: "text",
    content: aiReply,
    raw_payload: whatsappData,
    created_at: now,
  };

  const { error: aiSaveError } = await supabaseAdmin
    .from("artipilot_messages")
    .insert(fullPayload);

  if (aiSaveError) {
    if (hasColumnError(aiSaveError)) {
      console.warn("AI reply save fallback used:", aiSaveError.message);

      const { error: fallbackAiSaveError } = await supabaseAdmin
        .from("artipilot_messages")
        .insert(fallbackPayload);

      if (fallbackAiSaveError) {
        console.error("Fallback error saving AI reply:", fallbackAiSaveError);
      }
    } else {
      console.error("Error saving AI reply:", aiSaveError);
    }
  }

  const { error: contactUpdateError } = await supabaseAdmin
    .from("artipilot_contacts")
    .update({
      last_message: aiReply,
      last_message_at: now,
    })
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", workspace.owner_user_id)
    .eq("phone", phone);

  if (contactUpdateError) {
    console.error("Error updating contact after AI reply:", contactUpdateError);
  }

  return whatsappMessageId;
}

async function markHumanAttention({
  workspace,
  phone,
  reason,
}: {
  workspace: Workspace;
  phone: string;
  reason: string;
}) {
  const fullUpdate = {
    needs_human_attention: true,
    human_attention_reason: reason,
    ai_enabled: false,
    conversation_status: "open",
  };

  const fallbackUpdate = {
    ai_enabled: false,
  };

  const { error } = await supabaseAdmin
    .from("artipilot_contacts")
    .update(fullUpdate)
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", workspace.owner_user_id)
    .eq("phone", phone);

  if (!error) return;

  if (!hasColumnError(error)) {
    console.error("Human attention update error:", error);
    return;
  }

  console.warn("Human attention fallback used:", error.message);

  const { error: fallbackError } = await supabaseAdmin
    .from("artipilot_contacts")
    .update(fallbackUpdate)
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", workspace.owner_user_id)
    .eq("phone", phone);

  if (fallbackError) {
    console.error("Human attention fallback update error:", fallbackError);
  }
}

async function updateWhatsAppStatus(status: WhatsAppStatus) {
  if (!status?.id) return;

  const timestamp = getTimestamp(status.timestamp);
  const deliveryStatus = status.status || "unknown";

  const updateData: Record<string, unknown> = {
    delivery_status: deliveryStatus,
    delivery_updated_at: timestamp,
  };

  if (deliveryStatus === "read") {
    updateData.read_at = timestamp;
  }

  if (deliveryStatus === "delivered") {
    updateData.delivered_at = timestamp;
  }

  if (deliveryStatus === "failed") {
    updateData.delivery_error = status.errors || null;
  }

  const { error } = await supabaseAdmin
    .from("artipilot_messages")
    .update(updateData)
    .eq("whatsapp_message_id", status.id);

  if (!error) return;

  if (!hasColumnError(error)) {
    console.error("WhatsApp status update error:", error);
    return;
  }

  console.warn(
    "WhatsApp status received, but delivery status columns do not exist yet:",
    {
      whatsappMessageId: status.id,
      status: deliveryStatus,
    }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = getVerifyToken();

  if (mode === "subscribe" && token === verifyToken && challenge) {
    console.log("✅ WhatsApp webhook verified successfully");

    return new NextResponse(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  console.error("❌ WhatsApp webhook verification failed", {
    mode,
    tokenReceived: token,
    hasChallenge: Boolean(challenge),
  });

  return NextResponse.json(
    {
      error: "Webhook verification failed",
      mode,
      tokenReceived: token,
      hasChallenge: Boolean(challenge),
    },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("📩 WhatsApp webhook POST received:", {
      hasEntry: Array.isArray(body?.entry),
      entryCount: Array.isArray(body?.entry) ? body.entry.length : 0,
    });

    const workspace = await getDefaultWorkspace();

    if (!workspace?.id || !workspace?.owner_user_id) {
      console.error("❌ No Artipilot workspace found for webhook saving.");

      return NextResponse.json(
        {
          success: false,
          error:
            "No workspace found. Create a workspace first or set ARTIPILOT_WORKSPACE_ID in Vercel.",
        },
        { status: 200 }
      );
    }

    const entries = body?.entry || [];

    for (const entry of entries) {
      const changes = entry?.changes || [];

      for (const change of changes) {
        const value = change?.value;

        const incomingMessages: WhatsAppMessage[] = value?.messages || [];
        const incomingContacts: WhatsAppContact[] = value?.contacts || [];
        const statuses: WhatsAppStatus[] = value?.statuses || [];

        console.log("📦 WhatsApp webhook change parsed:", {
          messages: incomingMessages.length,
          contacts: incomingContacts.length,
          statuses: statuses.length,
          phoneNumberId: value?.metadata?.phone_number_id || null,
        });

        if (statuses.length > 0) {
          for (const status of statuses) {
            await updateWhatsAppStatus(status);
          }

          if (incomingMessages.length === 0) {
            continue;
          }
        }

        for (const message of incomingMessages) {
          const contact = incomingContacts[0];
          const rawPhone = message.from || contact?.wa_id;

          if (!rawPhone) {
            console.log("Incoming message skipped because phone is missing.");
            continue;
          }

          const phone = normalizePhone(rawPhone);
          const customerName = contact?.profile?.name || null;
          const messageType = message.type || "unknown";
          const content = getMessageContent(message).trim();
          const messageTime = getTimestamp(message.timestamp);

          if (!content) {
            console.log("Incoming message skipped because content is empty.");
            continue;
          }

          const duplicate = await messageAlreadyExists(message.id);

          if (duplicate) {
            console.log("Duplicate WhatsApp message ignored:", message.id);
            continue;
          }

          const media = await downloadAndStoreWhatsAppMedia({
            workspace,
            phone,
            message,
          });

          const extras: MessageExtras = {
            media_id: media?.mediaId || null,
            media_url: media?.mediaUrl || null,
            media_mime_type: media?.mediaMimeType || null,
            media_filename: media?.mediaFilename || null,
            media_size: media?.mediaSize || null,
            media_storage_path: media?.storagePath || null,
            latitude:
              typeof message.location?.latitude === "number"
                ? message.location.latitude
                : null,
            longitude:
              typeof message.location?.longitude === "number"
                ? message.location.longitude
                : null,
            location_name: message.location?.name || null,
            location_address: message.location?.address || null,
            link_url: messageType === "text" ? getFirstLink(content) : null,
          };

          const ownerPrivacyQuestion = isOwnerPrivacyQuestion(content);
          const humanAttentionReason = ownerPrivacyQuestion
            ? ""
            : detectHumanAttentionReason(content);
          const needsHumanAttention = Boolean(humanAttentionReason);

          const savedContact = await createOrUpdateContact({
            workspace,
            phone,
            customerName,
            content,
            messageTime,
            needsHumanAttention,
            humanAttentionReason,
          });

          if (!savedContact) {
            console.error("Could not save or update contact. Skipping message.");
            continue;
          }

          if (
            savedContact.conversation_status === "blocked" ||
            savedContact.is_blocked === true
          ) {
            console.log("Blocked contact message will be saved without reply:", {
              phone,
            });

            const blockedIncomingSaved = await saveIncomingMessage({
              workspace,
              phone,
              message,
              messageType,
              content,
              messageTime,
              rawPayload: body,
              extras,
            });

            if (blockedIncomingSaved) {
              await sendInboundCustomerPushNotification({
                workspace,
                phone,
                customerName,
                content,
              });

              console.log("✅ Blocked contact inbound message saved:", {
                phone,
                messageType,
              });
            }

            continue;
          }

          const incomingSaved = await saveIncomingMessage({
            workspace,
            phone,
            message,
            messageType,
            content,
            messageTime,
            rawPayload: body,
            extras,
          });

          if (!incomingSaved) {
            console.error("Could not save incoming message. Skipping AI reply.");
            continue;
          }

          await sendInboundCustomerPushNotification({
            workspace,
            phone,
            customerName,
            content,
          });

          if (needsHumanAttention) {
            await markHumanAttention({
              workspace,
              phone,
              reason: humanAttentionReason,
            });

            console.log("🚨 Customer message triggered human attention:", {
              phone,
              reason: humanAttentionReason,
            });
          }

          if (savedContact.ai_enabled === false) {
            console.log("AI is disabled for this contact. Message saved only:", {
              phone,
            });
            continue;
          }

          if (ownerPrivacyQuestion) {
            try {
              const privacyReply = getOwnerPrivacyReply();
              const whatsappData = await sendWhatsAppText(phone, privacyReply);

              const whatsappMessageId = await saveAiReply({
                workspace,
                phone,
                aiReply: privacyReply,
                whatsappData,
              });

              console.log("✅ Owner privacy reply sent:", {
                phone,
                whatsappMessageId,
              });
            } catch (privacyError) {
              console.error("Owner privacy auto reply failed:", privacyError);

              await saveSystemMessage({
                workspace,
                phone,
                content:
                  privacyError instanceof Error
                    ? `Owner privacy reply failed: ${privacyError.message}`
                    : "Owner privacy reply failed.",
                error: privacyError,
              });
            }

            continue;
          }

          if (!shouldAiReply(messageType)) {
            console.log("Incoming message saved without AI reply:", messageType);
            continue;
          }

          try {
            const recentMessages = await getRecentMessages({
              workspace,
              phone,
            });

            const trainingKnowledge = await loadActiveTrainingContext(workspace.id);

            const aiReply = await generateArtipilotReply({
              businessName: workspace.business_name || "NEXA Rentals",
              businessType:
                workspace.business_type ||
                "125cc scooter rental business in Magaluf, Mallorca",
              mainLanguage: workspace.main_language || "English",
              aiJob:
                workspace.ai_job ||
                "You are Nero, the AI WhatsApp assistant for this business. Reply like a smart ChatGPT-style assistant, understand the customer's intention, remember the recent conversation, answer naturally, collect booking details step by step, and pass unclear or important cases to the team.",
              businessRules:
                workspace.business_rules ||
                "Be short, friendly and professional. Follow business rules exactly. Never invent prices, availability, licence rules, opening hours, deposits, policies, or final confirmations. If something is unclear, licence-sensitive, complaint-related, damage-related, refund-related, or needs team approval, politely pass the chat to the human team.",
              trainingKnowledge,
              customerName: savedContact.name || customerName,
              customerPhone: phone,
              customerMessage: content,
              recentMessages,
            });

            const cleanAiReply = aiReply.trim();

            if (!cleanAiReply) {
              console.log("AI reply was empty. Skipping send.");
              continue;
            }

            const whatsappData = await sendWhatsAppText(phone, cleanAiReply);

            const whatsappMessageId = await saveAiReply({
              workspace,
              phone,
              aiReply: cleanAiReply,
              whatsappData,
            });

            if (shouldMarkHumanAttentionFromText(cleanAiReply)) {
              await markHumanAttention({
                workspace,
                phone,
                reason:
                  "AI reply indicated that the team/human should confirm or continue this conversation.",
              });

              console.log("🚨 AI reply triggered human attention:", {
                phone,
                reason:
                  "AI reply indicated that the team/human should confirm or continue this conversation.",
              });
            }

            console.log("✅ AI WhatsApp reply sent successfully:", {
              phone,
              whatsappMessageId,
            });
          } catch (aiError) {
            console.error("AI auto reply failed:", aiError);

            await saveSystemMessage({
              workspace,
              phone,
              content:
                aiError instanceof Error
                  ? `AI reply failed: ${aiError.message}`
                  : "AI reply failed. Check OPENAI_API_KEY, OPENAI_MODEL, WHATSAPP_ACCESS_TOKEN/WHATSAPP_TOKEN, and WHATSAPP_PHONE_NUMBER_ID.",
              error: aiError,
            });
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("WhatsApp webhook POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Webhook handler failed",
      },
      { status: 500 }
    );
  }
}