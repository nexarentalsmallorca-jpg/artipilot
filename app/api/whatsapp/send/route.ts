import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import {
  getContactById,
  insertOutboundMessage,
  touchContactLastMessage,
  updateOutboundMessage,
} from "@/lib/db/private-inbox";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import * as WhatsAppSender from "@/lib/whatsapp/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MessageType = "text" | "image" | "video" | "document" | "audio";

type SendResult = {
  ok?: boolean;
  error?: string | null;
  messageId?: string | null;
  whatsappMessageId?: string | null;
  mediaId?: string | null;
  media_id?: string | null;
  id?: string | null;
  raw?: unknown;
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
    // Ignore JSON stringify error.
  }

  return fallback;
}

function isFormDataRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  return contentType.toLowerCase().includes("multipart/form-data");
}

function detectMessageType(file: File): MessageType {
  const mimeType = (file.type || "").toLowerCase();
  const fileName = (file.name || "").toLowerCase();

  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  if (
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".webp")
  ) {
    return "image";
  }

  if (
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".mov") ||
    fileName.endsWith(".m4v") ||
    fileName.endsWith(".webm")
  ) {
    return "video";
  }

  if (
    fileName.endsWith(".mp3") ||
    fileName.endsWith(".m4a") ||
    fileName.endsWith(".aac") ||
    fileName.endsWith(".ogg") ||
    fileName.endsWith(".wav")
  ) {
    return "audio";
  }

  return "document";
}

function getMediaPreviewText(params: {
  messageType: MessageType;
  caption: string;
  fileName: string;
}) {
  const caption = cleanString(params.caption);
  const fileName = cleanString(params.fileName);

  if (caption) {
    return caption;
  }

  if (params.messageType === "image") {
    return fileName ? `📷 ${fileName}` : "📷 Image";
  }

  if (params.messageType === "video") {
    return fileName ? `🎥 ${fileName}` : "🎥 Video";
  }

  if (params.messageType === "audio") {
    return fileName ? `🎧 ${fileName}` : "🎧 Audio";
  }

  return fileName ? `📎 ${fileName}` : "📎 Document";
}

function getWhatsAppMessageId(result: SendResult) {
  return (
    cleanString(result.messageId) ||
    cleanString(result.whatsappMessageId) ||
    null
  );
}

function getWhatsAppMediaId(result: SendResult) {
  return (
    cleanString(result.mediaId) ||
    cleanString(result.media_id) ||
    cleanString(result.id) ||
    null
  );
}

async function sendMediaWithCurrentHelper(params: {
  phone: string;
  file: File;
  messageType: MessageType;
  caption: string;
  fileName: string;
}) {
  const sender = WhatsAppSender as unknown as {
    sendWhatsAppMedia?: (...args: unknown[]) => Promise<SendResult>;
  };

  if (typeof sender.sendWhatsAppMedia !== "function") {
    return {
      ok: false,
      error:
        "sendWhatsAppMedia() is missing from lib/whatsapp/send.ts. Please send me that file if this error appears.",
    } satisfies SendResult;
  }

  /*
    This supports both possible helper styles without breaking TypeScript:

    1) sendWhatsAppMedia({
         to,
         phone,
         file,
         type,
         mediaType,
         caption,
         filename
       })

    2) sendWhatsAppMedia(phone, file, type, caption, filename)

    Your previous send helper was rewritten during this project, but this route
    stays defensive so it does not break if the helper signature is slightly different.
  */
  if (sender.sendWhatsAppMedia.length >= 5) {
    return sender.sendWhatsAppMedia(
      params.phone,
      params.file,
      params.messageType,
      params.caption,
      params.fileName
    );
  }

  return sender.sendWhatsAppMedia({
    to: params.phone,
    phone: params.phone,
    file: params.file,
    type: params.messageType,
    mediaType: params.messageType,
    caption: params.caption,
    filename: params.fileName,
    fileName: params.fileName,
  });
}

