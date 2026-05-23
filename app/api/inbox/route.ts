import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
};

type ContactRow = {
  id: string;
  workspace_id: string | null;
  owner_user_id: string | null;
  phone: string;
  name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  ai_enabled: boolean | null;
  created_at?: string | null;

  needs_human_attention?: boolean | null;
  human_attention_reason?: string | null;
  conversation_status?: "open" | "closed" | "snoozed" | "blocked" | string | null;
  assigned_to?: string | null;
  last_ai_summary?: string | null;

  is_blocked?: boolean | null;
  is_muted?: boolean | null;
  muted_until?: string | null;
  is_starred?: boolean | null;
  customer_notes?: string | null;
  profile_image_url?: string | null;
};

type MessageRow = {
  id: string;
  workspace_id: string | null;
  owner_user_id: string | null;
  contact_phone: string;
  whatsapp_message_id: string | null;
  role: "customer" | "assistant" | "manual" | "system";
  direction: "inbound" | "outbound";
  message_type: string | null;
  content: string | null;
  created_at: string;
  raw_payload?: unknown;

  delivery_status?:
    | "received"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | string
    | null;
  delivered_at?: string | null;
  read_at?: string | null;
  delivery_updated_at?: string | null;
  delivery_error?: unknown;

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

  translated_text?: string | null;
  translated_language?: string | null;
  deleted_for_everyone?: boolean | null;
  hidden_for_user_ids?: string[] | null;
};

type InboxStats = {
  total_contacts: number;
  total_unread: number;
  needs_human_attention: number;
  ai_on: number;
  manual: number;
  open: number;
  closed: number;
  blocked: number;
  muted: number;
  starred: number;
  media_messages: number;
  location_messages: number;
  document_messages: number;
};

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function hasColumnError(error: unknown) {
  const errorLike = error as SupabaseErrorLike;

  const message = String(
    errorLike?.message || errorLike?.details || errorLike?.hint || ""
  ).toLowerCase();

  return (
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("does not exist")
  );
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function getEmptyStats(): InboxStats {
  return {
    total_contacts: 0,
    total_unread: 0,
    needs_human_attention: 0,
    ai_on: 0,
    manual: 0,
    open: 0,
    closed: 0,
    blocked: 0,
    muted: 0,
    starred: 0,
    media_messages: 0,
    location_messages: 0,
    document_messages: 0,
  };
}

function getFirstLink(text: string) {
  const match = String(text || "").match(/https?:\/\/[^\s]+/i);
  return match?.[0] || null;
}

function safeRawPayloadObject(rawPayload: unknown) {
  if (!rawPayload || typeof rawPayload !== "object") return null;
  return rawPayload as Record<string, unknown>;
}

function getNestedExtras(rawPayload: unknown) {
  const payload = safeRawPayloadObject(rawPayload);
  const extras = payload?.artipilot_extras;

  if (!extras || typeof extras !== "object") return null;

  return extras as Record<string, unknown>;
}

function stringFromUnknown(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("Inbox auth error:", error);
    return null;
  }

  return user;
}

async function getWorkspaceForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select("id, owner_user_id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Inbox workspace error:", error);
    return null;
  }

  return (data as WorkspaceRow | null) || null;
}

async function attachOldRowsToWorkspace({
  workspace,
  userId,
}: {
  workspace: WorkspaceRow;
  userId: string;
}) {
  const { error: contactsError } = await supabaseAdmin
    .from("artipilot_contacts")
    .update({
      workspace_id: workspace.id,
      owner_user_id: userId,
    })
    .is("workspace_id", null);

  if (contactsError) {
    console.error("Attach old contacts error:", contactsError);
  }

  const { error: messagesError } = await supabaseAdmin
    .from("artipilot_messages")
    .update({
      workspace_id: workspace.id,
      owner_user_id: userId,
    })
    .is("workspace_id", null);

  if (messagesError) {
    console.error("Attach old messages error:", messagesError);
  }
}

function isMutedNow(contact: ContactRow) {
  if (contact.is_muted === true) {
    if (!contact.muted_until) return true;

    const mutedUntilTime = new Date(contact.muted_until).getTime();

    return Number.isFinite(mutedUntilTime) && mutedUntilTime > Date.now();
  }

  if (!contact.muted_until) return false;

  const mutedUntilTime = new Date(contact.muted_until).getTime();

  return Number.isFinite(mutedUntilTime) && mutedUntilTime > Date.now();
}

