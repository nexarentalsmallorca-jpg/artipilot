import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { deleteChat } from "@/lib/db/private-inbox";
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

export async function DELETE(request: NextRequest) {
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
  };

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const contactId =
    cleanString(body.contact_id || body.id) ||
    cleanString(request.nextUrl.searchParams.get("contact_id")) ||
    cleanString(request.nextUrl.searchParams.get("id"));

  if (!contactId) {
    return NextResponse.json(
      { error: "contact_id required" },
      { status: 400 }
    );
  }

  try {
    await deleteChat(contactId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ARTIPILOT_CHAT_DELETE]", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Failed to delete chat"),
      },
      { status: 500 }
    );
  }
}