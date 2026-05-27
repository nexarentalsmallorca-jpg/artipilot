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

function isSchemaError(error: unknown) {
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

async function ensurePushSubscriptionsTable() {
  const db = getSupabaseAdmin();

  /*
    Best table to create in Supabase:

    create table if not exists artipilot_push_subscriptions (
      id uuid primary key default gen_random_uuid(),
      endpoint text not null unique,
      p256dh text not null,
      auth text not null,
      user_agent text,
      enabled boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  */

  return db;
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

  let body: PushSubscriptionBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const endpoint = cleanString(body.endpoint);
  const p256dh = cleanString(body.keys?.p256dh);
  const auth = cleanString(body.keys?.auth);
  const userAgent = cleanString(body.userAgent);

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      {
        error:
          "Invalid push subscription. endpoint, keys.p256dh and keys.auth are required.",
      },
      { status: 400 }
    );
  }

  try {
    const db = await ensurePushSubscriptionsTable();
    const now = new Date().toISOString();

    const payload = {
      endpoint,
      p256dh,
      auth,
      user_agent:
        userAgent || request.headers.get("user-agent") || "Unknown browser",
      enabled: true,
      updated_at: now,
    };

    const primary = await db
      .from("artipilot_push_subscriptions")
      .upsert(payload, {
        onConflict: "endpoint",
      })
      .select("id, endpoint, enabled, created_at, updated_at")
      .single();

    if (!primary.error && primary.data) {
      return NextResponse.json({
        ok: true,
        subscription: primary.data,
      });
    }

    if (!isSchemaError(primary.error)) {
      throw primary.error;
    }

    return NextResponse.json(
      {
        error:
          "Supabase table artipilot_push_subscriptions does not exist yet. Create it in Supabase SQL editor first.",
        sql: `create table if not exists artipilot_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("[ARTIPILOT_PUSH_SUBSCRIPTION_POST]", error);

    return NextResponse.json(
      {
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

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
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
      { error: "endpoint is required." },
      { status: 400 }
    );
  }

  try {
    const db = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { error } = await db
      .from("artipilot_push_subscriptions")
      .update({
        enabled: false,
        updated_at: now,
      })
      .eq("endpoint", endpoint);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ARTIPILOT_PUSH_SUBSCRIPTION_DELETE]", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Failed to disable push subscription."),
      },
      { status: 500 }
    );
  }
}