async function handleJsonTextSend(request: NextRequest) {
  let body: {
    contactId?: unknown;
    message?: unknown;
    text?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const contactId = cleanString(body.contactId);
  const messageText = cleanString(body.message || body.text);

  if (!contactId) {
    return NextResponse.json({ error: "contactId is required." }, { status: 400 });
  }

  if (!messageText) {
    return NextResponse.json(
      { error: "Message text is required." },
      { status: 400 }
    );
  }

  const contact = await getContactById(contactId);

  if (!contact?.id) {
    return NextResponse.json({ error: "Contact was not found." }, { status: 404 });
  }

  const phone = cleanString(contact.phone).replace(/\D/g, "");

  if (!phone) {
    return NextResponse.json(
      { error: "Contact phone number is missing." },
      { status: 400 }
    );
  }

  const pendingMessage = await insertOutboundMessage({
    contactId: contact.id,
    phone,
    body: messageText,
    senderType: "admin",
    status: "pending",
    whatsappMessageId: null,
    messageType: "text",
    mediaId: null,
    mediaUrl: null,
  });

  const sendResult = await WhatsAppSender.sendWhatsAppText(phone, messageText);

  if (!sendResult.ok) {
    await updateOutboundMessage(pendingMessage.id, {
      status: "failed",
      status_error: sendResult.error || "WhatsApp send failed.",
      whatsapp_message_id: null,
      delivery_status: "failed",
      delivery_error: sendResult.error || "WhatsApp send failed.",
    });

    return NextResponse.json(
      {
        error:
          sendResult.error ||
          "WhatsApp failed to send this message. Check Meta settings.",
      },
      { status: 502 }
    );
  }

  const whatsappMessageId = sendResult.messageId || null;

  const savedMessage = await updateOutboundMessage(pendingMessage.id, {
    status: "sent",
    status_error: null,
    whatsapp_message_id: whatsappMessageId,
    delivery_status: "sent",
    delivery_error: null,
    message_type: "text",
    media_id: null,
    media_url: null,
  });

  await touchContactLastMessage(contact.id, messageText);

  return NextResponse.json({
    ok: true,
    message: savedMessage,
    whatsappMessageId,
  });
}

async function handleFormDataSend(request: NextRequest) {
  const formData = await request.formData();

  const contactId = cleanString(formData.get("contactId"));
  const messageText = cleanString(formData.get("message") || formData.get("text"));
  const caption = cleanString(formData.get("caption") || messageText);

  const fileValue =
    formData.get("file") ||
    formData.get("media") ||
    formData.get("attachment") ||
    null;

  const file = fileValue instanceof File ? fileValue : null;

  if (!contactId) {
    return NextResponse.json({ error: "contactId is required." }, { status: 400 });
  }

  if (!file && !messageText) {
    return NextResponse.json(
      { error: "Message text or file is required." },
      { status: 400 }
    );
  }

  /*
    If composer sends FormData but without a file, we still send it as a normal
    text message. This keeps manual text sending safe.
  */
  if (!file) {
    const contact = await getContactById(contactId);

    if (!contact?.id) {
      return NextResponse.json(
        { error: "Contact was not found." },
        { status: 404 }
      );
    }

    const phone = cleanString(contact.phone).replace(/\D/g, "");

    if (!phone) {
      return NextResponse.json(
        { error: "Contact phone number is missing." },
        { status: 400 }
      );
    }

    const pendingMessage = await insertOutboundMessage({
      contactId: contact.id,
      phone,
      body: messageText,
      senderType: "admin",
      status: "pending",
      whatsappMessageId: null,
      messageType: "text",
      mediaId: null,
      mediaUrl: null,
    });

    const sendResult = await WhatsAppSender.sendWhatsAppText(phone, messageText);

    if (!sendResult.ok) {
      await updateOutboundMessage(pendingMessage.id, {
        status: "failed",
        status_error: sendResult.error || "WhatsApp send failed.",
        whatsapp_message_id: null,
        delivery_status: "failed",
        delivery_error: sendResult.error || "WhatsApp send failed.",
      });

      return NextResponse.json(
        {
          error:
            sendResult.error ||
            "WhatsApp failed to send this message. Check Meta settings.",
        },
        { status: 502 }
      );
    }

    const savedMessage = await updateOutboundMessage(pendingMessage.id, {
      status: "sent",
      status_error: null,
      whatsapp_message_id: sendResult.messageId || null,
      delivery_status: "sent",
      delivery_error: null,
      message_type: "text",
      media_id: null,
      media_url: null,
    });

    await touchContactLastMessage(contact.id, messageText);

    return NextResponse.json({
      ok: true,
      message: savedMessage,
      whatsappMessageId: sendResult.messageId || null,
    });
  }

  if (file.size <= 0) {
    return NextResponse.json(
      { error: "The selected file is empty." },
      { status: 400 }
    );
  }

  const contact = await getContactById(contactId);

  if (!contact?.id) {
    return NextResponse.json({ error: "Contact was not found." }, { status: 404 });
  }

  const phone = cleanString(contact.phone).replace(/\D/g, "");

  if (!phone) {
    return NextResponse.json(
      { error: "Contact phone number is missing." },
      { status: 400 }
    );
  }

  const messageType = detectMessageType(file);
  const fileName = cleanString(file.name) || `artipilot-${messageType}`;
  const previewText = getMediaPreviewText({
    messageType,
    caption,
    fileName,
  });

  const pendingMessage = await insertOutboundMessage({
    contactId: contact.id,
    phone,
    body: previewText,
    senderType: "admin",
    status: "pending",
    whatsappMessageId: null,
    messageType,
    mediaId: null,
    mediaUrl: null,
  });

  const sendResult = await sendMediaWithCurrentHelper({
    phone,
    file,
    messageType,
    caption,
    fileName,
  });

  if (!sendResult.ok) {
    await updateOutboundMessage(pendingMessage.id, {
      status: "failed",
      status_error: sendResult.error || "WhatsApp media send failed.",
      whatsapp_message_id: null,
      delivery_status: "failed",
      delivery_error: sendResult.error || "WhatsApp media send failed.",
      message_type: messageType,
      media_id: null,
      media_url: null,
    });

    return NextResponse.json(
      {
        error:
          sendResult.error ||
          "WhatsApp failed to send this media. Check Meta settings.",
      },
      { status: 502 }
    );
  }

  const whatsappMessageId = getWhatsAppMessageId(sendResult);
  const whatsappMediaId = getWhatsAppMediaId(sendResult);
  const mediaUrl = whatsappMediaId
    ? `/api/whatsapp/media/${encodeURIComponent(whatsappMediaId)}`
    : null;

  const savedMessage = await updateOutboundMessage(pendingMessage.id, {
    status: "sent",
    status_error: null,
    whatsapp_message_id: whatsappMessageId,
    delivery_status: "sent",
    delivery_error: null,
    message_type: messageType,
    media_id: whatsappMediaId,
    media_url: mediaUrl,
  });

  await touchContactLastMessage(contact.id, previewText);

  return NextResponse.json({
    ok: true,
    message: savedMessage,
    whatsappMessageId,
    mediaId: whatsappMediaId,
    mediaUrl,
  });
}

export async function POST(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  if (!WhatsAppSender.isWhatsAppConfigured()) {
    return NextResponse.json(
      {
        error:
          "WhatsApp sender is not configured. Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
      },
      { status: 500 }
    );
  }

  try {
    if (isFormDataRequest(request)) {
      return await handleFormDataSend(request);
    }

    return await handleJsonTextSend(request);
  } catch (error) {
    console.error("[ARTIPILOT_WHATSAPP_SEND_POST]", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Failed to send WhatsApp message."),
      },
      { status: 500 }
    );
  }
}