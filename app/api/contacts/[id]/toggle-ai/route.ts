import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiUser, getWorkspaceIdForAdmin } from "@/lib/auth/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DB } from "@/lib/db/tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApiUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = (await request.json()) as { enabled?: boolean; pause?: boolean };
  const workspaceId = await getWorkspaceIdForAdmin(auth.user.id);

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;
  const pause = body.pause === true;

  const update: Record<string, unknown> = {};
  if (enabled !== undefined) update.ai_enabled = enabled;
  if (pause) {
    update.ai_enabled = false;
    update.artipilot_extras = { ai_paused_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from(DB.contacts)
    .update(update)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id, ai_enabled")
    .maybeSingle();

  if (error) {
    const fallback = await supabaseAdmin
      .from(DB.contacts)
      .update({ ai_enabled: enabled })
      .eq("id", id)
      .select("id, ai_enabled")
      .maybeSingle();

    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    return NextResponse.json({ contact: fallback.data });
  }

  return NextResponse.json({ contact: data });
}
