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

type ArtipilotWorkspace = {
  id: string;
  owner_user_id: string | null;
  selected_plan: string | null;
  selected_offer: string | null;
  business_name: string | null;
  business_type: string | null;
  main_language: string | null;
  ai_job: string | null;
  business_rules: string | null;
  whatsapp_connected: boolean | null;
  ai_live: boolean | null;
  setup_completed: boolean | null;
};

const WORKSPACE_SELECT =
  "id, owner_user_id, selected_plan, selected_offer, business_name, business_type, main_language, ai_job, business_rules, whatsapp_connected, ai_live, setup_completed";

const DEFAULT_AI_JOB = `You are the WhatsApp AI assistant for this business.

Your job:
- Reply to customers in a friendly, professional, human way.
- Answer questions using the saved business information and rules.
- Collect important details from the customer.
- Help the customer move closer to booking or buying.
- If something is unclear, ask a simple follow-up question.
- If the customer needs human help, politely say the team will check and reply soon.

Do not invent prices, availability, opening hours, policies, or promises.`;

const DEFAULT_BUSINESS_RULES = `Important business rules:
- Never invent availability.
- Never invent prices.
- Never promise something that is not written in the business rules.
- If the customer asks something outside the saved information, ask the team to confirm.
- Keep replies short, clear, and helpful.
- Use the customer's language when possible.
- Be polite, friendly, and professional.`;

function getDefaultWorkspaceId() {
  return process.env.ARTIPILOT_WORKSPACE_ID?.trim() || "";
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

async function loadWorkspaceById(workspaceId: string) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select(WORKSPACE_SELECT)
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("AI training ENV workspace load error:", error);
    return null;
  }

  return data as ArtipilotWorkspace | null;
}

async function loadLatestWorkspaceByUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select(WORKSPACE_SELECT)
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("AI training workspace load error:", error);
    return null;
  }

  return data as ArtipilotWorkspace | null;
}

async function createWorkspaceForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .insert({
      owner_user_id: userId,
      selected_plan: "starter",
      selected_offer: "trial",
      business_name: "",
      business_type: "",
      main_language: "English",
      ai_job: DEFAULT_AI_JOB,
      business_rules: DEFAULT_BUSINESS_RULES,
      whatsapp_connected: false,
      ai_live: false,
      setup_completed: false,
    })
    .select(WORKSPACE_SELECT)
    .single();

  if (error) {
    console.error("AI training workspace create error:", error);
    return null;
  }

  return data as ArtipilotWorkspace;
}

async function getOrCreateWorkspace(userId: string) {
  const envWorkspaceId = getDefaultWorkspaceId();

  if (envWorkspaceId) {
    const envWorkspace = await loadWorkspaceById(envWorkspaceId);

    if (envWorkspace?.id) {
      return envWorkspace;
    }

    console.warn(
      "ARTIPILOT_WORKSPACE_ID is set but no matching workspace was found:",
      envWorkspaceId
    );
  }

  const existingWorkspace = await loadLatestWorkspaceByUser(userId);

  if (existingWorkspace?.id) {
    return existingWorkspace;
  }

  return await createWorkspaceForUser(userId);
}

function cleanPayload(body: WorkspacePayload) {
  return {
    business_name: String(body.business_name || "").trim(),
    business_type: String(body.business_type || "").trim(),
    main_language: String(body.main_language || "English").trim() || "English",
    ai_job: String(body.ai_job || "").trim(),
    business_rules: String(body.business_rules || "").trim(),
  };
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return errorResponse("Not authenticated", 401);
    }

    const workspace = await getOrCreateWorkspace(user.id);

    if (!workspace?.id) {
      return errorResponse(
        "Workspace could not be loaded or created. Check Supabase table columns and service role key.",
        500
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

    return errorResponse(
      error instanceof Error ? error.message : "AI training load failed",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return errorResponse("Not authenticated", 401);
    }

    const workspace = await getOrCreateWorkspace(user.id);

    if (!workspace?.id) {
      return errorResponse(
        "Workspace could not be loaded or created. Check Supabase table columns and service role key.",
        500
      );
    }

    const body = (await request.json()) as WorkspacePayload;
    const clean = cleanPayload(body);

    if (!clean.business_name) {
      return errorResponse("Please add your business name.", 400);
    }

    if (!clean.business_type) {
      return errorResponse("Please add your business type.", 400);
    }

    if (!clean.ai_job) {
      return errorResponse("Please write what the AI should do.", 400);
    }

    if (!clean.business_rules) {
      return errorResponse("Please write the business rules for the AI.", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("artipilot_workspaces")
      .update({
        business_name: clean.business_name,
        business_type: clean.business_type,
        main_language: clean.main_language,
        ai_job: clean.ai_job,
        business_rules: clean.business_rules,
        setup_completed: true,
        ai_live: true,
      })
      .eq("id", workspace.id)
      .select(WORKSPACE_SELECT)
      .single();

    if (error) {
      console.error("AI training save error:", error);
      return errorResponse(error.message || "Could not save AI training.", 500);
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

    return errorResponse(
      error instanceof Error ? error.message : "AI training save failed",
      500
    );
  }
}