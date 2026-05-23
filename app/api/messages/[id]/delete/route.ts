import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import {
  deleteMessageForEveryone,
  deleteMessageForMe,
} from "@/lib/db/messages";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const { id } = await context.params;
  const body = (await request.json()) as { mode?: "me" | "everyone" };
  const mode = body.mode === "everyone" ? "everyone" : "me";

  const { data: privateMsg } = await supabaseAdmin
    .from("messages")
    .select("id, direction, sender_type")
    .eq("id", id)
    .maybeSingle();

  if (privateMsg?.id) {
    if (mode === "me") {
      await deleteMessageForMe(id);
      return NextResponse.json({ ok: true, mode: "me" });
    }

    const outbound =
      privateMsg.direction === "outbound" &&
      (privateMsg.sender_type === "admin" || privateMsg.sender_type === "ai");

    if (!outbound) {
      return NextResponse.json(
        { error: "Delete for everyone only allowed on outbound messages" },
        { status: 400 }
      );
    }

    await deleteMessageForEveryone(id);
    return NextResponse.json({
      ok: true,
      mode: "everyone",
      warning:
        "Deleted inside Artipilot. WhatsApp customer-side deletion may not be supported by the API.",
    });
  }

  const { data: legacyMsg } = await supabaseAdmin
    .from("artipilot_messages")
    .select("id, direction, role, hidden_for_user_ids")
    .eq("id", id)
    .maybeSingle();

  if (!legacyMsg?.id) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (mode === "me") {
    const hidden = Array.isArray(legacyMsg.hidden_for_user_ids)
      ? legacyMsg.hidden_for_user_ids
      : [];
    await supabaseAdmin
      .from("artipilot_messages")
      .update({ hidden_for_user_ids: [...hidden, "private-dashboard"] })
      .eq("id", id);
    return NextResponse.json({ ok: true, mode: "me" });
  }

  if (legacyMsg.direction !== "outbound") {
    return NextResponse.json(
      { error: "Delete for everyone only allowed on outbound messages" },
      { status: 400 }
    );
  }

  await supabaseAdmin
    .from("artipilot_messages")
    .update({
      deleted_for_everyone: true,
      content: "This message was deleted.",
    })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    mode: "everyone",
    warning:
      "Deleted inside Artipilot. WhatsApp customer-side deletion may not be supported by the API.",
  });
}
