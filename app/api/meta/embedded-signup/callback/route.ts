import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmbeddedSignupPayload = {
  workspaceId?: string;
  code?: string | null;
  businessId?: string | null;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  rawPayload?: unknown;
};

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
  business_name: string | null;
};

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
  };
};

type PhoneNumberDetails = {
  display_phone_number?: string;
  verified_name?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

function cleanValue(value?: string | null) {
  const clean = String(value || "").trim();
  return clean || null;
}

function getMetaAppId() {
  return (
    process.env.META_APP_ID?.trim() ||
    process.env.NEXT_PUBLIC_META_APP_ID?.trim() ||
    ""
  );
}

function getMetaAppSecret() {
  return process.env.META_APP_SECRET?.trim() || "";
}

function getGraphVersion() {
  return process.env.META_GRAPH_VERSION?.trim() || "v25.0";
}

function getTokenExpiresAt(expiresIn?: number) {
  if (!expiresIn || Number.isNaN(Number(expiresIn))) return null;

  const expiresAt = new Date(Date.now() + Number(expiresIn) * 1000);
  return expiresAt.toISOString();
}

function hasColumnError(error: unknown) {
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
    message.includes("does not exist")
  );
}

function getConnectionStatus({
  phoneNumberId,
  wabaId,
  accessToken,
  code,
}: {
  phoneNumberId: string | null;
  wabaId: string | null;
  accessToken: string | null;
  code: string | null;
}) {
  if (phoneNumberId && wabaId && accessToken) {
    return "connected";
  }

  if (code || phoneNumberId || wabaId) {
    return "pending";
  }

  return "failed";
}

async function getWorkspace(workspaceId: string) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select("id, owner_user_id, business_name")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("Embedded signup workspace lookup error:", error);
    return null;
  }

  return (data as WorkspaceRow | null) || null;
}

async function exchangeCodeForAccessToken(code: string) {
  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();
  const graphVersion = getGraphVersion();

  if (!appId) {
    throw new Error("Missing META_APP_ID or NEXT_PUBLIC_META_APP_ID");
  }

  if (!appSecret) {
    throw new Error("Missing META_APP_SECRET");
  }

  const url = new URL(
    `https://graph.facebook.com/${graphVersion}/oauth/access_token`
  );

  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json()) as MetaTokenResponse;

  if (!response.ok || data.error) {
    console.error("Meta token exchange failed:", data);

    throw new Error(
      data?.error?.message ||
        "Meta token exchange failed. Check App ID, App Secret, configuration ID, and OAuth settings."
    );
  }

  if (!data.access_token) {
    throw new Error("Meta token exchange did not return access_token");
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || "bearer",
    tokenExpiresAt: getTokenExpiresAt(data.expires_in),
    raw: data,
  };
}

