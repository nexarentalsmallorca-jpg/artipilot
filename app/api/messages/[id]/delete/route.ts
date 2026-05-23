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

  const { data: message } = await supabaseAdmin
    .from("messages")
    .select("id, direction, sender_type")
    .eq("id", id)
    .maybeSingle();

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (mode === "me") {
    await deleteMessageForMe(id);
    return NextResponse.json({ ok: true, mode: "me" });
  }

  const outbound =
    message.direction === "outbound" &&
    (message.sender_type === "admin" || message.sender_type === "ai");

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
