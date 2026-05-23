import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { listContacts, markContactRead } from "@/lib/db/contacts";
import { listMessagesForContact } from "@/lib/db/messages";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadLastPreviews(contactIds: string[]) {
  const map: Record<string, string> = {};
  if (!contactIds.length) return map;

  const { data } = await supabaseAdmin
    .from("messages")
    .select("contact_id, body, created_at")
    .in("contact_id", contactIds)
    .eq("deleted_for_me", false)
    .order("created_at", { ascending: false });

  for (const row of data || []) {
    if (!map[row.contact_id]) {
      map[row.contact_id] = String(row.body || "").slice(0, 120);
    }
  }
  return map;
}

export async function GET(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  try {
    const contactId = request.nextUrl.searchParams.get("contact_id");
    const contacts = await listContacts();
    const previews = await loadLastPreviews(contacts.map((c) => c.id));

    const contactsWithPreview = contacts.map((c) => ({
      ...c,
      last_message_preview: previews[c.id] || "",
    }));

    if (!contactId) {
      return NextResponse.json({ contacts: contactsWithPreview, messages: [] });
    }

    const messages = await listMessagesForContact(contactId);
    await markContactRead(contactId);

    return NextResponse.json({
      contacts: contactsWithPreview,
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inbox load failed" },
      { status: 500 }
    );
  }
}
