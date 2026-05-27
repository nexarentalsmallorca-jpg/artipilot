import { NextRequest, NextResponse } from "next/server";
import {
  isPrivateSessionValid,
  requirePrivateSession,
} from "@/lib/auth/private-session";
import { isOpenAiConfigured } from "@/lib/ai/generateReply";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isEnvSet(name: string) {
  return Boolean(process.env[name]?.trim());
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

async function getEnabledPushSubscriptionCount() {
  try {
    if (!isSupabaseConfigured()) {
      return 0;
    }

    const db = getSupabaseAdmin();

    const { count, error } = await db
      .from("artipilot_push_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("enabled", true);

    if (error) {
      if (!isSchemaError(error)) {
        console.error("[ARTIPILOT_STATUS] Push count error:", error);
      }

      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error("[ARTIPILOT_STATUS] Push count failed:", error);
    return 0;
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

    const [totalContacts, totalMessages, totalPushSubscriptions] =
      await Promise.all([
        getTableCount("artipilot_contacts"),
        getTableCount("artipilot_messages"),
        getEnabledPushSubscriptionCount(),
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
      totalPushSubscriptions > 0;

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
      totalPushSubscriptions,

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