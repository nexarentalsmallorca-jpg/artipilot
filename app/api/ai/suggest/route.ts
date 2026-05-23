import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { generateAiSuggestion } from "@/lib/ai";
import { getContactById } from "@/lib/db/contacts";
import { getRecentMessagesForAi } from "@/lib/db/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as { contact_id?: string };
    const contactId = String(body.contact_id || "").trim();
    if (!contactId) {
      return NextResponse.json({ error: "contact_id required" }, { status: 400 });
    }

    const contact = await getContactById(contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const recent = await getRecentMessagesForAi(contactId, 10);
    const lastCustomer =
      [...recent].reverse().find((m) => m.sender_type === "customer")?.body ||
      "Hello";

    const suggestion = await generateAiSuggestion(
      contactId,
      lastCustomer,
      contact.name || contact.profile_name
    );

    return NextResponse.json({ suggestion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Suggestion failed" },
      { status: 500 }
    );
  }
}
