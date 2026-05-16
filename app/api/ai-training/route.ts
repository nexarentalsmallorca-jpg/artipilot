import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspacePayload = {
  business_name?: string;
  business_type?: string;
  main_language?: string;
  ai_job?: string;
  business_rules?: string;
};

function getDefaultWorkspaceId() {
  return process.env.ARTIPILOT_WORKSPACE_ID || "";
}

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("AI training auth error:", error);
    return null;
  }

  return user;
}

async function getWorkspace(userId: string) {
  const envWorkspaceId = getDefaultWorkspaceId();

  if (envWorkspaceId) {
    const { data, error } = await supabaseAdmin
      .from("artipilot_workspaces")
      .select(
        "id, owner_user_id, selected_plan, selected_offer, business_name, business_type, main_language, ai_job, business_rules, whatsapp_connected, ai_live, setup_completed"
      )
      .eq("id", envWorkspaceId)
      .maybeSingle();

    if (error) {
      console.error("AI training ENV workspace load error:", error);
    }

    if (data) return data;
  }

  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select(
      "id, owner_user_id, selected_plan, selected_offer, business_name, business_type, main_language, ai_job, business_rules, whatsapp_connected, ai_live, setup_completed"
    )
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("AI training workspace load error:", error);
    return null;
  }

  return data || null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspace = await getWorkspace(user.id);

    if (!workspace?.id) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        workspace,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("AI training GET error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "AI training load failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspace = await getWorkspace(user.id);

    if (!workspace?.id) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as WorkspacePayload;

    const cleanBusinessName = String(body.business_name || "").trim();
    const cleanBusinessType = String(body.business_type || "").trim();
    const cleanMainLanguage = String(body.main_language || "English").trim();
    const cleanAiJob = String(body.ai_job || "").trim();
    const cleanBusinessRules = String(body.business_rules || "").trim();

    if (!cleanBusinessName) {
      return NextResponse.json(
        { error: "Please add your business name." },
        { status: 400 }
      );
    }

    if (!cleanBusinessType) {
      return NextResponse.json(
        { error: "Please add your business type." },
        { status: 400 }
      );
    }

    if (!cleanAiJob) {
      return NextResponse.json(
        { error: "Please write what the AI should do." },
        { status: 400 }
      );
    }

    if (!cleanBusinessRules) {
      return NextResponse.json(
        { error: "Please write the business rules for the AI." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("artipilot_workspaces")
      .update({
        business_name: cleanBusinessName,
        business_type: cleanBusinessType,
        main_language: cleanMainLanguage,
        ai_job: cleanAiJob,
        business_rules: cleanBusinessRules,
        setup_completed: true,
        ai_live: true,
      })
      .eq("id", workspace.id)
      .select(
        "id, owner_user_id, selected_plan, selected_offer, business_name, business_type, main_language, ai_job, business_rules, whatsapp_connected, ai_live, setup_completed"
      )
      .single();

    if (error) {
      console.error("AI training save error:", error);

      return NextResponse.json(
        { error: error.message || "Could not save AI training." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        workspace: data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("AI training POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "AI training save failed",
      },
      { status: 500 }
    );
  }
}