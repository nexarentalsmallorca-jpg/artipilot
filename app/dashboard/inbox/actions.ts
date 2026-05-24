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
  return error instanceof Error ? error.message : fallback;
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
          "WhatsApp sender is not configured. Check your Vercel environment variables.",
      };
    }

    const contact = await getContactById(cleanContactId);

    if (!contact?.id || !contact.phone) {
      return {
        error: "Contact was not found or phone number is missing.",
      };
    }

    const pendingMessage = await insertOutboundMessage({
      contactId: contact.id,
      phone: contact.phone,
      body: text,
      senderType: "admin",
      status: "pending",
    });

    const sendResult = await sendWhatsAppText(contact.phone, text);

    const savedMessage = await updateOutboundMessage(pendingMessage.id, {
      status: sendResult.ok ? "sent" : "failed",
      status_error: sendResult.ok ? null : sendResult.error,
      whatsapp_message_id: sendResult.ok ? sendResult.messageId : null,
    });

    await touchContactLastMessage(contact.id, text);

    if (!sendResult.ok) {
      return {
        message: savedMessage,
        error: sendResult.error || "WhatsApp message failed to send.",
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