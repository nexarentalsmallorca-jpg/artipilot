import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from("quick_replies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from("quick_replies")
    .insert({
      title: String(body.title || "").trim(),
      content: String(body.content || "").trim(),
      category: body.category ? String(body.category).trim() : null,
      active: body.active !== false,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

export async function PATCH(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const body = await request.json();
  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("quick_replies")
    .update({
      title: body.title !== undefined ? String(body.title).trim() : undefined,
      content:
        body.content !== undefined ? String(body.content).trim() : undefined,
      category:
        body.category !== undefined ? String(body.category).trim() : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("quick_replies").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
