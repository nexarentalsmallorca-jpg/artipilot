"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const ADMIN_EMAIL = "sahilclickbank232@gmail.com";

const businessTypes = [
  "Rental business",
  "Restaurant or cafe",
  "Hotel",
  "Real estate",
  "Clinic",
  "Beauty salon",
  "Cleaning service",
  "Service business",
  "Online store",
  "Other",
];

const languages = [
  "English",
  "Spanish",
  "German",
  "French",
  "Italian",
  "Portuguese",
  "Multilingual",
];

const planData = {
  starter: {
    name: "Starter",
    price: "€19",
    description: "For small businesses starting with WhatsApp automation.",
  },
  growth: {
    name: "Growth",
    price: "€49",
    description: "For growing businesses that want a stronger AI assistant.",
  },
  business: {
    name: "Business",
    price: "€69",
    description: "For busy teams that need more advanced automation.",
  },
};

type PlanKey = keyof typeof planData;
type BusinessType = (typeof businessTypes)[number];

type Suggestions = {
  aiJob: string;
  rules: string;
};

type ExistingWorkspace = {
  id: string;
  selected_plan: string | null;
  selected_offer?: string | null;
  business_name: string | null;
  business_type: string | null;
  main_language: string | null;
  ai_job: string | null;
  business_rules: string | null;
  setup_completed?: boolean | null;
};

const businessSuggestions: Record<BusinessType, Suggestions> = {
  "Rental business": {
    aiJob:
      "Answer customer questions about prices, availability, rental duration, pickup and return times, deposits, documents needed, insurance, location and booking steps. Collect booking details such as customer name, phone number, rental date, pickup time, return time, vehicle type and number of vehicles needed.",
    rules:
      "Always collect the customer name, phone number, rental date, pickup time, return time, vehicle type and number of vehicles before sending the request to the team. Never confirm final availability unless the team has approved it. Explain prices clearly. Be friendly, short and professional. If the customer asks about documents, tell them to bring ID/passport and driving license if required.",
  },
  "Restaurant or cafe": {
    aiJob:
      "Answer questions about opening hours, menu, prices, location, table reservations, takeaway, delivery, allergens, special offers and group bookings. Collect customer name, phone number, date, time, number of people and special requests for reservations.",
    rules:
      "Always collect name, phone number, date, time and number of guests before sending a reservation request. Never confirm a table unless availability is approved. Keep answers short, friendly and professional. Mention allergies carefully and advise customers to confirm with the team for allergen-sensitive orders.",
  },
  Hotel: {
    aiJob:
      "Answer questions about room availability, prices, check-in, check-out, facilities, location, parking, breakfast, airport transfers, policies and special requests. Collect guest name, dates, number of guests, room type and contact details.",
    rules:
      "Always collect guest name, phone/email, check-in date, check-out date, number of guests and room preference before forwarding to the team. Never guarantee availability or price without confirmation. Be polite, calm and professional.",
  },
  "Real estate": {
    aiJob:
      "Answer questions about properties, prices, locations, viewings, rental or sale conditions, documents needed and availability. Collect customer name, phone number, property interest, budget, preferred area and viewing time.",
    rules:
      "Always collect name, phone number, property type, budget, preferred location and viewing availability. Never confirm property availability without team approval. Keep replies professional and avoid legal or financial promises.",
  },
  Clinic: {
    aiJob:
      "Answer questions about services, opening hours, appointment availability, location, prices, preparation instructions and contact details. Collect patient name, phone number, preferred date, preferred time and service needed.",
    rules:
      "Always collect name, phone number, service needed, preferred date and preferred time before sending to the clinic team. Do not give medical diagnosis or emergency advice. For urgent medical problems, advise the customer to contact emergency services or a medical professional.",
  },
  "Beauty salon": {
    aiJob:
      "Answer questions about treatments, prices, opening hours, availability, location and appointments. Collect customer name, phone number, preferred service, date, time and any special requests.",
    rules:
      "Always collect name, phone number, service, preferred date and preferred time before sending an appointment request. Never confirm availability unless the team approves it. Keep the tone friendly, elegant and professional.",
  },
  "Cleaning service": {
    aiJob:
      "Answer questions about cleaning services, prices, availability, areas covered, duration, deep cleaning, regular cleaning, office cleaning and booking steps. Collect customer name, phone number, address or area, service type, date, time and property size.",
    rules:
      "Always collect name, phone number, location, cleaning type, preferred date/time and property size before sending the request to the team. Never confirm final price without enough details. Be clear, helpful and professional.",
  },
  "Service business": {
    aiJob:
      "Answer questions about services, prices, availability, location, booking steps and customer support. Collect customer name, phone number, service needed, preferred date/time and important details about the request.",
    rules:
      "Always collect name, phone number, service needed, preferred date/time and request details before sending to the team. Never promise availability or final price without confirmation. Keep replies short, useful and professional.",
  },
  "Online store": {
    aiJob:
      "Answer questions about products, prices, delivery, returns, payment methods, order status, stock availability and customer support. Help customers choose products and collect order-related information.",
    rules:
      "Always be clear about product details, delivery, returns and payment steps. Never promise stock availability unless confirmed. If the customer has an order issue, collect name, phone/email and order number before escalating to the team.",
  },
  Other: {
    aiJob:
      "Answer customer questions, explain services, collect leads, help with bookings or enquiries and forward important requests to the team.",
    rules:
      "Always collect the customer's name, phone number and request details before sending anything to the team. Never confirm availability, final price or important decisions without team approval. Keep replies friendly, short and professional.",
  },
};

