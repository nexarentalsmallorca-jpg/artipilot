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
    return JSON.stringify(error);
  } catch {
    return fallback;
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
      messages: messages || [],
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

    if (!contact.phone) {
      return {
        error: "This contact has no phone number saved.",
      };
    }

    const sendResult = await sendWhatsAppText(contact.phone, text);

    if (!sendResult.ok) {
      console.error("WhatsApp send failed:", sendResult);

      return {
        error:
          sendResult.error ||
          "WhatsApp failed to send this message. Check Meta token, phone number ID, and 24-hour reply window.",
      };
    }

    let savedMessage: ApiMessage | undefined;

    try {
      savedMessage = await insertOutboundMessage({
        contactId: contact.id,
        phone: contact.phone,
        body: text,
        senderType: "admin",
        status: "sent",
        whatsappMessageId: sendResult.messageId || null,
      });

      if (savedMessage?.id) {
        savedMessage = await updateOutboundMessage(savedMessage.id, {
          status: "sent",
          status_error: null,
          whatsapp_message_id: sendResult.messageId || null,
        });
      }

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
        items: primary.data.map((row) => ({
          id: String(row.id),
          title: String(row.title || "Quick reply"),
          content: String(row.content || ""),
        })),
      };
    }

    const fallback = await db
      .from("quick_replies")
      .select("id,title,content,active,created_at")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (fallback.error || !fallback.data) {
      return {
        items: [],
      };
    }

    return {
      items: fallback.data.map((row) => ({
        id: String(row.id),
        title: String(row.title || "Quick reply"),
        content: String(row.content || ""),
      })),
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

    const messages = await listMessagesForContact(cleanContactId);

    const lastInboundMessage = [...messages]
      .reverse()
      .find((message) => message.direction === "inbound" && message.body);

    if (!lastInboundMessage?.body) {
      return {
        error: "No customer message found to reply to.",
      };
    }

    const recentMessages = messages
      .filter((message) => message.body)
      .slice(-20)
      .map((message) => ({
        role:
          message.direction === "inbound"
            ? ("user" as const)
            : ("assistant" as const),
        content: String(message.body || ""),
      }));

    const suggestion = await generateAiReply({
      customerMessage: String(lastInboundMessage.body),
      recentMessages,
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