import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceIdForAdmin, requireAdminApiUser } from "@/lib/auth/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DB } from "@/lib/db/tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser(request);
  if (auth.error) return auth.error;

  const workspaceId = await getWorkspaceIdForAdmin(auth.user.id);
  if (!workspaceId) return NextResponse.json({ items: [] });

  const { data, error } = await supabaseAdmin
    .from(DB.quickReplies)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ items: [], warning: error.message });
  }

  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser(request);
  if (auth.error) return auth.error;

  const workspaceId = await getWorkspaceIdForAdmin(auth.user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    id?: string;
    title?: string;
    message?: string;
    delete?: boolean;
  };

  if (body.delete && body.id) {
    await supabaseAdmin.from(DB.quickReplies).delete().eq("id", body.id).eq("workspace_id", workspaceId);
    return NextResponse.json({ ok: true });
  }

  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();
  if (!title || !message) {
    return NextResponse.json({ error: "Title and message required" }, { status: 400 });
  }

  if (body.id) {
    const { data, error } = await supabaseAdmin
      .from(DB.quickReplies)
      .update({ title, message, updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  }

  const { data, error } = await supabaseAdmin
    .from(DB.quickReplies)
    .insert({
      workspace_id: workspaceId,
      title,
      message,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
