import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PushSubscriptionBody = {
  endpoint?: unknown;
  expirationTime?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
  userAgent?: unknown;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  user_agent: string | null;
  enabled: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function cleanString(value: unknown): string {
  return String(value || "").trim();
}

function getErrorMessage(error: unknown, fallback: string): string {
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

function isSchemaError(error: unknown): boolean {
  const message = String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      (error as { hint?: string })?.hint ||
      ""
  ).toLowerCase();

  return (
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("does not exist") ||
    message.includes("relation")
  );
}

function maskEndpoint(endpoint: string | null | undefined): string {
  const cleanEndpoint = cleanString(endpoint);

  if (!cleanEndpoint) {
    return "";
  }

  if (cleanEndpoint.length <= 32) {
    return cleanEndpoint;
  }

  return `${cleanEndpoint.slice(0, 22)}...${cleanEndpoint.slice(-10)}`;
}

function maskKey(value: string | null | undefined): string {
  const cleanValue = cleanString(value);

  if (!cleanValue) {
    return "";
  }

  if (cleanValue.length <= 12) {
    return "***";
  }

  return `${cleanValue.slice(0, 6)}...${cleanValue.slice(-4)}`;
}

function getPushSubscriptionsTableSql(): string {
  return `create table if not exists artipilot_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`;
}

function formatSubscriptionForDebug(row: PushSubscriptionRow) {
  return {
    id: row.id,
    endpoint: maskEndpoint(row.endpoint),
    hasEndpoint: Boolean(cleanString(row.endpoint)),
    hasP256dh: Boolean(cleanString(row.p256dh)),
    hasAuth: Boolean(cleanString(row.auth)),
    p256dhPreview: maskKey(row.p256dh),
    authPreview: maskKey(row.auth),
    enabled: row.enabled === true,
    userAgent: row.user_agent || "Unknown browser",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getDbOrError() {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Supabase is not configured." },
        { status: 500 }
      ),
    };
  }

  return {
    ok: true as const,
    db: getSupabaseAdmin(),
  };
}

export async function GET(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  const dbResult = await getDbOrError();

  if (!dbResult.ok) {
    return dbResult.response;
  }

  try {
    const { data, error } = await dbResult.db
      .from("artipilot_push_subscriptions")
      .select(
        "id, endpoint, p256dh, auth, user_agent, enabled, created_at, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(25);

    if (error) {
      if (isSchemaError(error)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Supabase table artipilot_push_subscriptions does not exist yet or has missing columns.",
            sql: getPushSubscriptionsTableSql(),
          },
          { status: 500 }
        );
      }

      throw error;
    }

    const rows = ((data || []) as PushSubscriptionRow[]).map(
      formatSubscriptionForDebug
    );

    const enabledCount = rows.filter((row) => row.enabled).length;
    const disabledCount = rows.length - enabledCount;
    const validCount = rows.filter(
      (row) => row.hasEndpoint && row.hasP256dh && row.hasAuth
    ).length;

    return NextResponse.json({
      ok: true,
      totalReturned: rows.length,
      enabledCount,
      disabledCount,
      validCount,
      subscriptions: rows,
    });
  } catch (error) {
    console.error("[ARTIPILOT_PUSH_SUBSCRIPTION_GET]", error);

    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(
          error,
          "Failed to load push subscriptions debug status."
        ),
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

  const dbResult = await getDbOrError();

  if (!dbResult.ok) {
    return dbResult.response;
  }

  let body: PushSubscriptionBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const endpoint = cleanString(body.endpoint);
  const p256dh = cleanString(body.keys?.p256dh);
  const auth = cleanString(body.keys?.auth);
  const userAgent = cleanString(body.userAgent);
  const requestUserAgent = cleanString(request.headers.get("user-agent"));
  const expirationTime =
    typeof body.expirationTime === "number" ? body.expirationTime : null;

  if (!endpoint || !p256dh || !auth) {
    console.error("[ARTIPILOT_PUSH_SUBSCRIPTION_INVALID_BODY]", {
      hasEndpoint: Boolean(endpoint),
      hasP256dh: Boolean(p256dh),
      hasAuth: Boolean(auth),
      userAgent: userAgent || requestUserAgent || "Unknown browser",
    });

    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid push subscription. endpoint, keys.p256dh and keys.auth are required.",
      },
      { status: 400 }
    );
  }

  try {
    const now = new Date().toISOString();

    const payload = {
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent || requestUserAgent || "Unknown browser",
      enabled: true,
      updated_at: now,
    };

    const { data, error } = await dbResult.db
      .from("artipilot_push_subscriptions")
      .upsert(payload, {
        onConflict: "endpoint",
      })
      .select("id, endpoint, enabled, created_at, updated_at")
      .single();

    if (error) {
      if (isSchemaError(error)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Supabase table artipilot_push_subscriptions does not exist yet or has missing columns. Create/fix it in Supabase SQL editor first.",
            sql: getPushSubscriptionsTableSql(),
          },
          { status: 500 }
        );
      }

      throw error;
    }

    console.log("[ARTIPILOT_PUSH_SUBSCRIPTION_SAVED]", {
      id: data?.id,
      endpoint: maskEndpoint(endpoint),
      hasP256dh: Boolean(p256dh),
      hasAuth: Boolean(auth),
      enabled: data?.enabled,
      expirationTime,
    });

    return NextResponse.json({
      ok: true,
      subscription: {
        id: data?.id,
        endpoint: maskEndpoint(data?.endpoint),
        enabled: data?.enabled,
        created_at: data?.created_at,
        updated_at: data?.updated_at,
      },
    });
  } catch (error) {
    console.error("[ARTIPILOT_PUSH_SUBSCRIPTION_POST]", error);

    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error, "Failed to save push subscription."),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  const dbResult = await getDbOrError();

  if (!dbResult.ok) {
    return dbResult.response;
  }

  let body: { endpoint?: unknown };

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const endpoint = cleanString(body.endpoint);

  if (!endpoint) {
    return NextResponse.json(
      {
        ok: false,
        error: "endpoint is required.",
      },
      { status: 400 }
    );
  }

  try {
    const now = new Date().toISOString();

    const { error } = await dbResult.db
      .from("artipilot_push_subscriptions")
      .update({
        enabled: false,
        updated_at: now,
      })
      .eq("endpoint", endpoint);

    if (error) {
      if (isSchemaError(error)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Supabase table artipilot_push_subscriptions does not exist yet or has missing columns.",
            sql: getPushSubscriptionsTableSql(),
          },
          { status: 500 }
        );
      }

      throw error;
    }

    console.log("[ARTIPILOT_PUSH_SUBSCRIPTION_DISABLED]", {
      endpoint: maskEndpoint(endpoint),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ARTIPILOT_PUSH_SUBSCRIPTION_DELETE]", error);

    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error, "Failed to disable push subscription."),
      },
      { status: 500 }
    );
  }
}