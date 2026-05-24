export function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
}

export function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

export async function sendWhatsAppText(to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneNumberId) {
    return {
      ok: false as const,
      error: "WhatsApp sender is not configured.",
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(to),
        type: "text",
        text: { body },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    return {
      ok: false as const,
      error:
        (data as { error?: { message?: string } })?.error?.message ||
        JSON.stringify(data),
      raw: data,
    };
  }

  const messageId = (data as { messages?: { id?: string }[] })?.messages?.[0]
    ?.id;

  return { ok: true as const, messageId, raw: data };
}
