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

function isEnvSet(name: string) {
  return Boolean(process.env[name]?.trim());
}

function removeTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getRequestHost(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");

  return cleanEnv(forwardedHost || host || "");
}

function getPrivateDomain(request: NextRequest) {
  const envHost = cleanEnv(process.env.PRIVATE_DASHBOARD_HOST);

  if (envHost) {
    return removeTrailingSlash(envHost);
  }

  const requestHost = getRequestHost(request);

  if (requestHost) {
    return removeTrailingSlash(requestHost);
  }

  return "private.artipilot.com";
}

function getBaseUrl(request: NextRequest) {
  const privateDomain = getPrivateDomain(request);

  if (privateDomain.startsWith("http://")) {
    return removeTrailingSlash(privateDomain);
  }

  if (privateDomain.startsWith("https://")) {
    return removeTrailingSlash(privateDomain);
  }

  const isLocal =
    privateDomain.startsWith("localhost") ||
    privateDomain.startsWith("127.0.0.1");

  const forwardedProto = cleanEnv(request.headers.get("x-forwarded-proto") || "");
  const protocol = forwardedProto || (isLocal ? "http" : "https");

  return removeTrailingSlash(`${protocol}://${privateDomain}`);
}

export async function GET(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  const privateDomain = getPrivateDomain(request);
  const baseUrl = getBaseUrl(request);

  const whatsappTokenConfigured = isEnvSet("WHATSAPP_ACCESS_TOKEN");
  const whatsappPhoneNumberIdConfigured = isEnvSet("WHATSAPP_PHONE_NUMBER_ID");
  const whatsappVerifyTokenConfigured = isEnvSet("WHATSAPP_VERIFY_TOKEN");
  const openAiConfigured = isOpenAiConfigured();
  const supabaseConfigured = isSupabaseConfigured();
  const whatsappConfigured = isWhatsAppConfigured();

  return NextResponse.json({
    privateDomain,
    baseUrl,
    webhookUrl: `${baseUrl}/api/whatsapp/webhook`,

    whatsappConfigured,
    whatsappTokenConfigured,
    whatsappPhoneNumberIdConfigured,
    whatsappVerifyTokenConfigured,
    openAiConfigured,
    supabaseConfigured,

    canReceiveMessages: supabaseConfigured && whatsappVerifyTokenConfigured,
    canSendMessages:
      supabaseConfigured &&
      whatsappTokenConfigured &&
      whatsappPhoneNumberIdConfigured,
    canAutoReply:
      supabaseConfigured &&
      whatsappTokenConfigured &&
      whatsappPhoneNumberIdConfigured &&
      openAiConfigured,
  });
}