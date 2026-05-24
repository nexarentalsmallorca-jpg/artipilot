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

function cleanMessageBody(body: string) {
  return String(body || "").trim();
}

function getErrorMessageFromMeta(data: unknown) {
  const error = data as {
    error?: {
      message?: string;
      type?: string;
      code?: number;
      error_subcode?: number;
      fbtrace_id?: string;
    };
  };

  if (error.error?.message) {
    const parts = [
      error.error.message,
      error.error.code ? `Code: ${error.error.code}` : "",
      error.error.error_subcode
        ? `Subcode: ${error.error.error_subcode}`
        : "",
      error.error.fbtrace_id ? `Trace: ${error.error.fbtrace_id}` : "",
    ].filter(Boolean);

    return parts.join(" · ");
  }

  try {
    return JSON.stringify(data);
  } catch {
    return "Unknown WhatsApp API error.";
  }
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

export async function sendWhatsAppText(to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneNumberId) {
    return {
      ok: false as const,
      error:
        "WhatsApp sender is not configured. Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  const phone = normalizePhone(to);
  const messageBody = cleanMessageBody(body);

  if (!phone) {
    return {
      ok: false as const,
      error: "Customer phone number is missing or invalid.",
    };
  }

  if (!messageBody) {
    return {
      ok: false as const,
      error: "Message body is empty.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(getWhatsAppSendUrl(phoneNumberId), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
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
      return {
        ok: false as const,
        error: getErrorMessageFromMeta(data),
        raw: data,
      };
    }

    const messageId = (data as { messages?: { id?: string }[] } | null)
      ?.messages?.[0]?.id;

    return {
      ok: true as const,
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

    return {
      ok: false as const,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}