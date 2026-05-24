import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { isOpenAiConfigured } from "@/lib/ai/generateReply";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { isWhatsAppConfigured } from "@/lib/whatsapp/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requirePrivateSession(request);
  if (denied) return denied;

  return NextResponse.json({
    whatsappConfigured: isWhatsAppConfigured(),
    openAiConfigured: isOpenAiConfigured(),
    supabaseConfigured: isSupabaseConfigured(),
    privateDomain:
      process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com",
    webhookUrl: "https://private.artipilot.com/api/whatsapp/webhook",
  });
}
