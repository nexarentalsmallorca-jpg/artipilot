import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SetupPayload = {
  existingWorkspaceId?: string | null;
  selectedPlan?: string | null;
  selectedOffer?: string | null;
  businessName?: string | null;
  businessType?: string | null;
  mainLanguage?: string | null;
  aiJob?: string | null;
  businessRules?: string | null;
};

function cleanText(value?: string | null) {
  return String(value || "").trim();
}

function cleanPlan(value?: string | null) {
  const clean = cleanText(value).toLowerCase();
  if (["starter", "growth", "business"].includes(clean)) return clean;
  return "growth";
}

function cleanOffer(value?: string | null) {
  const clean = cleanText(value);
  if (clean === "first-month-1eur") return clean;
  return "first-month-1eur";
}

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("Workspace setup auth error:", error);
    return null;
  }

  return user;
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

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Not authenticated. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const body = (await req.json()) as SetupPayload;

    const existingWorkspaceId = cleanText(body.existingWorkspaceId);
    const selectedPlan = cleanPlan(body.selectedPlan);
    const selectedOffer = cleanOffer(body.selectedOffer);
    const businessName = cleanText(body.businessName);
    const businessType = cleanText(body.businessType) || "Other";
    const mainLanguage = cleanText(body.mainLanguage) || "English";
    const aiJob = cleanText(body.aiJob);
    const businessRules = cleanText(body.businessRules);

    if (!businessName) {
      return NextResponse.json(
        {
          ok: false,
          error: "Business name is required.",
        },
        { status: 400 }
      );
    }

    if (!aiJob) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI job instructions are required.",
        },
        { status: 400 }
      );
    }

    if (!businessRules) {
      return NextResponse.json(
        {
          ok: false,
          error: "Business rules are required.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const fullPayload = {
      owner_user_id: user.id,
      selected_plan: selectedPlan,
      selected_offer: selectedOffer,
      business_name: businessName,
      business_type: businessType,
      main_language: mainLanguage,
      ai_job: aiJob,
      business_rules: businessRules,
      setup_completed: true,
      updated_at: now,
    };

    const fallbackPayload = {
      owner_user_id: user.id,
      business_name: businessName,
      business_type: businessType,
      main_language: mainLanguage,
      ai_job: aiJob,
      business_rules: businessRules,
      setup_completed: true,
    };

    let result;

    if (existingWorkspaceId) {
      result = await supabaseAdmin
        .from("artipilot_workspaces")
        .update(fullPayload)
        .eq("id", existingWorkspaceId)
        .eq("owner_user_id", user.id)
        .select("*")
        .single();

      if (result.error && hasColumnError(result.error)) {
        result = await supabaseAdmin
          .from("artipilot_workspaces")
          .update(fallbackPayload)
          .eq("id", existingWorkspaceId)
          .eq("owner_user_id", user.id)
          .select("*")
          .single();
      }
    } else {
      result = await supabaseAdmin
        .from("artipilot_workspaces")
        .insert(fullPayload)
        .select("*")
        .single();

      if (result.error && hasColumnError(result.error)) {
        result = await supabaseAdmin
          .from("artipilot_workspaces")
          .insert(fallbackPayload)
          .select("*")
          .single();
      }
    }

    if (result.error) {
      console.error("Workspace setup save error:", result.error);

      return NextResponse.json(
        {
          ok: false,
          error: result.error.message || "Workspace could not be saved.",
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        workspace: result.data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Workspace setup API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Workspace setup server error.",
      },
      { status: 500 }
    );
  }
}