function normalizeContact(contact: ContactRow): ContactRow {
  const cleanPhone = normalizePhone(contact.phone);
  const status = contact.conversation_status || "open";
  const blocked = contact.is_blocked === true || status === "blocked";
  const muted = isMutedNow(contact);

  return {
    ...contact,
    phone: cleanPhone || contact.phone,
    unread_count: Number(contact.unread_count || 0),
    ai_enabled: contact.ai_enabled === false ? false : true,

    needs_human_attention: contact.needs_human_attention === true,
    human_attention_reason: contact.human_attention_reason || null,
    conversation_status: blocked ? "blocked" : status,
    assigned_to: contact.assigned_to || null,
    last_ai_summary: contact.last_ai_summary || null,

    is_blocked: blocked,
    is_muted: muted,
    muted_until: contact.muted_until || null,
    is_starred: contact.is_starred === true,
    customer_notes: contact.customer_notes || null,
    profile_image_url: contact.profile_image_url || null,
  };
}

function normalizeMessage(message: MessageRow): MessageRow {
  let deliveryStatus = message.delivery_status || null;

  if (!deliveryStatus) {
    deliveryStatus = message.direction === "inbound" ? "received" : "sent";
  }

  const extras = getNestedExtras(message.raw_payload);

  const mediaId =
    message.media_id || stringFromUnknown(extras?.media_id) || null;
  const mediaUrl =
    message.media_url || stringFromUnknown(extras?.media_url) || null;
  const mediaMimeType =
    message.media_mime_type ||
    stringFromUnknown(extras?.media_mime_type) ||
    null;
  const mediaFilename =
    message.media_filename ||
    stringFromUnknown(extras?.media_filename) ||
    null;
  const mediaSize =
    typeof message.media_size === "number"
      ? message.media_size
      : numberFromUnknown(extras?.media_size);
  const mediaStoragePath =
    message.media_storage_path ||
    stringFromUnknown(extras?.media_storage_path) ||
    null;

  const latitude =
    typeof message.latitude === "number"
      ? message.latitude
      : numberFromUnknown(extras?.latitude);

  const longitude =
    typeof message.longitude === "number"
      ? message.longitude
      : numberFromUnknown(extras?.longitude);

  const locationName =
    message.location_name || stringFromUnknown(extras?.location_name) || null;

  const locationAddress =
    message.location_address ||
    stringFromUnknown(extras?.location_address) ||
    null;

  const linkUrl =
    message.link_url ||
    stringFromUnknown(extras?.link_url) ||
    getFirstLink(message.content || "");

  const deletedForEveryone =
    message.deleted_for_everyone === true ||
    extras?.deleted_for_everyone === true;

  const hiddenForUserIds = Array.isArray(message.hidden_for_user_ids)
    ? message.hidden_for_user_ids
    : Array.isArray(extras?.hidden_for_user_ids)
      ? (extras.hidden_for_user_ids as string[])
      : [];

  return {
    ...message,
    contact_phone: normalizePhone(message.contact_phone) || message.contact_phone,
    message_type: message.message_type || "text",
    delivery_status: deliveryStatus,
    delivered_at: message.delivered_at || null,
    read_at: message.read_at || null,
    delivery_updated_at: message.delivery_updated_at || null,
    delivery_error: message.delivery_error || null,

    media_id: mediaId,
    media_url: mediaUrl,
    media_mime_type: mediaMimeType,
    media_filename: mediaFilename,
    media_size: mediaSize,
    media_storage_path: mediaStoragePath,

    latitude,
    longitude,
    location_name: locationName,
    location_address: locationAddress,

    link_url: linkUrl,

    translated_text: message.translated_text || null,
    translated_language: message.translated_language || null,
    deleted_for_everyone: deletedForEveryone,
    hidden_for_user_ids: hiddenForUserIds,
    content: deletedForEveryone
      ? "This message was deleted."
      : message.content || "",
  };
}

function filterMessagesForUser(messages: MessageRow[], userId: string) {
  return messages.filter((message) => {
    const hidden = message.hidden_for_user_ids || [];
    return !hidden.includes(userId);
  });
}

function sortContactsForInbox(contacts: ContactRow[]) {
  return [...contacts].sort((a, b) => {
    const aBlocked = a.is_blocked === true || a.conversation_status === "blocked";
    const bBlocked = b.is_blocked === true || b.conversation_status === "blocked";

    if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;

    const aHuman = a.needs_human_attention === true ? 1 : 0;
    const bHuman = b.needs_human_attention === true ? 1 : 0;

    if (aHuman !== bHuman) return bHuman - aHuman;

    const aUnread = Number(a.unread_count || 0) > 0 ? 1 : 0;
    const bUnread = Number(b.unread_count || 0) > 0 ? 1 : 0;

    if (aUnread !== bUnread) return bUnread - aUnread;

    const aStarred = a.is_starred === true ? 1 : 0;
    const bStarred = b.is_starred === true ? 1 : 0;

    if (aStarred !== bStarred) return bStarred - aStarred;

    const aTime = a.last_message_at
      ? new Date(a.last_message_at).getTime()
      : a.created_at
        ? new Date(a.created_at).getTime()
        : 0;

    const bTime = b.last_message_at
      ? new Date(b.last_message_at).getTime()
      : b.created_at
        ? new Date(b.created_at).getTime()
        : 0;

    return bTime - aTime;
  });
}