function cleanPlan(plan: string | null): PlanKey {
  if (plan === "starter" || plan === "growth" || plan === "business") {
    return plan;
  }

  return "growth";
}

function cleanOffer(offer: string | null) {
  if (offer === "first-month-1eur") return offer;
  return "first-month-1eur";
}

function normalizeEmail(email: string | null | undefined) {
  return String(email || "").trim().toLowerCase();
}

function isAdminEmail(email: string | null | undefined) {
  return normalizeEmail(email) === ADMIN_EMAIL;
}

function isBusinessType(value: string | null | undefined): value is BusinessType {
  return Boolean(value && businessTypes.includes(value));
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030509] px-4 text-white">
      <div className="rounded-[1.75rem] border border-white/10 bg-[#080D16] p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#36FF9F]/20 border-t-[#36FF9F]" />
        <p className="mt-5 text-sm font-black text-white">{text}</p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.42c-.24 1.26-.96 2.33-2.04 3.05l3.3 2.56c1.92-1.77 3.02-4.38 3.02-7.5 0-.73-.07-1.43-.2-2.1H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.3-2.56c-.92.62-2.1.98-3.33.98-2.56 0-4.72-1.73-5.5-4.05H3.09v2.63A10 10 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.5 13.93A6.02 6.02 0 0 1 6.18 12c0-.67.11-1.32.32-1.93V7.44H3.09A10 10 0 0 0 2 12c0 1.61.39 3.14 1.09 4.56l3.41-2.63z"
      />
      <path
        fill="#4285F4"
        d="M12 6.02c1.47 0 2.8.5 3.84 1.5l2.88-2.88C16.97 3.01 14.7 2 12 2a10 10 0 0 0-8.91 5.44l3.41 2.63C7.28 7.75 9.44 6.02 12 6.02z"
      />
    </svg>
  );
}

