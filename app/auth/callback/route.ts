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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  const selectedPlan = cleanPlan(requestUrl.searchParams.get("plan"));
  const selectedOffer = cleanOffer(requestUrl.searchParams.get("offer"));

  if (!code) {
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  const dashboardUrl = new URL("/dashboard", request.url);
  const setupUrl = new URL("/setup", request.url);
  setupUrl.searchParams.set("plan", selectedPlan);
  setupUrl.searchParams.set("offer", selectedOffer);

  const signupUrl = new URL("/signup", request.url);
  signupUrl.searchParams.set("plan", selectedPlan);
  signupUrl.searchParams.set("offer", selectedOffer);

  const response = NextResponse.redirect(dashboardUrl);

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

  if (!existingWorkspace?.id) {
    response.headers.set("Location", setupUrl.toString());
    return response;
  }

  if (!existingWorkspace.setup_completed) {
    response.headers.set("Location", setupUrl.toString());
    return response;
  }

  response.headers.set("Location", dashboardUrl.toString());
  return response;
}