async function loadContacts({
  workspace,
  userId,
}: {
  workspace: WorkspaceRow;
  userId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_contacts")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .order("needs_human_attention", {
      ascending: false,
      nullsFirst: false,
    })
    .order("unread_count", {
      ascending: false,
      nullsFirst: false,
    })
    .order("last_message_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (!error) {
    const normalized = ((data || []) as ContactRow[]).map(normalizeContact);
    return sortContactsForInbox(normalized);
  }

  if (!hasColumnError(error)) {
    console.error("Inbox contacts error:", error);
    throw new Error(error.message || "Failed to load contacts");
  }

  console.warn("Inbox contacts fallback used:", error.message);

  const { data: fallbackData, error: fallbackError } = await supabaseAdmin
    .from("artipilot_contacts")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .order("last_message_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (fallbackError) {
    console.error("Inbox contacts fallback error:", fallbackError);
    throw new Error(fallbackError.message || "Failed to load contacts");
  }

  const normalized = ((fallbackData || []) as ContactRow[]).map(
    normalizeContact
  );

  return sortContactsForInbox(normalized);
}

async function loadMessages({
  workspace,
  userId,
}: {
  workspace: WorkspaceRow;
  userId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_messages")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });

  if (!error) {
    return ((data || []) as MessageRow[]).map(normalizeMessage);
  }

  if (!hasColumnError(error)) {
    console.error("Inbox messages error:", error);
    throw new Error(error.message || "Failed to load messages");
  }

  console.warn("Inbox messages fallback used:", error.message);

  const { data: fallbackData, error: fallbackError } = await supabaseAdmin
    .from("artipilot_messages")
    .select(
      "id, workspace_id, owner_user_id, contact_phone, whatsapp_message_id, role, direction, message_type, content, raw_payload, created_at"
    )
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });

  if (fallbackError) {
    console.error("Inbox messages fallback error:", fallbackError);
    throw new Error(fallbackError.message || "Failed to load messages");
  }

  return ((fallbackData || []) as MessageRow[]).map(normalizeMessage);
}

function buildStats(contacts: ContactRow[], messages: MessageRow[]): InboxStats {
  const totalUnread = contacts.reduce(
    (total, contact) => total + Number(contact.unread_count || 0),
    0
  );

  const needsHumanAttention = contacts.filter(
    (contact) => contact.needs_human_attention === true
  ).length;

  const aiOn = contacts.filter((contact) => contact.ai_enabled !== false).length;

  const manual = contacts.filter(
    (contact) => contact.ai_enabled === false
  ).length;

  const open = contacts.filter(
    (contact) => (contact.conversation_status || "open") === "open"
  ).length;

  const closed = contacts.filter(
    (contact) => contact.conversation_status === "closed"
  ).length;

  const blocked = contacts.filter(
    (contact) =>
      contact.conversation_status === "blocked" || contact.is_blocked === true
  ).length;

  const muted = contacts.filter((contact) => isMutedNow(contact)).length;

  const starred = contacts.filter(
    (contact) => contact.is_starred === true
  ).length;

  const mediaMessages = messages.filter(
    (message) =>
      Boolean(message.media_url) ||
      ["image", "video", "audio", "document", "sticker"].includes(
        message.message_type || ""
      )
  ).length;

  const locationMessages = messages.filter(
    (message) =>
      message.message_type === "location" ||
      (typeof message.latitude === "number" &&
        typeof message.longitude === "number")
  ).length;

  const documentMessages = messages.filter(
    (message) => message.message_type === "document"
  ).length;

  return {
    total_contacts: contacts.length,
    total_unread: totalUnread,
    needs_human_attention: needsHumanAttention,
    ai_on: aiOn,
    manual,
    open,
    closed,
    blocked,
    muted,
    starred,
    media_messages: mediaMessages,
    location_messages: locationMessages,
    document_messages: documentMessages,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const workspace = await getWorkspaceForUser(user.id);

    if (!workspace?.id) {
      return NextResponse.json(
        {
          contacts: [],
          messages: [],
          stats: getEmptyStats(),
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    await attachOldRowsToWorkspace({
      workspace,
      userId: user.id,
    });

    const [contacts, rawMessages] = await Promise.all([
      loadContacts({
        workspace,
        userId: user.id,
      }),
      loadMessages({
        workspace,
        userId: user.id,
      }),
    ]);

    const messages = filterMessagesForUser(rawMessages, user.id);

    return NextResponse.json(
      {
        contacts,
        messages,
        stats: buildStats(contacts, messages),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Inbox API error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Inbox API failed",
      },
      { status: 500 }
    );
  }
}