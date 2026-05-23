import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function cleanPlan(plan: string | null) {
  const allowedPlans = ["starter", "growth", "business"];

  if (plan && allowedPlans.includes(plan)) {
    return plan;
  }

  return "growth";
}

function cleanOffer(offer: string | null) {
  if (offer === "first-month-1eur") {
    return offer;
  }

  return "first-month-1eur";
}

function getSafeNextPath(next: string | null) {
  if (!next) return null;

  try {
    const decoded = decodeURIComponent(next).trim();

    // Important security check:
    // only allow internal redirects like /setup or /dashboard
    if (!decoded.startsWith("/") || decoded.startsWith("//")) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

function buildUrl(request: NextRequest, path: string) {
  return new URL(path, request.url);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));

  const selectedPlan = cleanPlan(requestUrl.searchParams.get("plan"));
  const selectedOffer = cleanOffer(requestUrl.searchParams.get("offer"));

  const fallbackSetupPath = `/setup?plan=${selectedPlan}&offer=${selectedOffer}`;
  const signupPath = `/signup?plan=${selectedPlan}&offer=${selectedOffer}`;

  const dashboardUrl = buildUrl(request, "/dashboard");
  const setupUrl = buildUrl(request, nextPath || fallbackSetupPath);
  const signupUrl = buildUrl(request, signupPath);

  if (!code) {
    return NextResponse.redirect(signupUrl);
  }

  // Start with setup as default, not dashboard.
  // We will change it later only if workspace is already completed.
  const response = NextResponse.redirect(setupUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeError) {
    console.error("Google OAuth callback error:", exchangeError.message);
    response.headers.set("Location", signupUrl.toString());
    return response;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("OAuth user read error:", userError?.message);
    response.headers.set("Location", signupUrl.toString());
    return response;
  }

  const { data: existingWorkspace, error: workspaceError } = await supabase
    .from("artipilot_workspaces")
    .select("id, setup_completed")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (workspaceError) {
    console.error("Workspace check error:", workspaceError.message);
    response.headers.set("Location", setupUrl.toString());
    return response;
  }

  // If user has no workspace, always send to setup.
  if (!existingWorkspace?.id) {
    response.headers.set("Location", setupUrl.toString());
    return response;
  }

  // If workspace exists but setup is not complete, send to setup.
  if (!existingWorkspace.setup_completed) {
    response.headers.set("Location", setupUrl.toString());
    return response;
  }

  // If setup is already completed, send to dashboard.
  response.headers.set("Location", dashboardUrl.toString());
  return response;
}