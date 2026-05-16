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
};

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
  business_name: string | null;
};

function cleanValue(value?: string | null) {
  const clean = String(value || "").trim();
  return clean || null;
}

function getConnectionStatus({
  phoneNumberId,
  wabaId,
  code,
}: {
  phoneNumberId: string | null;
  wabaId: string | null;
  code: string | null;
}) {
  if (phoneNumberId || wabaId) {
    return "connected";
  }

  if (code) {
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EmbeddedSignupPayload;

    const workspaceId = cleanValue(body.workspaceId);
    const code = cleanValue(body.code);
    const businessId = cleanValue(body.businessId);
    const wabaId = cleanValue(body.wabaId);
    const phoneNumberId = cleanValue(body.phoneNumberId);
    const displayPhoneNumber = cleanValue(body.displayPhoneNumber);
    const verifiedName = cleanValue(body.verifiedName);

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

    const now = new Date().toISOString();

    const connectionPayload = {
      workspace_id: workspace.id,
      owner_user_id: workspace.owner_user_id,
      meta_business_id: businessId,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      display_phone_number: displayPhoneNumber,
      verified_name: verifiedName,
      oauth_code: code,
      status: getConnectionStatus({
        phoneNumberId,
        wabaId,
        code,
      }),
      last_connected_at: now,
    };

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("artipilot_whatsapp_connections")
      .upsert(connectionPayload, {
        onConflict: "workspace_id",
      })
      .select("*")
      .single();

    if (connectionError) {
      console.error("Meta connection save error:", connectionError);

      return NextResponse.json(
        {
          ok: false,
          error: connectionError.message || "Could not save Meta connection",
        },
        { status: 500 }
      );
    }

    const { error: workspaceUpdateError } = await supabaseAdmin
      .from("artipilot_workspaces")
      .update({
        whatsapp_connected: true,
      })
      .eq("id", workspace.id)
      .eq("owner_user_id", workspace.owner_user_id);

    if (workspaceUpdateError) {
      console.error(
        "Workspace WhatsApp connected update error:",
        workspaceUpdateError
      );
    }

    return NextResponse.json(
      {
        ok: true,
        connection,
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