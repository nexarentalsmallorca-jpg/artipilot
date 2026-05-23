import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { isPrivateSchemaReady } from "@/lib/whatsapp/syncToPrivate";
import { getWhatsAppConfig, getWebhookUrl } from "@/lib/whatsapp";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const schemaReady = await isPrivateSchemaReady();
  const wa = getWhatsAppConfig();

  let legacyContacts = 0;
  let privateContacts = 0;

  if (schemaReady) {
    const { count } = await supabaseAdmin
      .from("contacts")
      .select("id", { count: "exact", head: true });
    privateContacts = count || 0;
  }

  const { count: legacyCount } = await supabaseAdmin
    .from("artipilot_contacts")
    .select("id", { count: "exact", head: true });

  legacyContacts = legacyCount || 0;

  return NextResponse.json({
    ok: true,
    private_schema_ready: schemaReady,
    private_contacts: privateContacts,
    legacy_contacts: legacyContacts,
    whatsapp_configured: Boolean(wa),
    webhook_url: getWebhookUrl(),
    supabase_configured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  });
}
