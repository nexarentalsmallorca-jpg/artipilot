import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ contacts: [] });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("artipilot_contacts")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contacts: data || [] });
}

export async function PATCH(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const body = await request.json();
  const id = String(body.contact_id || body.id || "");
  if (!id) {
    return NextResponse.json({ error: "contact_id required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.ai_enabled === "boolean") {
    updates.ai_enabled = body.ai_enabled;
  }

  if (body.mark_read === true) {
    updates.unread_count = 0;
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("artipilot_contacts")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contact: data });
}
