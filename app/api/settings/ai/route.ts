import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceIdForAdmin, requireAdminApiUser } from "@/lib/auth/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DB } from "@/lib/db/tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AiSettingsRow = {
  workspace_id: string;
  ai_name: string | null;
  tone: string | null;
  main_job: string | null;
  business_rules: string | null;
  handoff_rules: string | null;
  same_language_reply: boolean | null;
  short_human_reply: boolean | null;
};

function tableMissing(error: unknown) {
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  return message.includes("does not exist") || message.includes("schema cache");
}

async function loadWorkspaceFallback(workspaceId: string) {
  const { data } = await supabaseAdmin
    .from(DB.workspaces)
    .select("id, business_name, ai_job, business_rules, main_language")
    .eq("id", workspaceId)
    .maybeSingle();

  return data;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser(request);
  if (auth.error) return auth.error;

  const workspaceId = await getWorkspaceIdForAdmin(auth.user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from(DB.aiSettings)
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!error && data) {
    return NextResponse.json({ settings: data });
  }

  if (error && !tableMissing(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const workspace = await loadWorkspaceFallback(workspaceId);
  const fallback: AiSettingsRow = {
    workspace_id: workspaceId,
    ai_name: workspace?.business_name || "Artipilot",
    tone: "Friendly and professional",
    main_job: workspace?.ai_job || "",
    business_rules: workspace?.business_rules || "",
    handoff_rules: "If the customer asks for a human, pause AI and notify the team.",
    same_language_reply: true,
    short_human_reply: true,
  };

  return NextResponse.json({ settings: fallback, source: "workspace_fallback" });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser(request);
  if (auth.error) return auth.error;

  const workspaceId = await getWorkspaceIdForAdmin(auth.user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<AiSettingsRow>;
  const payload = {
    workspace_id: workspaceId,
    ai_name: String(body.ai_name || "Artipilot").trim(),
    tone: String(body.tone || "").trim(),
    main_job: String(body.main_job || "").trim(),
    business_rules: String(body.business_rules || "").trim(),
    handoff_rules: String(body.handoff_rules || "").trim(),
    same_language_reply: body.same_language_reply !== false,
    short_human_reply: body.short_human_reply !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from(DB.aiSettings)
    .upsert(payload, { onConflict: "workspace_id" })
    .select("*")
    .single();

  if (error && tableMissing(error)) {
    await supabaseAdmin
      .from(DB.workspaces)
      .update({
        business_name: payload.ai_name,
        ai_job: payload.main_job,
        business_rules: payload.business_rules,
        ai_live: true,
      })
      .eq("id", workspaceId);

    return NextResponse.json({ settings: payload, source: "workspace_fallback" });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin
    .from(DB.workspaces)
    .update({
      business_name: payload.ai_name,
      ai_job: payload.main_job,
      business_rules: payload.business_rules,
      ai_live: true,
    })
    .eq("id", workspaceId);

  return NextResponse.json({ settings: data });
}
