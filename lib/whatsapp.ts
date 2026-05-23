export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
};

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() ||
    process.env.WHATSAPP_TOKEN?.trim() ||
    "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "";
  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "artipilot_verify_token_123";

  if (!accessToken || !phoneNumberId) return null;

  return { accessToken, phoneNumberId, verifyToken };
}

export function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

export function displayPhone(phone: string) {
  const digits = normalizePhone(phone);
  return digits ? `+${digits}` : phone;
}

type SendTextResult = {
  ok: boolean;
  whatsappMessageId: string | null;
  raw: unknown;
  error?: string;
};

export async function sendWhatsAppText(
  toPhone: string,
  body: string
): Promise<SendTextResult> {
  const config = getWhatsAppConfig();
  if (!config) {
    return { ok: false, whatsappMessageId: null, raw: null, error: "WhatsApp not configured" };
  }

  const to = normalizePhone(toPhone);
  const text = String(body || "").trim();
  if (!to || !text) {
    return { ok: false, whatsappMessageId: null, raw: null, error: "Missing recipient or body" };
  }

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: true, body: text },
      }),
    }
  );

  const raw = await res.json().catch(() => ({}));
  const whatsappMessageId =
    (raw as { messages?: { id?: string }[] })?.messages?.[0]?.id || null;

  if (!res.ok) {
    const error =
      (raw as { error?: { message?: string } })?.error?.message ||
      "WhatsApp send failed";
    return { ok: false, whatsappMessageId, raw, error };
  }

  return { ok: true, whatsappMessageId, raw };
}

export function getWebhookUrl() {
  const host = process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com";
  return `https://${host}/api/whatsapp/webhook`;
}
