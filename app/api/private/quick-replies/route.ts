import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [] });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("artipilot_quick_replies")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const body = await request.json();
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();

  if (!title || !content) {
    return NextResponse.json(
      { error: "title and content are required" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("artipilot_quick_replies")
    .insert({ title, content })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
