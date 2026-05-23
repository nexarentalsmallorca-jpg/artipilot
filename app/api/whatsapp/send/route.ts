import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import {
  sendByPhone,
  sendDashboardMessage,
} from "@/lib/whatsapp/sendMessage";
import { normalizePhone } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      contact_id?: string;
      to?: string;
      body?: string;
      message?: string;
    };

    const contactId = String(body.contact_id || "").trim();
    const to = normalizePhone(String(body.to || ""));
    const text = String(body.body || body.message || "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "Message body is required" },
        { status: 400 }
      );
    }

    if (to) {
      const result = await sendByPhone(to, text);
      return NextResponse.json(result);
    }

    if (!contactId) {
      return NextResponse.json(
        { error: "Provide contact_id or to (phone number)" },
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