async function fetchPhoneNumberDetails({
  phoneNumberId,
  accessToken,
}: {
  phoneNumberId: string | null;
  accessToken: string | null;
}) {
  if (!phoneNumberId || !accessToken) {
    return null;
  }

  try {
    const graphVersion = getGraphVersion();

    const url = new URL(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}`
    );

    url.searchParams.set(
      "fields",
      "display_phone_number,verified_name,quality_rating,platform_type"
    );
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const data = (await response.json()) as PhoneNumberDetails;

    if (!response.ok || data.error) {
      console.warn("Could not fetch WhatsApp phone number details:", data);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Phone number details fetch crashed:", error);
    return null;
  }
}

async function subscribeWabaToWebhooks({
  wabaId,
  accessToken,
}: {
  wabaId: string | null;
  accessToken: string | null;
}) {
  if (!wabaId || !accessToken) {
    return false;
  }

  try {
    const graphVersion = getGraphVersion();

    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.warn("WABA webhook subscription failed:", data);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("WABA webhook subscription crashed:", error);
    return false;
  }
}

async function saveConnection({
  workspace,
  body,
  businessId,
  wabaId,
  phoneNumberId,
  displayPhoneNumber,
  verifiedName,
  code,
  accessToken,
  tokenType,
  tokenExpiresAt,
  webhookSubscribed,
  now,
}: {
  workspace: WorkspaceRow;
  body: EmbeddedSignupPayload;
  businessId: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  code: string | null;
  accessToken: string | null;
  tokenType: string | null;
  tokenExpiresAt: string | null;
  webhookSubscribed: boolean;
  now: string;
}) {
  const status = getConnectionStatus({
    phoneNumberId,
    wabaId,
    accessToken,
    code,
  });

  const rawPayload = {
    received_body: body,
    saved_at: now,
    token_exchanged: Boolean(accessToken),
    webhook_subscribed: webhookSubscribed,
  };

  const mainPayload = {
    workspace_id: workspace.id,
    owner_user_id: workspace.owner_user_id,
    provider: "meta_embedded_signup",
    status,
    waba_id: wabaId,
    business_id: businessId,
    phone_number_id: phoneNumberId,
    display_phone_number: displayPhoneNumber,
    verified_name: verifiedName,
    oauth_code: code,
    access_token: accessToken,
    token_type: tokenType,
    token_expires_at: tokenExpiresAt,
    webhook_subscribed: webhookSubscribed,
    raw_payload: rawPayload,
    last_connected_at: now,
    updated_at: now,
  };

  const legacyPayload = {
    workspace_id: workspace.id,
    owner_user_id: workspace.owner_user_id,
    provider: "meta_embedded_signup",
    status,
    waba_id: wabaId,
    meta_business_id: businessId,
    phone_number_id: phoneNumberId,
    display_phone_number: displayPhoneNumber,
    verified_name: verifiedName,
    oauth_code: code,
    access_token: accessToken,
    token_type: tokenType,
    token_expires_at: tokenExpiresAt,
    webhook_subscribed: webhookSubscribed,
    raw_payload: rawPayload,
    last_connected_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from("artipilot_whatsapp_connections")
    .upsert(mainPayload, {
      onConflict: "workspace_id",
    })
    .select("*")
    .single();

  if (!error) {
    return data;
  }

  if (!hasColumnError(error)) {
    console.error("Meta connection save error:", error);
    throw new Error(error.message || "Could not save Meta connection");
  }

  console.warn(
    "Meta connection save used legacy fallback because of schema difference:",
    error.message
  );

  const fallback = await supabaseAdmin
    .from("artipilot_whatsapp_connections")
    .upsert(legacyPayload, {
      onConflict: "workspace_id",
    })
    .select("*")
    .single();

  if (fallback.error) {
    console.error("Meta connection legacy save error:", fallback.error);
    throw new Error(
      fallback.error.message || "Could not save Meta connection"
    );
  }

  return fallback.data;
}

async function updateWorkspaceConnectionStatus({
  workspace,
  connected,
}: {
  workspace: WorkspaceRow;
  connected: boolean;
}) {
  const { error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .update({
      whatsapp_connected: connected,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspace.id)
    .eq("owner_user_id", workspace.owner_user_id);

  if (error) {
    console.error("Workspace WhatsApp connected update error:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EmbeddedSignupPayload;

    const workspaceId = cleanValue(body.workspaceId);
    const code = cleanValue(body.code);
    const businessId = cleanValue(body.businessId);
    const wabaId = cleanValue(body.wabaId);
    const phoneNumberId = cleanValue(body.phoneNumberId);

    let displayPhoneNumber = cleanValue(body.displayPhoneNumber);
    let verifiedName = cleanValue(body.verifiedName);

    if (!workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing workspaceId",
        },
        { status: 400 }
      );
    }

    if (!code && !phoneNumberId && !wabaId && !businessId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Meta connection data",
        },
        { status: 400 }
      );
    }

    const workspace = await getWorkspace(workspaceId);

    if (!workspace?.id || !workspace?.owner_user_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Workspace not found",
        },
        { status: 404 }
      );
    }

    let accessToken: string | null = null;
    let tokenType: string | null = null;
    let tokenExpiresAt: string | null = null;

    if (code) {
      const tokenResult = await exchangeCodeForAccessToken(code);

      accessToken = tokenResult.accessToken;
      tokenType = tokenResult.tokenType;
      tokenExpiresAt = tokenResult.tokenExpiresAt;
    }

    const phoneDetails = await fetchPhoneNumberDetails({
      phoneNumberId,
      accessToken,
    });

    if (phoneDetails?.display_phone_number) {
      displayPhoneNumber = phoneDetails.display_phone_number;
    }

    if (phoneDetails?.verified_name) {
      verifiedName = phoneDetails.verified_name;
    }

    const webhookSubscribed = await subscribeWabaToWebhooks({
      wabaId,
      accessToken,
    });

    const now = new Date().toISOString();

    const connection = await saveConnection({
      workspace,
      body,
      businessId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      verifiedName,
      code,
      accessToken,
      tokenType,
      tokenExpiresAt,
      webhookSubscribed,
      now,
    });

    const isReallyConnected = Boolean(accessToken && phoneNumberId && wabaId);

    await updateWorkspaceConnectionStatus({
      workspace,
      connected: isReallyConnected,
    });

    return NextResponse.json(
      {
        ok: true,
        status: isReallyConnected ? "connected" : "pending",
        connection,
        connectionSummary: {
          workspaceId: workspace.id,
          provider: "meta_embedded_signup",
          hasAccessToken: Boolean(accessToken),
          hasWabaId: Boolean(wabaId),
          hasPhoneNumberId: Boolean(phoneNumberId),
          webhookSubscribed,
          displayPhoneNumber,
          verifiedName,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Embedded signup callback error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Embedded signup callback server error",
      },
      { status: 500 }
    );
  }
}