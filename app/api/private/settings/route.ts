import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { isOpenAiConfigured } from "@/lib/ai/generateReply";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { isWhatsAppConfigured } from "@/lib/whatsapp/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanEnv(value: string | undefined) {
  return String(value || "").trim();
}

function getPrivateDomain(request: NextRequest) {
  const envHost = cleanEnv(process.env.PRIVATE_DASHBOARD_HOST);

  if (envHost) {
    return envHost;
  }

  const requestHost = request.headers.get("host");

  if (requestHost) {
    return requestHost;
  }

  return "private.artipilot.com";
}

function getBaseUrl(request: NextRequest) {
  const privateDomain = getPrivateDomain(request);

  if (privateDomain.startsWith("http://")) {
    return privateDomain.replace(/\/$/, "");
  }

  if (privateDomain.startsWith("https://")) {
    return privateDomain.replace(/\/$/, "");
  }

  const isLocal =
    privateDomain.startsWith("localhost") ||
    privateDomain.startsWith("127.0.0.1");

  return `${isLocal ? "http" : "https"}://${privateDomain}`.replace(/\/$/, "");
}

function isEnvSet(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  const privateDomain = getPrivateDomain(request);
  const baseUrl = getBaseUrl(request);

  return NextResponse.json({
    whatsappConfigured: isWhatsAppConfigured(),
    whatsappTokenConfigured: isEnvSet("WHATSAPP_ACCESS_TOKEN"),
    whatsappPhoneNumberIdConfigured: isEnvSet("WHATSAPP_PHONE_NUMBER_ID"),
    whatsappVerifyTokenConfigured: isEnvSet("WHATSAPP_VERIFY_TOKEN"),
    openAiConfigured: isOpenAiConfigured(),
    supabaseConfigured: isSupabaseConfigured(),
    privateDomain,
    webhookUrl: `${baseUrl}/api/whatsapp/webhook`,
  });
}