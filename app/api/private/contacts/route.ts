import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import {
  blockContact,
  clearContactHumanAttention,
  listContacts,
  markContactHumanAttention,
  markContactRead,
  unblockContact,
  updateContactAi,
} from "@/lib/db/private-inbox";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  try {
    const json = JSON.stringify(error);

    if (json && json !== "{}") {
      return json;
    }
  } catch {
    // Ignore JSON stringify error.
  }

  return fallback;
}

export async function GET(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ contacts: [] });
  }

  try {
    const contacts = await listContacts();

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("[ARTIPILOT_CONTACTS_GET]", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Failed to load contacts"),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  let body: {
    contact_id?: unknown;
    id?: unknown;
    ai_enabled?: unknown;
    mark_read?: unknown;
    blocked?: unknown;
    needs_human_attention?: unknown;
    human_attention_reason?: unknown;
    action?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const id = cleanString(body.contact_id || body.id);

  if (!id) {
    return NextResponse.json(
      { error: "contact_id required" },
      { status: 400 }
    );
  }

  const action = cleanString(body.action).toLowerCase();

  try {
    if (typeof body.ai_enabled === "boolean") {
      const contact = await updateContactAi(id, body.ai_enabled);

      return NextResponse.json({ ok: true, contact });
    }

    if (body.mark_read === true || action === "mark_read") {
      await markContactRead(id);

      return NextResponse.json({ ok: true });
    }

    if (body.blocked === true || action === "block") {
      const contact = await blockContact(id);

      return NextResponse.json({ ok: true, contact });
    }

    if (body.blocked === false || action === "unblock") {
      const contact = await unblockContact(id);

      return NextResponse.json({ ok: true, contact });
    }

    if (body.needs_human_attention === true || action === "human_attention") {
      const contact = await markContactHumanAttention(
        id,
        cleanString(body.human_attention_reason) ||
          "Marked manually for human attention."
      );

      return NextResponse.json({ ok: true, contact });
    }

    if (
      body.needs_human_attention === false ||
      action === "clear_human_attention"
    ) {
      const contact = await clearContactHumanAttention(id);

      return NextResponse.json({ ok: true, contact });
    }

    return NextResponse.json({ error: "No valid update" }, { status: 400 });
  } catch (error) {
    console.error("[ARTIPILOT_CONTACTS_PATCH]", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Update failed"),
      },
      { status: 500 }
    );
  }
}