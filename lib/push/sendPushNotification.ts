import webPush from "web-push";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean | null;
};

type PushPayload = {
  title?: string;
  body?: string;
  message?: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  contactId?: string;
  phone?: string;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:info@nexarentals.es";

  if (!publicKey || !privateKey) {
    return {
      ok: false as const,
      error:
        "VAPID keys are not configured. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel.",
    };
  }

  return {
    ok: true as const,
    publicKey,
    privateKey,
    subject,
  };
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

async function disableBrokenSubscription(endpoint: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const cleanEndpoint = cleanString(endpoint);

  if (!cleanEndpoint) {
    return;
  }

  try {
    const db = getSupabaseAdmin();

    await db
      .from("artipilot_push_subscriptions")
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("endpoint", cleanEndpoint);
  } catch (error) {
    console.error("[ARTIPILOT_PUSH_DISABLE_FAILED]", error);
  }
}

async function listEnabledSubscriptions() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("artipilot_push_subscriptions")
    .select("id, endpoint, p256dh, auth, enabled")
    .eq("enabled", true);

  if (error) {
    console.error("[ARTIPILOT_PUSH_LIST_FAILED]", error);
    return [];
  }

  return (data || []) as PushSubscriptionRow[];
}

export async function sendPushNotificationToAll(payload: PushPayload) {
  const vapid = getVapidConfig();

  if (!vapid.ok) {
    console.error("[ARTIPILOT_PUSH_CONFIG_MISSING]", vapid.error);

    return {
      ok: false,
      sent: 0,
      failed: 0,
      error: vapid.error,
    };
  }

  webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const subscriptions = await listEnabledSubscriptions();

  if (subscriptions.length === 0) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      message: "No enabled push subscriptions found.",
    };
  }

  const notificationPayload = JSON.stringify({
    title: cleanString(payload.title) || "New WhatsApp message",
    body:
      cleanString(payload.body) ||
      cleanString(payload.message) ||
      "You received a new customer message.",
    icon: cleanString(payload.icon) || "/icons/icon-192.png",
    badge: cleanString(payload.badge) || "/icons/icon-192.png",
    url: cleanString(payload.url) || "/dashboard/inbox",
    tag: cleanString(payload.tag) || "artipilot-whatsapp-message",
    contactId: cleanString(payload.contactId),
    phone: cleanString(payload.phone),
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notificationPayload
        );

        sent += 1;
      } catch (error) {
        failed += 1;

        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : null;

        console.error("[ARTIPILOT_PUSH_SEND_FAILED]", {
          endpoint: subscription.endpoint,
          statusCode,
          error: getErrorMessage(error, "Push notification failed."),
        });

        if (statusCode === 404 || statusCode === 410) {
          await disableBrokenSubscription(subscription.endpoint);
        }
      }
    })
  );

  return {
    ok: failed === 0,
    sent,
    failed,
  };
}