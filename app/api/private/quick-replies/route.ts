import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuickReplyRow = {
  id: string;
  title: string | null;
  content: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

const PRIMARY_TABLE = "artipilot_quick_replies";
const FALLBACK_TABLE = "quick_replies";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeQuickReply(row: QuickReplyRow) {
  return {
    id: String(row.id),
    title: cleanString(row.title) || "Quick reply",
    content: cleanString(row.content),
  };
}

function isMissingTableOrColumn(error: unknown) {
  const text = String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      (error as { hint?: string })?.hint ||
      ""
  ).toLowerCase();

  return (
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("could not find") ||
    text.includes("relation") ||
    text.includes("column")
  );
}

async function selectQuickRepliesFromTable(tableName: string) {
  const db = getSupabaseAdmin();

  const activeQuery = await db
    .from(tableName)
    .select("id,title,content,active,created_at")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (!activeQuery.error) {
    return {
      data: activeQuery.data || [],
      error: null,
    };
  }

  if (!isMissingTableOrColumn(activeQuery.error)) {
    return {
      data: [],
      error: activeQuery.error,
    };
  }

  const simpleQuery = await db
    .from(tableName)
    .select("id,title,content,created_at")
    .order("created_at", { ascending: true });

  if (!simpleQuery.error) {
    return {
      data: simpleQuery.data || [],
      error: null,
    };
  }

  return {
    data: [],
    error: simpleQuery.error,
  };
}

async function loadQuickReplies() {
  const primary = await selectQuickRepliesFromTable(PRIMARY_TABLE);

  if (!primary.error) {
    return primary.data;
  }

  if (!isMissingTableOrColumn(primary.error)) {
    throw primary.error;
  }

  const fallback = await selectQuickRepliesFromTable(FALLBACK_TABLE);

  if (!fallback.error) {
    return fallback.data;
  }

  throw fallback.error;
}

async function insertQuickReplyIntoTable(
  tableName: string,
  title: string,
  content: string
) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const fullPayload = {
    title,
    content,
    active: true,
    created_at: now,
    updated_at: now,
  };

  const simplePayload = {
    title,
    content,
  };

  const fullInsert = await db
    .from(tableName)
    .insert(fullPayload)
    .select("id,title,content,active,created_at")
    .single();

  if (!fullInsert.error && fullInsert.data) {
    return fullInsert.data;
  }

  if (!isMissingTableOrColumn(fullInsert.error)) {
    throw fullInsert.error;
  }

  const simpleInsert = await db
    .from(tableName)
    .insert(simplePayload)
    .select("id,title,content")
    .single();

  if (!simpleInsert.error && simpleInsert.data) {
    return simpleInsert.data;
  }

  throw simpleInsert.error;
}

async function insertQuickReply(title: string, content: string) {
  try {
    return await insertQuickReplyIntoTable(PRIMARY_TABLE, title, content);
  } catch (primaryError) {
    if (!isMissingTableOrColumn(primaryError)) {
      throw primaryError;
    }

    return insertQuickReplyIntoTable(FALLBACK_TABLE, title, content);
  }
}

export async function GET(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      items: [],
      warning: "Supabase is not configured.",
    });
  }

  try {
    const rows = await loadQuickReplies();

    return NextResponse.json({
      items: (rows || []).map((row) =>
        normalizeQuickReply(row as QuickReplyRow)
      ),
    });
  } catch (error) {
    console.error("Quick replies GET error:", error);

    return NextResponse.json(
      {
        items: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to load quick replies.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

  let body: { title?: unknown; content?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const title = cleanString(body.title);
  const content = cleanString(body.content);

  if (!title || !content) {
    return NextResponse.json(
      { error: "Title and content are required." },
      { status: 400 }
    );
  }

  try {
    const row = await insertQuickReply(title, content);

    return NextResponse.json({
      item: normalizeQuickReply(row as QuickReplyRow),
    });
  } catch (error) {
    console.error("Quick replies POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add quick reply.",
      },
      { status: 500 }
    );
  }
}