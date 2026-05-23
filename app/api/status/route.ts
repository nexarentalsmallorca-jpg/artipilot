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

  const [
    contactsRes,
    messagesRes,
    aiContactsRes,
    lastInboundRes,
    lastOutboundRes,
  ] = await Promise.all([
    supabaseAdmin.from("contacts").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("messages").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("ai_enabled", true),
    supabaseAdmin
      .from("messages")
      .select("created_at")
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("messages")
      .select("created_at")
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    private_domain: process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com",
    security: "password protected",
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    openai: Boolean(process.env.OPENAI_API_KEY),
    whatsapp: {
      configured: Boolean(wa),
      phone_number_id: wa?.phoneNumberId || null,
      verify_token_set: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    },
    webhook_url: getWebhookUrl(),
    last_inbound_at: lastInboundRes.data?.created_at || null,
    last_outbound_at: lastOutboundRes.data?.created_at || null,
    total_contacts: contactsRes.count || 0,
    total_messages: messagesRes.count || 0,
    total_ai_on_contacts: aiContactsRes.count || 0,
    timestamp: new Date().toISOString(),
  });
}
