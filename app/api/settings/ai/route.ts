import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { getAiSettings, saveAiSettings } from "@/lib/db/settings";
import type { AiSettingsMap } from "@/lib/db/types";
import { getWebhookUrl, getWhatsAppConfig } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const settings = await getAiSettings();
  const wa = getWhatsAppConfig();

  return NextResponse.json({
    settings,
    meta: {
      private_domain: process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com",
      security: "password protected",
      whatsapp_phone_number_id: wa?.phoneNumberId || null,
      webhook_url: getWebhookUrl(),
    },
  });
}

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const body = (await request.json()) as AiSettingsMap;
  await saveAiSettings(body);
  const settings = await getAiSettings();

  return NextResponse.json({ settings });
}
