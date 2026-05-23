import { NextRequest, NextResponse } from "next/server";
import {
  createManualContact,
  listContacts,
} from "@/lib/db/contacts";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  hasPrivateSessionFromRequest,
  unauthorizedJson,
} from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function withLastMessagePreview(
  contacts: Awaited<ReturnType<typeof listContacts>>
) {
  if (!contacts.length) return [];

  const ids = contacts.map((c) => c.id);
  const { data: messages } = await supabaseAdmin
    .from("messages")
    .select("contact_id, body, created_at")
    .in("contact_id", ids)
    .eq("deleted_for_me", false)
    .order("created_at", { ascending: false });

  const previewByContact: Record<string, string> = {};
  for (const row of messages || []) {
    if (!previewByContact[row.contact_id]) {
      previewByContact[row.contact_id] = String(row.body || "").slice(0, 120);
    }
  }

  return contacts.map((c) => ({
    ...c,
    last_message_preview: previewByContact[c.id] || "",
  }));
}

export async function GET(request: NextRequest) {
  if (!hasPrivateSessionFromRequest(request)) {
    return unauthorizedJson();
  }

  try {
    const contacts = await listContacts();
    const withPreview = await withLastMessagePreview(contacts);
    return NextResponse.json({ contacts: withPreview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load contacts";
    const hint = message.includes("does not exist")
      ? "Run supabase/migrations/001_private_whatsapp_dashboard.sql in Supabase SQL editor."
      : undefined;
    return NextResponse.json({ error: message, hint }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasPrivateSessionFromRequest(request)) {
    return unauthorizedJson();
  }

  try {
    const body = (await request.json()) as { phone?: string; name?: string };
    const phone = String(body.phone || "").trim();
    const name = body.name ? String(body.name).trim() : null;

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    const contact = await createManualContact({ phone, name });
    return NextResponse.json({ contact });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create contact" },
      { status: 500 }
    );
  }
}
