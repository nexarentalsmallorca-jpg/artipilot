import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { generateAiReply, isOpenAiConfigured } from "@/lib/ai/generateReply";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  if (!isOpenAiConfigured()) {
    return NextResponse.json(
      { error: "OpenAI is not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const contactId = String(body.contact_id || "");

  if (!contactId) {
    return NextResponse.json({ error: "contact_id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: messages, error } = await db
    .from("artipilot_messages")
    .select("direction, body, created_at")
    .eq("contact_id", contactId)
    .eq("deleted_for_me", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lastInbound = (messages || []).find((m) => m.direction === "inbound");
  if (!lastInbound?.body) {
    return NextResponse.json(
      { error: "No inbound message to reply to" },
      { status: 400 }
    );
  }

  const history = (messages || [])
    .reverse()
    .filter((m) => m.body)
    .map((m) => ({
      role:
        m.direction === "inbound"
          ? ("user" as const)
          : ("assistant" as const),
      content: String(m.body),
    }));

  try {
    const suggestion = await generateAiReply({
      customerMessage: String(lastInbound.body),
      recentMessages: history,
    });
    return NextResponse.json({ suggestion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI suggestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
