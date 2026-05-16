import webPush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PushSubscriptionRow = {
  id: string;
  owner_user_id: string;
  workspace_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type SendCustomerMessagePushParams = {
  workspaceId: string;
  ownerUserId: string;
  customerName?: string | null;
  customerPhone: string;
  messagePreview: string;
};

let configured = false;

function configureWebPush() {
  if (configured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@artipilot.com";

  if (!publicKey || !privateKey) {
    console.warn(
      "Push notifications skipped: missing NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY."
    );
    return false;
  }

  try {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return true;
  } catch (error) {
    console.error("Web push configuration failed:", error);
    return false;
  }
}

function buildPreview(message: string) {
  const clean = String(message || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "New customer message";
  if (clean.length <= 120) return clean;

  return `${clean.slice(0, 120)}...`;
}

export async function sendCustomerMessagePushNotification({
  workspaceId,
  ownerUserId,
  customerName,
  customerPhone,
  messagePreview,
}: SendCustomerMessagePushParams) {
  try {
    const pushReady = configureWebPush();

    if (!pushReady) {
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("artipilot_push_subscriptions")
      .select("id, owner_user_id, workspace_id, endpoint, p256dh, auth")
      .eq("owner_user_id", ownerUserId);

    if (error) {
      console.error("Push subscriptions load error:", error);
      return;
    }

    const subscriptions = ((data || []) as PushSubscriptionRow[]).filter(
      (row) =>
        row?.id &&
        row?.endpoint &&
        row?.p256dh &&
        row?.auth &&
        row.owner_user_id === ownerUserId &&
        (!row.workspace_id || row.workspace_id === workspaceId)
    );

    if (subscriptions.length === 0) {
      console.log("No valid push subscriptions found for owner/workspace:", {
        ownerUserId,
        workspaceId,
      });
      return;
    }

    const displayName =
      String(customerName || "").trim() ||
      `Customer ${String(customerPhone || "").slice(-4)}`;

    const payload = JSON.stringify({
      title: "New WhatsApp message",
      body: `${displayName}: ${buildPreview(messagePreview)}`,
      url: `/dashboard/inbox?phone=${encodeURIComponent(customerPhone)}`,
      tag: `artipilot-${workspaceId}-${customerPhone}`,
      customerPhone,
      workspaceId,
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (row) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: {
                p256dh: row.p256dh,
                auth: row.auth,
              },
            },
            payload
          );

          console.log("Push notification sent:", {
            subscriptionId: row.id,
            ownerUserId,
            workspaceId,
            customerPhone,
          });
        } catch (error) {
          const statusCode = (error as { statusCode?: number })?.statusCode;

          console.error("Push send error:", {
            subscriptionId: row.id,
            statusCode,
            error,
          });

          if (statusCode === 404 || statusCode === 410) {
            const { error: deleteError } = await supabaseAdmin
              .from("artipilot_push_subscriptions")
              .delete()
              .eq("id", row.id);

            if (deleteError) {
              console.error("Expired push subscription delete error:", {
                subscriptionId: row.id,
                error: deleteError,
              });
            }
          }
        }
      })
    );

    console.log("Push notification batch finished:", {
      ownerUserId,
      workspaceId,
      customerPhone,
      totalSubscriptions: subscriptions.length,
      fulfilled: results.filter((result) => result.status === "fulfilled")
        .length,
      rejected: results.filter((result) => result.status === "rejected").length,
    });
  } catch (error) {
    console.error("sendCustomerMessagePushNotification error:", error);
  }
}