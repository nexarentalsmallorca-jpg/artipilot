import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { listContacts, updateContactAi } from "@/lib/db/private-inbox";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requirePrivateSession(request);
  if (denied) return denied;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ contacts: [] });
  }

  try {
    const contacts = await listContacts();
    return NextResponse.json({ contacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await requirePrivateSession(request);
  if (denied) return denied;

  const body = await request.json();
  const id = String(body.contact_id || body.id || "");
  if (!id) {
    return NextResponse.json({ error: "contact_id required" }, { status: 400 });
  }

  try {
    if (typeof body.ai_enabled === "boolean") {
      const contact = await updateContactAi(id, body.ai_enabled);
      return NextResponse.json({ contact });
    }

    if (body.mark_read === true) {
      const { markContactRead } = await import("@/lib/db/private-inbox");
      await markContactRead(id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "No valid update" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
