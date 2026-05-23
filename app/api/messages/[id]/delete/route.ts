import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiUser, getWorkspaceIdForAdmin } from "@/lib/auth/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DB } from "@/lib/db/tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MessageRow = {
  id: string;
  workspace_id: string | null;
  direction: string | null;
  role: string | null;
  artipilot_extras?: Record<string, unknown> | null;
  deleted_for_everyone?: boolean | null;
  hidden_for_user_ids?: string[] | null;
};

function hasColumnError(error: unknown) {
  const message = String(
    (error as { message?: string })?.message || ""
  ).toLowerCase();
  return message.includes("column") || message.includes("does not exist");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApiUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = (await request.json()) as { mode?: "me" | "everyone" };
  const mode = body.mode === "everyone" ? "everyone" : "me";

  const workspaceId = await getWorkspaceIdForAdmin(auth.user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { data: message, error: loadError } = await supabaseAdmin
    .from(DB.messages)
    .select("id, workspace_id, direction, role, artipilot_extras, deleted_for_everyone, hidden_for_user_ids")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const row = message as MessageRow;
  if (row.workspace_id && row.workspace_id !== workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const extras = { ...(row.artipilot_extras || {}) };

  if (mode === "me") {
    const hidden = Array.isArray(row.hidden_for_user_ids)
      ? [...row.hidden_for_user_ids]
      : Array.isArray(extras.hidden_for_user_ids)
        ? [...(extras.hidden_for_user_ids as string[])]
        : [];

    if (!hidden.includes(auth.user.id)) hidden.push(auth.user.id);

    const updatePayload: Record<string, unknown> = {
      artipilot_extras: { ...extras, hidden_for_user_ids: hidden },
    };

    let { error } = await supabaseAdmin
      .from(DB.messages)
      .update({ hidden_for_user_ids: hidden, artipilot_extras: updatePayload.artipilot_extras })
      .eq("id", id);

    if (error && hasColumnError(error)) {
      ({ error } = await supabaseAdmin
        .from(DB.messages)
        .update(updatePayload)
        .eq("id", id));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode: "me" });
  }

  const outbound =
    row.direction === "outbound" ||
    row.role === "assistant" ||
    row.role === "manual";

  if (!outbound) {
    return NextResponse.json(
      { error: "Delete for everyone is only allowed on outbound messages" },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, unknown> = {
    deleted_for_everyone: true,
    content: "This message was deleted.",
    artipilot_extras: {
      ...extras,
      deleted_for_everyone: true,
      deleted_at: new Date().toISOString(),
    },
  };

  let { error } = await supabaseAdmin.from(DB.messages).update(updatePayload).eq("id", id);

  if (error && hasColumnError(error)) {
    ({ error } = await supabaseAdmin
      .from(DB.messages)
      .update({ artipilot_extras: updatePayload.artipilot_extras, content: updatePayload.content })
      .eq("id", id));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    mode: "everyone",
    warning:
      "Deleted inside Artipilot. WhatsApp customer-side deletion may not be supported by the API.",
  });
}
