import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { sendDashboardMessage } from "@/lib/whatsapp/sendMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      contact_id?: string;
      body?: string;
      message?: string;
    };

    const contactId = String(body.contact_id || "").trim();
    const text = String(body.body || body.message || "").trim();

    if (!contactId || !text) {
      return NextResponse.json(
        { error: "contact_id and body are required" },
        { status: 400 }
      );
    }

    const result = await sendDashboardMessage(contactId, text);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 500 }
    );
  }
}
