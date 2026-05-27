import { NextRequest, NextResponse } from "next/server";
import {
  isPrivateSessionValid,
  requirePrivateSession,
} from "@/lib/auth/private-session";
import { isOpenAiConfigured } from "@/lib/ai/generateReply";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PushSubscriptionRow = {
  id: string;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  user_agent: string | null;
  enabled: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function isEnvSet(name: string) {
  return Boolean(process.env[name]?.trim());
}

function cleanString(value: unknown): string {
  return String(value || "").trim();
}

function getErrorMessage(error: unknown) {
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

  return "Unknown error";
}

function isSchemaError(error: unknown) {
  const message = String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      (error as { hint?: string })?.hint ||
      ""
  ).toLowerCase();

  return (
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("does not exist") ||
    message.includes("relation")
  );
}

function maskEndpoint(endpoint: string | null | undefined): string {
  const cleanEndpoint = cleanString(endpoint);

  if (!cleanEndpoint) {
    return "";
  }

  if (cleanEndpoint.length <= 32) {
    return cleanEndpoint;
  }

  return `${cleanEndpoint.slice(0, 22)}...${cleanEndpoint.slice(-10)}`;
}

function formatPushSubscriptionForDebug(row: PushSubscriptionRow) {
  return {
    id: row.id,
    endpoint: maskEndpoint(row.endpoint),
    hasEndpoint: Boolean(cleanString(row.endpoint)),
    hasP256dh: Boolean(cleanString(row.p256dh)),
    hasAuth: Boolean(cleanString(row.auth)),
    enabled: row.enabled === true,
    userAgent: row.user_agent || "Unknown browser",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getTableCount(tableName: string) {
  try {
    if (!isSupabaseConfigured()) {
      return 0;
    }

    const db = getSupabaseAdmin();

    const { count, error } = await db
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      if (!isSchemaError(error)) {
        console.error(`[ARTIPILOT_STATUS] Count error for ${tableName}:`, error);
      }

      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error(`[ARTIPILOT_STATUS] Count failed for ${tableName}:`, error);
    return 0;
  }
}

async function getPushSubscriptionsDebug() {
  const emptyResult = {
    totalPushSubscriptions: 0,
    enabledPushSubscriptions: 0,
    validPushSubscriptions: 0,
    pushSubscriptions: [] as ReturnType<typeof formatPushSubscriptionForDebug>[],
  };

  try {
    if (!isSupabaseConfigured()) {
      return emptyResult;
    }

    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from("artipilot_push_subscriptions")
      .select(
        "id, endpoint, p256dh, auth, user_agent, enabled, created_at, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(25);

    if (error) {
      if (!isSchemaError(error)) {
        console.error("[ARTIPILOT_STATUS] Push debug error:", error);
      }

      return emptyResult;
    }

    const rows = (data || []) as PushSubscriptionRow[];

    const pushSubscriptions = rows.map(formatPushSubscriptionForDebug);

    const enabledPushSubscriptions = pushSubscriptions.filter(
      (subscription) => subscription.enabled
    ).length;

    const validPushSubscriptions = pushSubscriptions.filter(
      (subscription) =>
        subscription.enabled &&
        subscription.hasEndpoint &&
        subscription.hasP256dh &&
        subscription.hasAuth
    ).length;

    return {
      totalPushSubscriptions: rows.length,
      enabledPushSubscriptions,
      validPushSubscriptions,
      pushSubscriptions,
    };
  } catch (error) {
    console.error("[ARTIPILOT_STATUS] Push debug failed:", error);
    return emptyResult;
  }
}

export async function GET(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  try {
    const hasPrivateSession = await isPrivateSessionValid(request);

    const supabaseConfigured = isSupabaseConfigured();

    const whatsappTokenConfigured = isEnvSet("WHATSAPP_ACCESS_TOKEN");
    const whatsappPhoneNumberIdConfigured = isEnvSet(
      "WHATSAPP_PHONE_NUMBER_ID"
    );
    const whatsappVerifyTokenConfigured = isEnvSet("WHATSAPP_VERIFY_TOKEN");

    const openAiConfigured = isOpenAiConfigured();

    const vapidPublicKeyConfigured = isEnvSet("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
    const vapidPrivateKeyConfigured = isEnvSet("VAPID_PRIVATE_KEY");
    const vapidSubjectConfigured = isEnvSet("VAPID_SUBJECT");

    const [totalContacts, totalMessages, pushDebug] = await Promise.all([
      getTableCount("artipilot_contacts"),
      getTableCount("artipilot_messages"),
      getPushSubscriptionsDebug(),
    ]);

    const canReceiveMessages =
      supabaseConfigured && whatsappVerifyTokenConfigured;

    const canSendMessages =
      supabaseConfigured &&
      whatsappTokenConfigured &&
      whatsappPhoneNumberIdConfigured;

    const canAutoReply = canSendMessages && openAiConfigured;

    const canSendPushNotifications =
      supabaseConfigured &&
      vapidPublicKeyConfigured &&
      vapidPrivateKeyConfigured &&
      pushDebug.enabledPushSubscriptions > 0 &&
      pushDebug.validPushSubscriptions > 0;

    return NextResponse.json({
      hasPrivateSession,

      supabaseConfigured,

      whatsappTokenConfigured,
      whatsappPhoneNumberIdConfigured,
      whatsappVerifyTokenConfigured,

      openAiConfigured,

      vapidPublicKeyConfigured,
      vapidPrivateKeyConfigured,
      vapidSubjectConfigured,

      totalPushSubscriptions: pushDebug.totalPushSubscriptions,
      enabledPushSubscriptions: pushDebug.enabledPushSubscriptions,
      validPushSubscriptions: pushDebug.validPushSubscriptions,
      pushSubscriptions: pushDebug.pushSubscriptions,

      totalContacts,
      totalMessages,

      canReceiveMessages,
      canSendMessages,
      canAutoReply,
      canSendPushNotifications,
    });
  } catch (error) {
    console.error("[ARTIPILOT_STATUS] GET failed:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}