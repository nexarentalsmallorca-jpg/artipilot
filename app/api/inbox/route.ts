import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { loadUnifiedInbox } from "@/lib/inbox/unifiedLoad";
import { isPrivateSchemaReady } from "@/lib/whatsapp/syncToPrivate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  try {
    const contactId = request.nextUrl.searchParams.get("contact_id");
    const data = await loadUnifiedInbox(contactId);
    const schemaReady = await isPrivateSchemaReady();

    return NextResponse.json({
      ...data,
      schema_ready: schemaReady,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Inbox load failed";
    console.error("Inbox API error:", message);
    return NextResponse.json(
      {
        error: message,
        hint:
          "Run supabase/migrations/002_private_whatsapp_schema.sql in Supabase. Check WHATSAPP_* env vars and webhook URL in Meta.",
      },
      { status: 500 }
    );
  }
}
