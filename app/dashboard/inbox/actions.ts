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

export async function fetchContactsAction(): Promise<{
  contacts: ApiContact[];
  error?: string;
}> {
  try {
    await assertPrivateSessionServer();
    if (!isSupabaseConfigured()) {
      return { contacts: [] };
    }
    const contacts = await listContacts();
    return { contacts };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load contacts";
    return { contacts: [], error: message };
  }
}

export async function fetchMessagesAction(contactId: string): Promise<{
  messages: ApiMessage[];
  error?: string;
}> {
  try {
    await assertPrivateSessionServer();
    if (!contactId) {
      return { messages: [], error: "contact_id required" };
    }
    if (!isSupabaseConfigured()) {
      return { messages: [] };
    }
    const messages = await listMessagesForContact(contactId);
    await markContactRead(contactId);
    return { messages };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load messages";
    return { messages: [], error: message };
  }
}

export async function sendMessageAction(
  contactId: string,
  body: string
): Promise<{ message?: ApiMessage; error?: string }> {
  try {
    await assertPrivateSessionServer();
    const text = body.trim();
    if (!contactId || !text) {
      return { error: "contact_id and body are required" };
    }
    if (!isSupabaseConfigured()) {
      return { error: "Supabase is not configured" };
    }
    if (!isWhatsAppConfigured()) {
      return { error: "WhatsApp sender is not configured." };
    }

    const contact = await getContactById(contactId);
    const pending = await insertOutboundMessage({
      contactId: contact.id,
      phone: contact.phone,
      body: text,
      senderType: "admin",
      status: "pending",
    });

    const sendResult = await sendWhatsAppText(contact.phone, text);
    const saved = await updateOutboundMessage(pending.id, {
      status: sendResult.ok ? "sent" : "failed",
      status_error: sendResult.ok ? null : sendResult.error,
      whatsapp_message_id: sendResult.ok ? sendResult.messageId : null,
    });

    await touchContactLastMessage(contact.id, text);

    if (!sendResult.ok) {
      return { message: saved, error: sendResult.error };
    }

    return { message: saved };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return { error: message };
  }
}

export async function toggleAiAction(
  contactId: string,
  aiEnabled: boolean
): Promise<{ contact?: ApiContact; error?: string }> {
  try {
    await assertPrivateSessionServer();
    const contact = await updateContactAi(contactId, aiEnabled);
    return { contact };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return { error: message };
  }
}

export async function fetchQuickRepliesAction(): Promise<{
  items: { id: string; title: string; content: string }[];
}> {
  try {
    await assertPrivateSessionServer();
    if (!isSupabaseConfigured()) {
      return { items: [] };
    }

    const db = getSupabaseAdmin();
    let { data, error } = await db
      .from("artipilot_quick_replies")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) {
      const fallback = await db
        .from("quick_replies")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: true });
      data = fallback.data;
    }

    return {
      items: (data || []).map((row) => ({
        id: String(row.id),
        title: String(row.title),
        content: String(row.content),
      })),
    };
  } catch {
    return { items: [] };
  }
}

export async function suggestAiAction(contactId: string): Promise<{
  suggestion?: string;
  error?: string;
}> {
  try {
    await assertPrivateSessionServer();
    const { generateAiReply, isOpenAiConfigured } = await import(
      "@/lib/ai/generateReply"
    );

    if (!isOpenAiConfigured()) {
      return { error: "OpenAI is not configured" };
    }

    const messages = await listMessagesForContact(contactId);
    const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");

    if (!lastInbound?.body) {
      return { error: "No inbound message to reply to" };
    }

    const history = messages
      .filter((m) => m.body)
      .map((m) => ({
        role:
          m.direction === "inbound"
            ? ("user" as const)
            : ("assistant" as const),
        content: String(m.body),
      }));

    const suggestion = await generateAiReply({
      customerMessage: String(lastInbound.body),
      recentMessages: history,
    });

    return { suggestion };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI suggestion failed";
    return { error: message };
  }
}
