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

function getErrorText(error: unknown) {
  return String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      (error as { hint?: string })?.hint ||
      error ||
      ""
  );
}

function isMissingTableOrColumn(error: unknown) {
  const text = getErrorText(error).toLowerCase();

  return (
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("could not find") ||
    text.includes("relation") ||
    text.includes("column")
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  const text = getErrorText(error);

  return text || fallback;
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

  if (!isMissingTableOrColumn(simpleQuery.error)) {
    return {
      data: [],
      error: simpleQuery.error,
    };
  }

  const minimalQuery = await db.from(tableName).select("id,title,content");

  if (!minimalQuery.error) {
    return {
      data: minimalQuery.data || [],
      error: null,
    };
  }

  return {
    data: [],
    error: minimalQuery.error,
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

  const payloads: Record<string, unknown>[] = [
    {
      title,
      content,
      active: true,
      created_at: now,
      updated_at: now,
    },
    {
      title,
      content,
      active: true,
      created_at: now,
    },
    {
      title,
      content,
    },
  ];

  let lastError: unknown = null;

  for (const payload of payloads) {
    const insert = await db
      .from(tableName)
      .insert(payload)
      .select("id,title,content,active,created_at")
      .single();

    if (!insert.error && insert.data) {
      return insert.data;
    }

    lastError = insert.error;

    if (!isMissingTableOrColumn(insert.error)) {
      throw insert.error;
    }
  }

  throw lastError;
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
      items: (rows || [])
        .map((row) => normalizeQuickReply(row as QuickReplyRow))
        .filter((item) => item.content),
    });
  } catch (error) {
    console.error("[ARTIPILOT_QUICK_REPLIES_GET]", error);

    return NextResponse.json(
      {
        items: [],
        error: getErrorMessage(error, "Failed to load quick replies."),
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
    console.error("[ARTIPILOT_QUICK_REPLIES_POST]", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Failed to add quick reply."),
      },
      { status: 500 }
    );
  }
}