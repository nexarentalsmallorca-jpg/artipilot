export type WhatsAppMediaType = "image" | "video" | "document" | "audio";

type WhatsAppSendSuccess = {
  ok: true;
  messageId?: string;
  raw?: unknown;
};

type WhatsAppSendFailure = {
  ok: false;
  error: string;
  raw?: unknown;
};

export type WhatsAppSendResult = WhatsAppSendSuccess | WhatsAppSendFailure;

type UploadWhatsAppMediaResult =
  | {
      ok: true;
      mediaId: string;
      raw?: unknown;
    }
  | {
      ok: false;
      error: string;
      raw?: unknown;
    };

type SendWhatsAppMediaParams = {
  to?: string;
  phone?: string;
  file: Blob;
  filename?: string;
  fileName?: string;
  mimeType?: string;
  type?: WhatsAppMediaType;
  mediaType?: WhatsAppMediaType;
  caption?: string;
};

export function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
}

export function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

function getWhatsAppApiVersion() {
  return process.env.WHATSAPP_API_VERSION?.trim() || "v20.0";
}

function getWhatsAppSendUrl(phoneNumberId: string) {
  const version = getWhatsAppApiVersion();
  return `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
}

function getWhatsAppUploadUrl(phoneNumberId: string) {
  const version = getWhatsAppApiVersion();
  return `https://graph.facebook.com/${version}/${phoneNumberId}/media`;
}

function cleanMessageBody(body: string) {
  return String(body || "").trim();
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function getErrorMessageFromMeta(data: unknown) {
  const errorData = data as {
    error?: {
      message?: string;
      type?: string;
      code?: number;
      error_subcode?: number;
      fbtrace_id?: string;
      error_data?: {
        details?: string;
      };
    };
  };

  if (errorData.error?.message) {
    const parts = [
      errorData.error.message,
      errorData.error.error_data?.details
        ? `Details: ${errorData.error.error_data.details}`
        : "",
      errorData.error.type ? `Type: ${errorData.error.type}` : "",
      errorData.error.code ? `Code: ${errorData.error.code}` : "",
      errorData.error.error_subcode
        ? `Subcode: ${errorData.error.error_subcode}`
        : "",
      errorData.error.fbtrace_id ? `Trace: ${errorData.error.fbtrace_id}` : "",
    ].filter(Boolean);

    return parts.join(" · ");
  }

  try {
    const text = JSON.stringify(data);

    if (text && text !== "{}") {
      return text;
    }
  } catch {
    // Ignore JSON stringify error.
  }

  return "Unknown WhatsApp API error.";
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw_text: text };
  }
}

function getDebugConfig() {
  return {
    hasAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
    hasPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()),
    apiVersion: getWhatsAppApiVersion(),
    phoneNumberIdPreview: process.env.WHATSAPP_PHONE_NUMBER_ID
      ? `${process.env.WHATSAPP_PHONE_NUMBER_ID.slice(0, 4)}...`
      : null,
  };
}

function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneNumberId) {
    return {
      ok: false as const,
      error:
        "WhatsApp sender is not configured. Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  return {
    ok: true as const,
    token,
    phoneNumberId,
  };
}

function getBlobMimeType(file: Blob) {
  return cleanString((file as Blob & { type?: string }).type);
}

function getBlobFileName(file: Blob) {
  return cleanString((file as Blob & { name?: string }).name);
}

function getMediaTypeFromMime(mimeType: string): WhatsAppMediaType {
  const cleanMime = cleanString(mimeType).toLowerCase();

  if (cleanMime.startsWith("image/")) {
    return "image";
  }

  if (cleanMime.startsWith("video/")) {
    return "video";
  }

  if (cleanMime.startsWith("audio/")) {
    return "audio";
  }

  return "document";
}