function SignupCard({
  selectedPlan,
  selectedOffer,
}: {
  selectedPlan: PlanKey;
  selectedOffer: string;
}) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");

  const plan = planData[selectedPlan];

  async function handleGoogleSignup() {
    try {
      setIsSigningIn(true);
      setAuthError("");

      if (typeof window !== "undefined") {
        localStorage.setItem("artipilot_selected_plan", selectedPlan);
        localStorage.setItem("artipilot_selected_offer", selectedOffer);
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/signup?plan=${selectedPlan}&offer=${selectedOffer}`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Google signup error:", error);
      setAuthError("Google login could not start. Please try again.");
      setIsSigningIn(false);
    }
  }

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div>
          <div className="inline-flex rounded-full border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-4 py-2 text-xs font-black text-[#36FF9F] sm:text-sm">
            €1 first month · {plan.name} plan selected
          </div>

          <h1 className="mt-6 max-w-2xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Start your AI WhatsApp workspace.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-[#C8D0E0] sm:text-lg">
            Create your Artipilot account, prepare your AI assistant and set up
            your business workspace before connecting WhatsApp.
          </p>

          <div className="mt-7 max-w-xl rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#36FF9F]">
                  Selected plan
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  €1 first month
                </p>
                <p className="mt-1 text-sm text-[#9AA6BC]">
                  Then {plan.price}/month · cancel anytime.
                </p>
              </div>

              <div className="rounded-2xl border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-5 py-4 text-left sm:min-w-40">
                <p className="text-sm font-black text-[#36FF9F]">
                  {plan.name}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#B8C3D8]">
                  {plan.description}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[#00D4FF]/20 bg-[#00D4FF]/10 p-5">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#36FF9F]">
              Beta access notice
            </p>
            <p className="mt-3 leading-7 text-[#C8D0E0]">
              Artipilot is in beta while Meta review and WhatsApp Business
              approval are being completed. You can create your account and
              prepare your workspace during this launch phase.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#080D18]/90 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black ring-1 ring-white/10">
              <Image
                src="/artipilot-logo.png"
                alt="Artipilot"
                width={34}
                height={34}
                className="h-8 w-8 object-contain"
                priority
              />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.26em] text-[#36FF9F]">
                Artipilot account
              </p>
              <p className="mt-1 text-sm text-[#A8B3C7]">
                Secure Google access
              </p>
            </div>
          </div>

          <h2 className="mt-7 text-3xl font-black tracking-tight text-white">
            Continue with Google
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#B8C3D8]">
            Your selected plan is{" "}
            <span className="font-black text-[#36FF9F]">{plan.name}</span>. Pay
            €1 for the first month, then {plan.price}/month.
          </p>

          {authError ? (
            <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
              {authError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isSigningIn}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-base font-black text-black transition hover:bg-[#EAF0F7] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSigningIn ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                Opening Google...
              </>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-black text-white">Secure login</p>
              <p className="mt-2 text-sm leading-6 text-[#9AA6BC]">
                Google keeps signup simple and protected.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-black text-white">Fast setup</p>
              <p className="mt-2 text-sm leading-6 text-[#9AA6BC]">
                Add your business details after login.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-[#758197]">
            By continuing, you agree to Artipilot&apos;s{" "}
            <Link href="/terms" className="font-bold text-[#36FF9F]">
              Terms
            </Link>
            ,{" "}
            <Link href="/privacy-policy" className="font-bold text-[#36FF9F]">
              Privacy Policy
            </Link>
            , and{" "}
            <Link
              href="/cancellation-policy"
              className="font-bold text-[#36FF9F]"
            >
              Cancellation Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

function WorkspaceSetupForm({
  userId,
  existingWorkspace,
  selectedPlan,
  selectedOffer,
}: {
  userId: string;
  existingWorkspace: ExistingWorkspace | null;
  selectedPlan: PlanKey;
  selectedOffer: string;
}) {
  const router = useRouter();

  const businessNameRef = useRef<HTMLInputElement | null>(null);
  const aiJobRef = useRef<HTMLTextAreaElement | null>(null);
  const rulesRef = useRef<HTMLTextAreaElement | null>(null);

  const [existingWorkspaceId, setExistingWorkspaceId] = useState<string | null>(
    existingWorkspace?.id || null
  );

  const [businessName, setBusinessName] = useState(
    existingWorkspace?.business_name || ""
  );

  const initialBusinessType =
    existingWorkspace && isBusinessType(existingWorkspace.business_type)
      ? existingWorkspace.business_type
      : "Rental business";

  const [businessType, setBusinessType] =
    useState<BusinessType>(initialBusinessType);

  const [language, setLanguage] = useState(
    existingWorkspace?.main_language || "English"
  );

  const [aiJob, setAiJob] = useState(existingWorkspace?.ai_job || "");
  const [rules, setRules] = useState(existingWorkspace?.business_rules || "");

  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [suggestionUsed, setSuggestionUsed] = useState<
    "aiJob" | "rules" | "all" | null
  >(null);

  const plan = planData[selectedPlan];

  const suggestions = useMemo(() => {
    return businessSuggestions[businessType] || businessSuggestions.Other;
  }, [businessType]);

  function showError(
    message: string,
    field?: "businessName" | "aiJob" | "rules"
  ) {
    setError(message);

    setTimeout(() => {
      if (field === "businessName") {
        businessNameRef.current?.focus();
        businessNameRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      if (field === "aiJob") {
        aiJobRef.current?.focus();
        aiJobRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      if (field === "rules") {
        rulesRef.current?.focus();
        rulesRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 80);
  }

  function applyAiJobSuggestion() {
    setAiJob(suggestions.aiJob);
    setError("");
    setSuggestionUsed("aiJob");
  }

  function applyRulesSuggestion() {
    setRules(suggestions.rules);
    setError("");
    setSuggestionUsed("rules");
  }

  function applyAllSuggestions() {
    setAiJob(suggestions.aiJob);
    setRules(suggestions.rules);
    setError("");
    setSuggestionUsed("all");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!businessName.trim()) {
      showError("Please enter your business name to continue.", "businessName");
      return;
    }

    if (!aiJob.trim()) {
      showError(
        "Please tell Artipilot what your AI should help customers with.",
        "aiJob"
      );
      return;
    }

    if (!rules.trim()) {
      showError(
        "Please add your important business rules before continuing.",
        "rules"
      );
      return;
    }

    try {
      setError("");
      setIsCreating(true);

      const workspacePayload = {
        owner_user_id: userId,
        selected_plan: selectedPlan,
        selected_offer: selectedOffer,
        business_name: businessName.trim(),
        business_type: businessType,
        main_language: language,
        ai_job: aiJob.trim(),
        business_rules: rules.trim(),
        setup_completed: true,
      };

      let workspaceId = existingWorkspaceId;

      if (existingWorkspaceId) {
        const { data, error: updateError } = await supabase
          .from("artipilot_workspaces")
          .update(workspacePayload)
          .eq("id", existingWorkspaceId)
          .eq("owner_user_id", userId)
          .select("id")
          .single();

        if (updateError) throw updateError;

        workspaceId = data.id;
      } else {
        const { data, error: insertError } = await supabase
          .from("artipilot_workspaces")
          .insert(workspacePayload)
          .select("id")
          .single();

        if (insertError) throw insertError;

        workspaceId = data.id;
        setExistingWorkspaceId(data.id);
      }

      const workspaceData = {
        id: workspaceId,
        ownerUserId: userId,
        selectedPlan,
        selectedOffer,
        businessName: businessName.trim(),
        businessType,
        language,
        aiJob: aiJob.trim(),
        rules: rules.trim(),
        setupCompleted: true,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "artipilot_workspace_setup",
        JSON.stringify(workspaceData)
      );

      localStorage.setItem("artipilot_selected_plan", selectedPlan);
      localStorage.setItem("artipilot_selected_offer", selectedOffer);

      if (workspaceId) {
        localStorage.setItem("artipilot_workspace_id", workspaceId);
      }

      router.push("/dashboard");
    } catch (saveError) {
      console.error("Workspace save error:", saveError);
      showError(
        "Workspace could not be saved. Please check Supabase and try again."
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <div className="inline-flex rounded-full border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-4 py-2 text-xs font-black text-[#36FF9F] sm:text-sm">
            {plan.name} plan · €1 first month · then {plan.price}/month
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            Create your workspace
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#C8D0E0]">
            Add your business details and tell Artipilot how your WhatsApp AI
            should speak, help and collect customer requests.
          </p>
        </div>

        <div className="mb-6 rounded-[1.7rem] border border-[#00D4FF]/20 bg-[#00D4FF]/10 p-5">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#36FF9F]">
            Beta access notice
          </p>
          <p className="mt-3 leading-7 text-[#C8D0E0]">
            Artipilot is currently in beta while official Meta review and
            WhatsApp Business approval are being completed. You can prepare your
            workspace during this launch phase.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-[1.3rem] border border-red-500/25 bg-red-500/10 px-5 py-4 shadow-[0_0_28px_rgba(239,68,68,0.10)]">
            <p className="font-black text-red-200">Missing information</p>
            <p className="mt-1 text-sm leading-6 text-red-100/80">{error}</p>
          </div>
        ) : null}

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-sm font-bold text-[#D8DEEA]">
                Business name
              </span>
              <input
                ref={businessNameRef}
                type="text"
                value={businessName}
                onChange={(event) => {
                  setBusinessName(event.target.value);
                  setError("");
                }}
                placeholder="Example: Artipilot Demo Business"
                className={`mt-2 w-full rounded-2xl border bg-[#05070D] px-4 py-3.5 text-white outline-none transition placeholder:text-[#606B80] focus:ring-4 ${
                  error && !businessName.trim()
                    ? "border-red-500/50 focus:border-red-400 focus:ring-red-500/10"
                    : "border-white/10 focus:border-[#36FF9F]/60 focus:ring-[#36FF9F]/10"
                }`}
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-[#D8DEEA]">
                  Business type
                </span>
                <select
                  value={businessType}
                  onChange={(event) => {
                    setBusinessType(event.target.value as BusinessType);
                    setSuggestionUsed(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#05070D] px-4 py-3.5 text-white outline-none transition focus:border-[#36FF9F]/60 focus:ring-4 focus:ring-[#36FF9F]/10"
                >
                  {businessTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#D8DEEA]">
                  Main language
                </span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#05070D] px-4 py-3.5 text-white outline-none transition focus:border-[#36FF9F]/60 focus:ring-4 focus:ring-[#36FF9F]/10"
                >
                  {languages.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-[1.5rem] border border-[#36FF9F]/15 bg-[#36FF9F]/[0.07] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-white">
                    Need a quick starting point?
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[#9AA6BC]">
                    Fill smart suggestions for{" "}
                    <span className="font-bold text-[#36FF9F]">
                      {businessType.toLowerCase()}
                    </span>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  onClick={applyAllSuggestions}
                  className="inline-flex items-center justify-center rounded-full border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-4 py-2.5 text-sm font-black text-[#36FF9F] transition hover:bg-[#36FF9F]/15 active:scale-[0.98]"
                >
                  Fill suggestions
                </button>
              </div>

              {suggestionUsed ? (
                <p className="mt-3 rounded-2xl border border-[#36FF9F]/15 bg-black/20 px-4 py-3 text-sm font-bold text-[#A7FFCB]">
                  Suggestions added. You can edit them before continuing.
                </p>
              ) : null}
            </div>

            <label className="block">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-[#D8DEEA]">
                  What should your AI do?
                </span>

                <button
                  type="button"
                  onClick={applyAiJobSuggestion}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-[#C8D0E0] transition hover:border-[#36FF9F]/25 hover:bg-[#36FF9F]/10 hover:text-[#36FF9F] active:scale-[0.98]"
                >
                  Suggest
                </button>
              </div>

              <textarea
                ref={aiJobRef}
                rows={5}
                value={aiJob}
                onChange={(event) => {
                  setAiJob(event.target.value);
                  setError("");
                }}
                placeholder="Example: answer prices, collect bookings, explain services, ask for dates..."
                className={`w-full resize-none rounded-2xl border bg-[#05070D] px-4 py-3.5 text-white outline-none transition placeholder:text-[#606B80] focus:ring-4 ${
                  error && !aiJob.trim()
                    ? "border-red-500/50 focus:border-red-400 focus:ring-red-500/10"
                    : "border-white/10 focus:border-[#36FF9F]/60 focus:ring-[#36FF9F]/10"
                }`}
              />
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-[#D8DEEA]">
                  Important rules
                </span>

                <button
                  type="button"
                  onClick={applyRulesSuggestion}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-[#C8D0E0] transition hover:border-[#36FF9F]/25 hover:bg-[#36FF9F]/10 hover:text-[#36FF9F] active:scale-[0.98]"
                >
                  Suggest
                </button>
              </div>

              <textarea
                ref={rulesRef}
                rows={5}
                value={rules}
                onChange={(event) => {
                  setRules(event.target.value);
                  setError("");
                }}
                placeholder="Example: always collect name, phone, date and time before sending booking to the team..."
                className={`w-full resize-none rounded-2xl border bg-[#05070D] px-4 py-3.5 text-white outline-none transition placeholder:text-[#606B80] focus:ring-4 ${
                  error && !rules.trim()
                    ? "border-red-500/50 focus:border-red-400 focus:ring-red-500/10"
                    : "border-white/10 focus:border-[#36FF9F]/60 focus:ring-[#36FF9F]/10"
                }`}
              />
            </label>

            <button
              type="submit"
              disabled={isCreating}
              className="flex w-full items-center justify-center rounded-full border border-[#36FF9F]/20 bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] px-6 py-4 text-base font-black text-[#03100A] shadow-[0_0_28px_rgba(54,255,159,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(54,255,159,0.25)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#03100A]/30 border-t-[#03100A]" />
                  Saving workspace...
                </span>
              ) : existingWorkspaceId ? (
                "Finish workspace setup"
              ) : (
                "Create workspace"
              )}
            </button>

            <p className="text-center text-xs leading-5 text-[#687388]">
              WhatsApp connection comes next inside your dashboard.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [existingWorkspace, setExistingWorkspace] =
    useState<ExistingWorkspace | null>(null);

  const selectedPlan = useMemo(() => {
    const planFromUrl = searchParams.get("plan");

    if (planFromUrl) return cleanPlan(planFromUrl);

    if (typeof window !== "undefined") {
      return cleanPlan(localStorage.getItem("artipilot_selected_plan"));
    }

    return "growth";
  }, [searchParams]);

  const selectedOffer = useMemo(() => {
    const offerFromUrl = searchParams.get("offer");

    if (offerFromUrl) return cleanOffer(offerFromUrl);

    if (typeof window !== "undefined") {
      return cleanOffer(localStorage.getItem("artipilot_selected_offer"));
    }

    return "first-month-1eur";
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    async function loadAuthAndWorkspace() {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("artipilot_selected_plan", selectedPlan);
          localStorage.setItem("artipilot_selected_offer", selectedOffer);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user?.id) {
          setUserId(null);
          setExistingWorkspace(null);
          setIsCheckingAuth(false);
          return;
        }

        const userEmail = normalizeEmail(session.user.email);

        if (isAdminEmail(userEmail)) {
          localStorage.setItem("artipilot_admin_email", userEmail);
          localStorage.setItem("artipilot_is_admin", "true");
          router.replace("/dashboard");
          return;
        }

        setUserId(session.user.id);

        const { data, error } = await supabase
          .from("artipilot_workspaces")
          .select(
            "id, selected_plan, selected_offer, business_name, business_type, main_language, ai_job, business_rules, setup_completed"
          )
          .eq("owner_user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("Load workspace error:", error);
          setIsCheckingAuth(false);
          return;
        }

        const workspace = data?.[0] as ExistingWorkspace | undefined;

        if (workspace?.id) {
          localStorage.setItem("artipilot_workspace_id", workspace.id);
          router.replace("/dashboard");
          return;
        }

        setExistingWorkspace(null);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Signup auth check error:", error);
        setIsCheckingAuth(false);
      }
    }

    loadAuthAndWorkspace();

    return () => {
      mounted = false;
    };
  }, [router, selectedPlan, selectedOffer]);

  if (isCheckingAuth) {
    return <LoadingScreen text="Checking your account..." />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030509] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(0,212,255,0.12),transparent_28%),radial-gradient(circle_at_82%_10%,rgba(54,255,159,0.10),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,138,31,0.06),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:90px_90px] opacity-25" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {userId ? (
          <WorkspaceSetupForm
            userId={userId}
            existingWorkspace={existingWorkspace}
            selectedPlan={selectedPlan}
            selectedOffer={selectedOffer}
          />
        ) : (
          <SignupCard selectedPlan={selectedPlan} selectedOffer={selectedOffer} />
        )}

        <Footer />
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingScreen text="Loading signup..." />}>
      <SignupPageContent />
    </Suspense>
  );
}