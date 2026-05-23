import { NextRequest, NextResponse } from "next/server";
import { listMessagesForContact } from "@/lib/db/messages";
import { markContactRead } from "@/lib/db/contacts";
import {
  hasPrivateSessionFromRequest,
  unauthorizedJson,
} from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasPrivateSessionFromRequest(request)) {
    return unauthorizedJson();
  }

  const contactId = request.nextUrl.searchParams.get("contact_id")?.trim();
  if (!contactId) {
    return NextResponse.json({ error: "contact_id is required" }, { status: 400 });
  }

  try {
    const messages = await listMessagesForContact(contactId);
    await markContactRead(contactId);
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load messages" },
      { status: 500 }
    );
  }
}
