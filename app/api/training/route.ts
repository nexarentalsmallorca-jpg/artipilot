import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";

  const { data, error } = await supabaseAdmin
    .from("training_knowledge")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let items = data || [];
  if (q) {
    items = items.filter(
      (row) =>
        String(row.title).toLowerCase().includes(q) ||
        String(row.content).toLowerCase().includes(q) ||
        String(row.category || "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const body = await request.json();
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("training_knowledge")
    .insert({
      title: String(body.title || "").trim(),
      category: String(body.category || "General").trim(),
      content: String(body.content || "").trim(),
      active: body.active !== false,
      created_at: now,
      updated_at: now,
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
  const id = String(body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("training_knowledge")
    .update({
      title: body.title !== undefined ? String(body.title).trim() : undefined,
      category:
        body.category !== undefined ? String(body.category).trim() : undefined,
      content:
        body.content !== undefined ? String(body.content).trim() : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
      updated_at: new Date().toISOString(),
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

  const { error } = await supabaseAdmin
    .from("training_knowledge")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
