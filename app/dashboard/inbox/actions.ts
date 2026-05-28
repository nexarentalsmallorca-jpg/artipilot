"use server";

import { assertPrivateSessionServer } from "@/lib/auth/server-session";
import {
  getContactById,
  insertOutboundMessage,
  listContacts,
  listMessagesForContact,
  markContactRead,
  touchContactLastMessage,
  updateContactAi,
  updateOutboundMessage,
  type ApiContact,
  type ApiMessage,
} from "@/lib/db/private-inbox";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { isWhatsAppConfigured, sendWhatsAppText } from "@/lib/whatsapp/send";

type QuickReply = {
  id: string;
  title: string;
  content: string;
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type MessageLike = ApiMessage & {
  body?: string | null;
  content?: string | null;
  message_type?: string | null;
  media_id?: string | null;
  media_url?: string | null;
  media_filename?: string | null;
  filename?: string | null;
  mime_type?: string | null;
  detected_language?: string | null;
  english_translation?: string | null;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function getErrorMessage(error: unknown, fallback: string) {
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
    // Ignore JSON stringify errors.
  }

  return fallback;
}

function sortMessagesByTime(messages: ApiMessage[]) {
  return [...messages].sort((a, b) => {
    const first = new Date(a.created_at).getTime();
    const second = new Date(b.created_at).getTime();

    if (Number.isNaN(first) || Number.isNaN(second)) {
      return 0;
    }

    return first - second;
  });
}

function normalizePhoneForDisplay(phone: string | null | undefined) {
  return cleanString(phone).replace(/\s+/g, "");
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

function getMessageText(message: ApiMessage | MessageLike) {
  const item = message as MessageLike;

  return cleanString(item.body || item.content);
}

function getMessageType(message: ApiMessage | MessageLike) {
  const item = message as MessageLike;
  return cleanString(item.message_type || "text").toLowerCase();
}

function getMessageFilename(message: ApiMessage | MessageLike) {
  const item = message as MessageLike;
  return cleanString(item.media_filename || item.filename);
}

function getMessageMimeType(message: ApiMessage | MessageLike) {
  const item = message as MessageLike;
  return cleanString(item.mime_type);
}

function looksLikeDocumentOrLicenceText(value: string) {
  const text = cleanString(value).toLowerCase();

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

function buildAiContentFromMessage(message: ApiMessage | MessageLike) {
  const text = getMessageText(message);
  const messageType = getMessageType(message);
  const filename = getMessageFilename(message);
  const mimeType = getMessageMimeType(message);

  if (!messageType || messageType === "text") {
    return text;
  }

  const combined = [text, filename, mimeType].filter(Boolean).join(" ");
  const mightBeLicenceOrId = looksLikeDocumentOrLicenceText(combined);

  if (messageType === "image") {
    if (mightBeLicenceOrId) {
      return [
        "Customer sent an image that may be a driving licence, ID, passport, or rental document.",
        text ? `Customer caption/message: ${text}` : "",
        "Important: do not approve or reject the document yourself. Say the image will be forwarded to the team so they can check and confirm it. Remind the customer to bring the original driving licence and ID/passport at pickup.",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return [
      "Customer sent an image/photo.",
      text ? `Customer caption/message: ${text}` : "",
      "Reply naturally. If it appears to be a licence, ID, passport, or document, say the team will check it. If unclear, acknowledge it and ask how you can help.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (messageType === "document") {
    if (mightBeLicenceOrId) {
      return [
        "Customer sent a document that may be a driving licence, ID, passport, or rental document.",
        filename ? `Filename: ${filename}` : "",
        text ? `Customer caption/message: ${text}` : "",
        "Important: do not approve or reject the document yourself. Say the document will be forwarded to the team so they can check and confirm it. Remind the customer to bring the original driving licence and ID/passport at pickup.",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return [
      "Customer sent a document/file.",
      filename ? `Filename: ${filename}` : "",
      text ? `Customer caption/message: ${text}` : "",
      "Reply naturally. If it is for licence/ID verification, say the team will check and confirm it.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (messageType === "video") {
    return [
      "Customer sent a video.",
      text ? `Customer caption/message: ${text}` : "",
      "Reply naturally and politely. If it is about an active rental problem, accident, damage, or mechanical issue, prioritise safety and urgent support according to the NEXA rules.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (messageType === "audio") {
    return "Customer sent an audio/voice message. Politely ask them to type the main details so you can help accurately with booking, licence, price, or rental support.";
  }

  if (messageType === "location") {
    return [
      "Customer shared a location.",
      text ? `Location/message: ${text}` : "",
      "Reply naturally and ask what they need help with. Do not promise delivery or pickup at that location unless the team has confirmed it.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return text || `Customer sent a ${messageType} message. Reply politely and ask how you can help.`;
}

function buildRecentMessagesForAi(messages: ApiMessage[]): ChatTurn[] {
  return messages
    .map((message) => {
      const content = buildAiContentFromMessage(message);

      if (!cleanString(content)) {
        return null;
      }

      return {
        role:
          message.direction === "inbound"
            ? ("user" as const)
            : ("assistant" as const),
        content,
      };
    })
    .filter((item): item is ChatTurn => Boolean(item))
    .slice(-24);
}

function getLastInboundMessageForAi(messages: ApiMessage[]) {
  return [...messages]
    .reverse()
    .find((message) => message.direction === "inbound");
}

function shouldUseFirstChatIntro(messages: ApiMessage[]) {
  const inboundCount = messages.filter(
    (message) => message.direction === "inbound"
  ).length;

  const outboundCount = messages.filter(
    (message) => message.direction === "outbound"
  ).length;

  return inboundCount <= 1 && outboundCount === 0;
}

async function updateContactFields(
  contactId: string,
  updates: Record<string, unknown>
): Promise<{ contact?: ApiContact; error?: string }> {
  try {
    await assertPrivateSessionServer();

    const cleanContactId = cleanString(contactId);

    if (!cleanContactId) {
      return {
        error: "Contact ID is required.",
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        error: "Supabase is not configured.",
      };
    }

    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from("artipilot_contacts")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cleanContactId)
      .select("*")
      .single<ApiContact>();

    if (error) {
      throw error;
    }

    return {
      contact: data,
    };
  } catch (error) {
    console.error("updateContactFields error:", error);

    return {
      error: getErrorMessage(error, "Could not update contact."),
    };
  }
}

export async function fetchContactsAction(): Promise<{
  contacts: ApiContact[];
  error?: string;
}> {
  try {
    await assertPrivateSessionServer();

    if (!isSupabaseConfigured()) {
      return {
        contacts: [],
        error: "Supabase is not configured.",
      };
    }

    const contacts = await listContacts();

    return {
      contacts: contacts || [],
    };
  } catch (error) {
    console.error("fetchContactsAction error:", error);

    return {
      contacts: [],
      error: getErrorMessage(error, "Failed to load contacts."),
    };
  }
}

export async function fetchMessagesAction(contactId: string): Promise<{
  messages: ApiMessage[];
  error?: string;
}> {
  try {
    await assertPrivateSessionServer();

    const cleanContactId = cleanString(contactId);

    if (!cleanContactId) {
      return {
        messages: [],
        error: "Contact ID is required.",
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        messages: [],
        error: "Supabase is not configured.",
      };
    }

    const messages = await listMessagesForContact(cleanContactId);

    try {
      await markContactRead(cleanContactId);
    } catch (markReadError) {
      console.error("markContactRead error:", markReadError);
    }

    return {
      messages: sortMessagesByTime(messages || []),
    };
  } catch (error) {
    console.error("fetchMessagesAction error:", error);

    return {
      messages: [],
      error: getErrorMessage(error, "Failed to load messages."),
    };
  }
}

export async function sendMessageAction(
  contactId: string,
  body: string
): Promise<{ message?: ApiMessage; error?: string }> {
  try {
    await assertPrivateSessionServer();

    const cleanContactId = cleanString(contactId);
    const text = cleanString(body);

    if (!cleanContactId) {
      return {
        error: "Contact ID is required.",
      };
    }

    if (!text) {
      return {
        error: "Message body is required.",
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        error: "Supabase is not configured.",
      };
    }

    if (!isWhatsAppConfigured()) {
      return {
        error:
          "WhatsApp sender is not configured. Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Vercel.",
      };
    }

    const contact = await getContactById(cleanContactId);

    if (!contact?.id) {
      return {
        error: "Contact was not found.",
      };
    }

    const phone = normalizePhoneForDisplay(contact.phone);

    if (!phone) {
      return {
        error: "This contact has no phone number saved.",
      };
    }

    const pendingMessage = await insertOutboundMessage({
      contactId: contact.id,
      phone,
      body: text,
      senderType: "admin",
      status: "pending",
      whatsappMessageId: null,
      statusError: null,
      messageType: "text",
      mediaId: null,
      mediaUrl: null,
    });

    const sendResult = await sendWhatsAppText(phone, text);

    if (!sendResult.ok) {
      console.error("WhatsApp send failed:", sendResult);

      try {
        await updateOutboundMessage(pendingMessage.id, {
          status: "failed",
          delivery_status: "failed",
          status_error:
            sendResult.error ||
            "WhatsApp failed to send this message. Check Meta settings.",
          delivery_error:
            sendResult.error ||
            "WhatsApp failed to send this message. Check Meta settings.",
          whatsapp_message_id: null,
          message_type: "text",
          media_id: null,
          media_url: null,
        });
      } catch (databaseError) {
        console.error(
          "Failed to mark outbound message as failed:",
          databaseError
        );
      }

      return {
        error:
          sendResult.error ||
          "WhatsApp failed to send this message. Check Meta token, phone number ID, and 24-hour reply window.",
      };
    }

    let savedMessage: ApiMessage | undefined;

    try {
      savedMessage = await updateOutboundMessage(pendingMessage.id, {
        status: "sent",
        delivery_status: "sent",
        status_error: null,
        delivery_error: null,
        whatsapp_message_id: sendResult.messageId || null,
        message_type: "text",
        media_id: null,
        media_url: null,
      });

      await touchContactLastMessage(contact.id, text);
    } catch (databaseError) {
      console.error("WhatsApp sent but database save failed:", databaseError);

      return {
        error:
          "WhatsApp message was sent, but Supabase failed to save it: " +
          getErrorMessage(databaseError, "Unknown database error."),
      };
    }

    return {
      message: savedMessage,
    };
  } catch (error) {
    console.error("sendMessageAction error:", error);

    return {
      error: getErrorMessage(error, "Send failed."),
    };
  }
}

export async function toggleAiAction(
  contactId: string,
  aiEnabled: boolean
): Promise<{ contact?: ApiContact; error?: string }> {
  try {
    await assertPrivateSessionServer();

    const cleanContactId = cleanString(contactId);

    if (!cleanContactId) {
      return {
        error: "Contact ID is required.",
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        error: "Supabase is not configured.",
      };
    }

    const contact = await updateContactAi(cleanContactId, Boolean(aiEnabled));

    return {
      contact,
    };
  } catch (error) {
    console.error("toggleAiAction error:", error);

    return {
      error: getErrorMessage(error, "Could not update AI status."),
    };
  }
}

export async function setNeedsHumanAttentionAction(
  contactId: string,
  needsHumanAttention: boolean
): Promise<{ contact?: ApiContact; error?: string }> {
  return updateContactFields(contactId, {
    needs_human_attention: Boolean(needsHumanAttention),
  });
}

export async function blockContactAction(
  contactId: string,
  blocked: boolean
): Promise<{ contact?: ApiContact; error?: string }> {
  return updateContactFields(contactId, {
    blocked: Boolean(blocked),
    ai_enabled: blocked ? false : undefined,
  });
}

export async function deleteMessageAction(
  messageId: string
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await assertPrivateSessionServer();

    const cleanMessageId = cleanString(messageId);

    if (!cleanMessageId) {
      return {
        error: "Message ID is required.",
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        error: "Supabase is not configured.",
      };
    }

    const db = getSupabaseAdmin();

    const { error } = await db
      .from("artipilot_messages")
      .delete()
      .eq("id", cleanMessageId);

    if (error) {
      throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.error("deleteMessageAction error:", error);

    return {
      error: getErrorMessage(error, "Could not delete message."),
    };
  }
}

export async function deleteChatAction(
  contactId: string
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await assertPrivateSessionServer();

    const cleanContactId = cleanString(contactId);

    if (!cleanContactId) {
      return {
        error: "Contact ID is required.",
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        error: "Supabase is not configured.",
      };
    }

    const contact = await getContactById(cleanContactId);

    if (!contact?.id) {
      return {
        error: "Contact was not found.",
      };
    }

    const db = getSupabaseAdmin();

    const { error: messagesError } = await db
      .from("artipilot_messages")
      .delete()
      .eq("contact_id", cleanContactId);

    if (messagesError && !isSchemaError(messagesError)) {
      throw messagesError;
    }

    if (messagesError && isSchemaError(messagesError)) {
      const phone = normalizePhoneForDisplay(contact.phone);

      const fallback = await db
        .from("artipilot_messages")
        .delete()
        .eq("contact_phone", phone);

      if (fallback.error) {
        throw fallback.error;
      }
    }

    const { error: contactError } = await db
      .from("artipilot_contacts")
      .update({
        last_message: null,
        last_message_at: null,
        unread_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cleanContactId);

    if (contactError) {
      throw contactError;
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.error("deleteChatAction error:", error);

    return {
      error: getErrorMessage(error, "Could not delete chat."),
    };
  }
}

export async function fetchQuickRepliesAction(): Promise<{
  items: QuickReply[];
}> {
  try {
    await assertPrivateSessionServer();

    if (!isSupabaseConfigured()) {
      return {
        items: [],
      };
    }

    const db = getSupabaseAdmin();

    const primary = await db
      .from("artipilot_quick_replies")
      .select("id,title,content,active,created_at")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (!primary.error && primary.data) {
      return {
        items: primary.data
          .map((row) => ({
            id: String(row.id),
            title: String(row.title || "Quick reply"),
            content: String(row.content || ""),
          }))
          .filter((item) => item.content.trim()),
      };
    }

    if (primary.error && !isSchemaError(primary.error)) {
      console.error("Primary quick replies error:", primary.error);
    }

    const fallback = await db
      .from("quick_replies")
      .select("id,title,content,active,created_at")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (fallback.error || !fallback.data) {
      if (fallback.error && !isSchemaError(fallback.error)) {
        console.error("Fallback quick replies error:", fallback.error);
      }

      return {
        items: [],
      };
    }

    return {
      items: fallback.data
        .map((row) => ({
          id: String(row.id),
          title: String(row.title || "Quick reply"),
          content: String(row.content || ""),
        }))
        .filter((item) => item.content.trim()),
    };
  } catch (error) {
    console.error("fetchQuickRepliesAction error:", error);

    return {
      items: [],
    };
  }
}

export async function suggestAiAction(contactId: string): Promise<{
  suggestion?: string;
  error?: string;
}> {
  try {
    await assertPrivateSessionServer();

    const cleanContactId = cleanString(contactId);

    if (!cleanContactId) {
      return {
        error: "Contact ID is required.",
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        error: "Supabase is not configured.",
      };
    }

    const { generateAiReply, isOpenAiConfigured } = await import(
      "@/lib/ai/generateReply"
    );

    if (!isOpenAiConfigured()) {
      return {
        error: "OpenAI is not configured.",
      };
    }

    const messages = sortMessagesByTime(
      await listMessagesForContact(cleanContactId)
    );

    const lastInboundMessage = getLastInboundMessageForAi(messages);

    if (!lastInboundMessage) {
      return {
        error: "No customer message found to reply to.",
      };
    }

    const customerMessage = buildAiContentFromMessage(lastInboundMessage);
    const recentMessages = buildRecentMessagesForAi(messages);
    const isFirstCustomerChat = shouldUseFirstChatIntro(messages);

    if (!cleanString(customerMessage)) {
      return {
        error: "No customer message content found to reply to.",
      };
    }

    const suggestion = await generateAiReply({
      customerMessage,
      recentMessages,
      isFirstCustomerChat,
      humanHandback: false,
    });

    const cleanSuggestion = cleanString(suggestion);

    if (!cleanSuggestion) {
      return {
        error: "AI returned an empty reply.",
      };
    }

    return {
      suggestion: cleanSuggestion,
    };
  } catch (error) {
    console.error("suggestAiAction error:", error);

    return {
      error: getErrorMessage(error, "AI suggestion failed."),
    };
  }
}