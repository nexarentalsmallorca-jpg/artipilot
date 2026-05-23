import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getWebhookUrl, getWhatsAppConfig } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const wa = getWhatsAppConfig();

  const [contactsRes, messagesRes, lastMsgRes] = await Promise.all([
    supabaseAdmin.from("contacts").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("messages").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("messages")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    whatsappTokenConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    whatsappPhoneNumberIdConfigured: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    webhookUrl: getWebhookUrl(),
    totalContacts: contactsRes.count || 0,
    totalMessages: messagesRes.count || 0,
    lastMessageAt: lastMsgRes.data?.created_at || null,
    whatsappConfigured: Boolean(wa),
    privateDomain: process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com",
    timestamp: new Date().toISOString(),
  });
}
