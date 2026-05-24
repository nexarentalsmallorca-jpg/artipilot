import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { generateAiReply, isOpenAiConfigured } from "@/lib/ai/generateReply";
import { listMessagesForContact } from "@/lib/db/private-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = await requirePrivateSession(request);
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

  try {
    const messages = await listMessagesForContact(contactId);
    const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");

    if (!lastInbound?.body) {
      return NextResponse.json(
        { error: "No inbound message to reply to" },
        { status: 400 }
      );
    }

    const history = messages
      .filter((m) => m.body)
      .map((m) => ({
        role:
          m.direction === "inbound"
            ? ("user" as const)
            : ("assistant" as const),
        content: String(m.body),
      }));

    const suggestion = await generateAiReply({
      customerMessage: String(lastInbound.body),
      recentMessages: history,
    });

    return NextResponse.json({ suggestion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI suggestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