function getMimeTypeFromFileName(filename: string) {
  const cleanName = cleanString(filename).toLowerCase();

  if (cleanName.endsWith(".jpg") || cleanName.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (cleanName.endsWith(".png")) {
    return "image/png";
  }

  if (cleanName.endsWith(".webp")) {
    return "image/webp";
  }

  if (cleanName.endsWith(".gif")) {
    return "image/gif";
  }

  if (cleanName.endsWith(".mp4")) {
    return "video/mp4";
  }

  if (cleanName.endsWith(".mov")) {
    return "video/quicktime";
  }

  if (cleanName.endsWith(".webm")) {
    return "video/webm";
  }

  if (cleanName.endsWith(".mp3")) {
    return "audio/mpeg";
  }

  if (cleanName.endsWith(".m4a")) {
    return "audio/mp4";
  }

  if (cleanName.endsWith(".ogg")) {
    return "audio/ogg";
  }

  if (cleanName.endsWith(".wav")) {
    return "audio/wav";
  }

  if (cleanName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (cleanName.endsWith(".doc")) {
    return "application/msword";
  }

  if (cleanName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (cleanName.endsWith(".xls")) {
    return "application/vnd.ms-excel";
  }

  if (cleanName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  if (cleanName.endsWith(".ppt")) {
    return "application/vnd.ms-powerpoint";
  }

  if (cleanName.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  if (cleanName.endsWith(".txt")) {
    return "text/plain";
  }

  if (cleanName.endsWith(".csv")) {
    return "text/csv";
  }

  return "";
}

function normalizeMediaParams(params: SendWhatsAppMediaParams) {
  const to = cleanString(params.to || params.phone);
  const filename =
    cleanString(params.filename) ||
    cleanString(params.fileName) ||
    getBlobFileName(params.file) ||
    "file";

  const mimeType =
    cleanString(params.mimeType) ||
    getBlobMimeType(params.file) ||
    getMimeTypeFromFileName(filename) ||
    "application/octet-stream";

  const mediaType =
    params.mediaType || params.type || getMediaTypeFromMime(mimeType);

  return {
    to,
    file: params.file,
    filename,
    mimeType,
    mediaType,
    caption: cleanString(params.caption),
  };
}

function buildMediaMessagePayload(params: {
  to: string;
  mediaType: WhatsAppMediaType;
  mediaId: string;
  caption?: string;
  filename?: string;
}) {
  const caption = cleanString(params.caption);
  const filename = cleanString(params.filename);

  if (params.mediaType === "image") {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "image",
      image: {
        id: params.mediaId,
        ...(caption ? { caption } : {}),
      },
    };
  }

  if (params.mediaType === "video") {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "video",
      video: {
        id: params.mediaId,
        ...(caption ? { caption } : {}),
      },
    };
  }

  if (params.mediaType === "audio") {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "audio",
      audio: {
        id: params.mediaId,
      },
    };
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: params.to,
    type: "document",
    document: {
      id: params.mediaId,
      ...(caption ? { caption } : {}),
      ...(filename ? { filename } : {}),
    },
  };
}

export async function sendWhatsAppText(
  to: string,
  body: string
): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();

  if (!config.ok) {
    console.error(
      "[NERO_WHATSAPP_SEND] Missing WhatsApp config",
      getDebugConfig()
    );

    return {
      ok: false,
      error: config.error,
    };
  }

  const phone = normalizePhone(to);
  const messageBody = cleanMessageBody(body);

  if (!phone) {
    return {
      ok: false,
      error: "Customer phone number is missing or invalid.",
    };
  }

  if (!messageBody) {
    return {
      ok: false,
      error: "Message body is empty.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    console.log("[NERO_WHATSAPP_SEND] Sending text message", {
      to: phone,
      bodyLength: messageBody.length,
      config: getDebugConfig(),
    });

    const response = await fetch(getWhatsAppSendUrl(config.phoneNumberId), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: {
          preview_url: true,
          body: messageBody,
        },
      }),
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      const metaError = getErrorMessageFromMeta(data);

      console.error("[NERO_WHATSAPP_SEND] Meta text send failed", {
        status: response.status,
        statusText: response.statusText,
        error: metaError,
        raw: data,
      });

      return {
        ok: false,
        error: metaError,
        raw: data,
      };
    }

    const messageId = (data as { messages?: { id?: string }[] } | null)
      ?.messages?.[0]?.id;

    console.log("[NERO_WHATSAPP_SEND] Text sent successfully", {
      to: phone,
      messageId: messageId || null,
    });

    return {
      ok: true,
      messageId,
      raw: data,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "WhatsApp API request timed out."
        : error instanceof Error
          ? error.message
          : "WhatsApp API request failed.";

    console.error("[NERO_WHATSAPP_SEND] Text request failed", {
      to: phone,
      error: message,
    });

    return {
      ok: false,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadWhatsAppMedia(params: {
  file: Blob;
  filename: string;
  mimeType: string;
}): Promise<UploadWhatsAppMediaResult> {
  const config = getWhatsAppConfig();

  if (!config.ok) {
    console.error(
      "[NERO_WHATSAPP_MEDIA_UPLOAD] Missing WhatsApp config",
      getDebugConfig()
    );

    return {
      ok: false,
      error: config.error,
    };
  }

  const filename = cleanString(params.filename) || "file";
  const mimeType =
    cleanString(params.mimeType) ||
    getBlobMimeType(params.file) ||
    getMimeTypeFromFileName(filename) ||
    "application/octet-stream";

  if (!params.file) {
    return {
      ok: false,
      error: "Media file is missing.",
    };
  }

  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("file", params.file, filename);
  formData.append("type", mimeType);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    console.log("[NERO_WHATSAPP_MEDIA_UPLOAD] Uploading media", {
      filename,
      mimeType,
      size: params.file.size,
      config: getDebugConfig(),
    });

    const response = await fetch(getWhatsAppUploadUrl(config.phoneNumberId), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
      body: formData,
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      const metaError = getErrorMessageFromMeta(data);

      console.error("[NERO_WHATSAPP_MEDIA_UPLOAD] Meta upload failed", {
        status: response.status,
        statusText: response.statusText,
        error: metaError,
        raw: data,
      });

      return {
        ok: false,
        error: metaError,
        raw: data,
      };
    }

    const mediaId = cleanString((data as { id?: string } | null)?.id);

    if (!mediaId) {
      return {
        ok: false,
        error: "WhatsApp uploaded the media but did not return a media ID.",
        raw: data,
      };
    }

    console.log("[NERO_WHATSAPP_MEDIA_UPLOAD] Media uploaded successfully", {
      mediaId,
      filename,
      mimeType,
    });

    return {
      ok: true,
      mediaId,
      raw: data,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "WhatsApp media upload timed out."
        : error instanceof Error
          ? error.message
          : "WhatsApp media upload failed.";

    console.error("[NERO_WHATSAPP_MEDIA_UPLOAD] Request failed", {
      filename,
      mimeType,
      error: message,
    });

    return {
      ok: false,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendWhatsAppMediaById(params: {
  to: string;
  mediaType: WhatsAppMediaType;
  mediaId: string;
  caption?: string;
  filename?: string;
}): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();

  if (!config.ok) {
    console.error(
      "[NERO_WHATSAPP_MEDIA_SEND] Missing WhatsApp config",
      getDebugConfig()
    );

    return {
      ok: false,
      error: config.error,
    };
  }

  const phone = normalizePhone(params.to);
  const mediaId = cleanString(params.mediaId);

  if (!phone) {
    return {
      ok: false,
      error: "Customer phone number is missing or invalid.",
    };
  }

  if (!mediaId) {
    return {
      ok: false,
      error: "WhatsApp media ID is missing.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    console.log("[NERO_WHATSAPP_MEDIA_SEND] Sending media message", {
      to: phone,
      mediaType: params.mediaType,
      mediaId,
      filename: params.filename || null,
      hasCaption: Boolean(params.caption?.trim()),
      config: getDebugConfig(),
    });

    const response = await fetch(getWhatsAppSendUrl(config.phoneNumberId), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildMediaMessagePayload({
          to: phone,
          mediaType: params.mediaType,
          mediaId,
          caption: params.caption,
          filename: params.filename,
        })
      ),
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      const metaError = getErrorMessageFromMeta(data);

      console.error("[NERO_WHATSAPP_MEDIA_SEND] Meta media send failed", {
        status: response.status,
        statusText: response.statusText,
        error: metaError,
        raw: data,
      });

      return {
        ok: false,
        error: metaError,
        raw: data,
      };
    }

    const messageId = (data as { messages?: { id?: string }[] } | null)
      ?.messages?.[0]?.id;

    console.log("[NERO_WHATSAPP_MEDIA_SEND] Media sent successfully", {
      to: phone,
      mediaType: params.mediaType,
      mediaId,
      messageId: messageId || null,
    });

    return {
      ok: true,
      messageId,
      raw: data,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "WhatsApp media send request timed out."
        : error instanceof Error
          ? error.message
          : "WhatsApp media send request failed.";

    console.error("[NERO_WHATSAPP_MEDIA_SEND] Request failed", {
      to: phone,
      mediaType: params.mediaType,
      mediaId,
      error: message,
    });

    return {
      ok: false,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendWhatsAppMedia(
  params: SendWhatsAppMediaParams
): Promise<
  WhatsAppSendResult & {
    mediaId?: string;
    mediaType?: WhatsAppMediaType;
  }
> {
  const normalized = normalizeMediaParams(params);

  const phone = normalizePhone(normalized.to);

  if (!phone) {
    return {
      ok: false,
      error: "Customer phone number is missing or invalid.",
    };
  }

  if (!normalized.file) {
    return {
      ok: false,
      error: "Media file is missing.",
    };
  }

  const upload = await uploadWhatsAppMedia({
    file: normalized.file,
    filename: normalized.filename,
    mimeType: normalized.mimeType,
  });

  if (!upload.ok) {
    return {
      ok: false,
      error: upload.error,
      raw: upload.raw,
    };
  }

  const send = await sendWhatsAppMediaById({
    to: phone,
    mediaType: normalized.mediaType,
    mediaId: upload.mediaId,
    caption: normalized.caption,
    filename: normalized.filename,
  });

  if (!send.ok) {
    return {
      ok: false,
      error: send.error,
      raw: send.raw,
      mediaId: upload.mediaId,
      mediaType: normalized.mediaType,
    };
  }

  return {
    ok: true,
    messageId: send.messageId,
    raw: send.raw,
    mediaId: upload.mediaId,
    mediaType: normalized.mediaType,
  };
}