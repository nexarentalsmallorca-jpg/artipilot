import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceIdForAdmin, requireAdminApiUser } from "@/lib/auth/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DB } from "@/lib/db/tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type KnowledgeRow = {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function tableMissing(error: unknown) {
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  return message.includes("does not exist") || message.includes("schema cache");
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser(request);
  if (auth.error) return auth.error;

  const workspaceId = await getWorkspaceIdForAdmin(auth.user.id);
  if (!workspaceId) {
    return NextResponse.json({ items: [] });
  }

  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";

  const { data, error } = await supabaseAdmin
    .from(DB.trainingKnowledge)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (tableMissing(error)) {
      return NextResponse.json({ items: [], warning: "training_knowledge table not migrated yet" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let items = (data || []) as KnowledgeRow[];
  if (search) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(search) ||
        item.content.toLowerCase().includes(search) ||
        String(item.category || "").toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ items });
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
    content?: string;
    category?: string;
    is_active?: boolean;
    delete?: boolean;
  };

  if (body.delete && body.id) {
    const { error } = await supabaseAdmin
      .from(DB.trainingKnowledge)
      .delete()
      .eq("id", body.id)
      .eq("workspace_id", workspaceId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const payload = {
    workspace_id: workspaceId,
    title,
    content,
    category: String(body.category || "General").trim() || "General",
    is_active: body.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  if (body.id) {
    const { data, error } = await supabaseAdmin
      .from(DB.trainingKnowledge)
      .update(payload)
      .eq("id", body.id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ item: data });
  }

  const { data, error } = await supabaseAdmin
    .from(DB.trainingKnowledge)
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
