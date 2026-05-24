import { NextRequest, NextResponse } from "next/server";
import {
  hasPrivateSessionFromRequest,
  requirePrivateSession,
} from "@/lib/auth/private-session";
import { isOpenAiConfigured } from "@/lib/ai/generateReply";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { isWhatsAppConfigured } from "@/lib/whatsapp/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  let totalContacts = 0;
  let totalMessages = 0;

  if (isSupabaseConfigured()) {
    const db = getSupabaseAdmin();
    const { count: contactCount } = await db
      .from("artipilot_contacts")
      .select("*", { count: "exact", head: true });
    const { count: messageCount } = await db
      .from("artipilot_messages")
      .select("*", { count: "exact", head: true });
    totalContacts = contactCount ?? 0;
    totalMessages = messageCount ?? 0;
  }

  return NextResponse.json({
    hasPrivateSession: hasPrivateSessionFromRequest(request),
    supabaseConfigured: isSupabaseConfigured(),
    whatsappTokenConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
    whatsappPhoneNumberIdConfigured: Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
    ),
    openAiConfigured: isOpenAiConfigured(),
    totalContacts,
    totalMessages,
  });
}
