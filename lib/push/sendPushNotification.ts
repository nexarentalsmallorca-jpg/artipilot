import webPush from "web-push";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

type PushSubscriptionRow = {
  id: string;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
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

type PushResult = {
  ok: boolean;
  sent: number;
  failed: number;
  skipped: number;
  totalSubscriptions: number;
  error?: string;
  message?: string;
};

function cleanString(value: unknown): string {
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

function getErrorMessage(error: unknown, fallback: string): string {
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

function getPushStatusCode(error: unknown): number | null {
  if (typeof error === "object" && error && "statusCode" in error) {
    const value = Number((error as { statusCode?: unknown }).statusCode);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

function maskEndpoint(endpoint: string): string {
  if (!endpoint) return "";

  if (endpoint.length <= 32) {
    return endpoint;
  }

  return `${endpoint.slice(0, 22)}...${endpoint.slice(-10)}`;
}

function isValidSubscriptionRow(subscription: PushSubscriptionRow): boolean {
  const endpoint = cleanString(subscription.endpoint);
  const p256dh = cleanString(subscription.p256dh);
  const auth = cleanString(subscription.auth);

  return Boolean(endpoint && p256dh && auth);
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

    const { error } = await db
      .from("artipilot_push_subscriptions")
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("endpoint", cleanEndpoint);

    if (error) {
      console.error("[ARTIPILOT_PUSH_DISABLE_FAILED]", {
        endpoint: maskEndpoint(cleanEndpoint),
        error: error.message,
      });
    }
  } catch (error) {
    console.error("[ARTIPILOT_PUSH_DISABLE_EXCEPTION]", {
      endpoint: maskEndpoint(cleanEndpoint),
      error: getErrorMessage(error, "Failed to disable broken subscription."),
    });
  }
}

async function listEnabledSubscriptions(): Promise<PushSubscriptionRow[]> {
  if (!isSupabaseConfigured()) {
    console.error("[ARTIPILOT_PUSH_SUPABASE_NOT_CONFIGURED]");
    return [];
  }

  try {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from("artipilot_push_subscriptions")
      .select("id, endpoint, p256dh, auth, enabled")
      .eq("enabled", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ARTIPILOT_PUSH_LIST_FAILED]", {
        error: error.message,
      });
      return [];
    }

    return (data || []) as PushSubscriptionRow[];
  } catch (error) {
    console.error("[ARTIPILOT_PUSH_LIST_EXCEPTION]", {
      error: getErrorMessage(error, "Failed to list push subscriptions."),
    });
    return [];
  }
}

function buildNotificationPayload(payload: PushPayload): string {
  const contactId = cleanString(payload.contactId);
  const phone = cleanString(payload.phone);

  const fallbackUrl = "/dashboard/inbox";
  const safeUrl = cleanString(payload.url) || fallbackUrl;

  return JSON.stringify({
    title: cleanString(payload.title) || "New WhatsApp message",
    body:
      cleanString(payload.body) ||
      cleanString(payload.message) ||
      "You received a new customer message.",
    icon: cleanString(payload.icon) || "/icons/icon-192.png",
    badge: cleanString(payload.badge) || "/icons/icon-192.png",
    url: safeUrl,
    tag:
      cleanString(payload.tag) ||
      (contactId
        ? `artipilot-whatsapp-message-${contactId}`
        : "artipilot-whatsapp-message"),
    contactId,
    phone,
    timestamp: Date.now(),
  });
}

export async function sendPushNotificationToAll(
  payload: PushPayload
): Promise<PushResult> {
  const vapid = getVapidConfig();

  if (!vapid.ok) {
    console.error("[ARTIPILOT_PUSH_CONFIG_MISSING]", vapid.error);

    return {
      ok: false,
      sent: 0,
      failed: 0,
      skipped: 0,
      totalSubscriptions: 0,
      error: vapid.error,
    };
  }

  try {
    webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Failed to configure VAPID details."
    );

    console.error("[ARTIPILOT_PUSH_VAPID_SETUP_FAILED]", {
      error: message,
    });

    return {
      ok: false,
      sent: 0,
      failed: 0,
      skipped: 0,
      totalSubscriptions: 0,
      error: message,
    };
  }

  const subscriptions = await listEnabledSubscriptions();

  if (subscriptions.length === 0) {
    console.warn("[ARTIPILOT_PUSH_NO_SUBSCRIPTIONS]");

    return {
      ok: true,
      sent: 0,
      failed: 0,
      skipped: 0,
      totalSubscriptions: 0,
      message: "No enabled push subscriptions found.",
    };
  }

  const validSubscriptions = subscriptions.filter(isValidSubscriptionRow);
  const skipped = subscriptions.length - validSubscriptions.length;

  if (skipped > 0) {
    console.warn("[ARTIPILOT_PUSH_INVALID_SUBSCRIPTIONS_SKIPPED]", {
      skipped,
      totalSubscriptions: subscriptions.length,
    });
  }

  if (validSubscriptions.length === 0) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      skipped,
      totalSubscriptions: subscriptions.length,
      error:
        "Push subscription rows exist, but none have valid endpoint, p256dh and auth values.",
    };
  }

  const notificationPayload = buildNotificationPayload(payload);

  let sent = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    validSubscriptions.map(async (subscription) => {
      const endpoint = cleanString(subscription.endpoint);
      const p256dh = cleanString(subscription.p256dh);
      const auth = cleanString(subscription.auth);

      try {
        await webPush.sendNotification(
          {
            endpoint,
            keys: {
              p256dh,
              auth,
            },
          },
          notificationPayload
        );

        console.log("[ARTIPILOT_PUSH_SENT]", {
          subscriptionId: subscription.id,
          endpoint: maskEndpoint(endpoint),
        });

        return {
          ok: true,
          endpoint,
        };
      } catch (error) {
        const statusCode = getPushStatusCode(error);
        const message = getErrorMessage(error, "Push notification failed.");

        console.error("[ARTIPILOT_PUSH_SEND_FAILED]", {
          subscriptionId: subscription.id,
          endpoint: maskEndpoint(endpoint),
          statusCode,
          error: message,
        });

        if (statusCode === 404 || statusCode === 410) {
          await disableBrokenSubscription(endpoint);
        }

        return {
          ok: false,
          endpoint,
          statusCode,
          error: message,
        };
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.ok) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  const finalResult: PushResult = {
    ok: failed === 0 && sent > 0,
    sent,
    failed,
    skipped,
    totalSubscriptions: subscriptions.length,
  };

  console.log("[ARTIPILOT_PUSH_RESULT]", finalResult);

  return finalResult;
}