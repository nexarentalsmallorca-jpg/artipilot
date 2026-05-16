import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PushSubscribeBody = {
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
};

const WORKSPACE_SELECT =
  "id, owner_user_id, business_name, business_type, main_language, ai_job, business_rules";

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("Push subscribe auth error:", error);
    return null;
  }

  return user;
}

async function getWorkspace(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select(WORKSPACE_SELECT)
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Push subscribe workspace error:", error);
    return null;
  }

  return data || null;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as PushSubscribeBody;

    const endpoint = body.subscription?.endpoint || "";
    const p256dh = body.subscription?.keys?.p256dh || "";
    const auth = body.subscription?.keys?.auth || "";

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { success: false, error: "Missing push subscription data." },
        { status: 400 }
      );
    }

    const workspace = await getWorkspace(user.id);

    if (!workspace?.id) {
      return NextResponse.json(
        { success: false, error: "Workspace not found." },
        { status: 404 }
      );
    }

    const userAgent = request.headers.get("user-agent") || "";

    const { error } = await supabaseAdmin
      .from("artipilot_push_subscriptions")
      .upsert(
        {
          owner_user_id: user.id,
          workspace_id: workspace.id,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "endpoint",
        }
      );

    if (error) {
      console.error("Push subscribe save error:", error);

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notifications enabled on this device.",
    });
  } catch (error) {
    console.error("Push subscribe route error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not enable notifications.",
      },
      { status: 500 }
    );
  }
}