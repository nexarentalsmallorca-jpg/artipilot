import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { sendPushNotificationToAll } from "@/lib/push/sendPushNotification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  try {
    const result = await sendPushNotificationToAll({
      title: "Artipilot test notification",
      body: "If you see this, browser push notifications are working.",
      icon: "/artipilot-logo.png",
      badge: "/artipilot-logo.png",
      url: "/dashboard/status",
      tag: `artipilot-test-${Date.now()}`,
    });

    return NextResponse.json({
      ok: result.ok,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      totalSubscriptions: result.totalSubscriptions,
      message:
        result.sent > 0
          ? "Test push notification sent."
          : result.message || result.error || "No push notification was sent.",
      error: result.error,
    });
  } catch (error) {
    console.error("[ARTIPILOT_PUSH_TEST_FAILED]", error);

    return NextResponse.json(
      {
        ok: false,
        sent: 0,
        failed: 0,
        skipped: 0,
        totalSubscriptions: 0,
        error: getErrorMessage(error, "Failed to send test push notification."),
      },
      { status: 500 }
    );
  }
}