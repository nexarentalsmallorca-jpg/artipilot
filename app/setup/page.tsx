  "use client";

  import Link from "next/link";
  import { Suspense, useEffect, useMemo, useRef, useState } from "react";
  import { useRouter, useSearchParams } from "next/navigation";
  import { supabase } from "@/lib/supabaseClient";
  import Navbar from "@/components/landing/Navbar";
  import Footer from "@/components/landing/Footer";

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

  function cleanPlan(plan: string | null) {
    const allowedPlans = ["starter", "growth", "business"];

    if (plan && allowedPlans.includes(plan)) {
      return plan;
    }

    return "growth";
  }

  function cleanOffer(offer: string | null) {
    if (offer === "first-month-1eur") return offer;
    return "first-month-1eur";
  }

  function getPlanPrice(plan: string) {
    if (plan === "starter") return "€19";
    if (plan === "business") return "€69";
    return "€49";
  }

  function getPlanName(plan: string) {
    if (plan === "starter") return "Starter";
    if (plan === "business") return "Business";
    return "Growth";
  }

  function isBusinessType(value: string | null): value is BusinessType {
    return Boolean(value && businessTypes.includes(value));
  }

  function LoadingScreen({ text }: { text: string }) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070D] px-4 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-[#0B101A] p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#36FF9F]/20 border-t-[#36FF9F]" />
          <p className="mt-5 font-black">{text}</p>
          <p className="mt-2 text-sm text-[#8E99AD]">Please wait a moment.</p>
        </div>
      </main>
    );
  }

  function SetupPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const businessNameRef = useRef<HTMLInputElement | null>(null);
    const aiJobRef = useRef<HTMLTextAreaElement | null>(null);
    const rulesRef = useRef<HTMLTextAreaElement | null>(null);

    const [userId, setUserId] = useState<string | null>(null);
    const [existingWorkspaceId, setExistingWorkspaceId] = useState<string | null>(
      null
    );

    const [businessName, setBusinessName] = useState("");
    const [businessType, setBusinessType] =
      useState<BusinessType>("Rental business");
    const [language, setLanguage] = useState("English");
    const [aiJob, setAiJob] = useState("");
    const [rules, setRules] = useState("");

    const [error, setError] = useState("");
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [suggestionUsed, setSuggestionUsed] = useState<
      "aiJob" | "rules" | "all" | null
    >(null);

    const selectedPlan = useMemo(() => {
      const planFromUrl = searchParams.get("plan");

      if (planFromUrl) {
        return cleanPlan(planFromUrl);
      }

      if (typeof window !== "undefined") {
        return cleanPlan(localStorage.getItem("artipilot_selected_plan"));
      }

      return "growth";
    }, [searchParams]);

    const selectedOffer = useMemo(() => {
      const offerFromUrl = searchParams.get("offer");

      if (offerFromUrl) {
        return cleanOffer(offerFromUrl);
      }

      if (typeof window !== "undefined") {
        return cleanOffer(localStorage.getItem("artipilot_selected_offer"));
      }

      return "first-month-1eur";
    }, [searchParams]);

    const selectedPlanName = useMemo(
      () => getPlanName(selectedPlan),
      [selectedPlan]
    );

    const selectedPlanPrice = useMemo(
      () => getPlanPrice(selectedPlan),
      [selectedPlan]
    );

    const suggestions = useMemo(() => {
      return businessSuggestions[businessType] || businessSuggestions.Other;
    }, [businessType]);

    useEffect(() => {
      async function loadUserAndWorkspace() {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user?.id) {
            router.replace(`/signup?plan=${selectedPlan}&offer=${selectedOffer}`);
            return;
          }

          setUserId(session.user.id);

          localStorage.setItem("artipilot_selected_plan", selectedPlan);
          localStorage.setItem("artipilot_selected_offer", selectedOffer);

          const { data, error: workspaceError } = await supabase
            .from("artipilot_workspaces")
            .select(
              "id, selected_plan, selected_offer, business_name, business_type, main_language, ai_job, business_rules, setup_completed"
            )
            .eq("owner_user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (workspaceError) {
            console.error("Load workspace error:", workspaceError);
            return;
          }

          const workspace = data?.[0] as ExistingWorkspace | undefined;

          if (workspace?.id && workspace.setup_completed) {
            localStorage.setItem("artipilot_workspace_id", workspace.id);
            router.replace("/dashboard");
            return;
          }

          if (workspace) {
            setExistingWorkspaceId(workspace.id);
            localStorage.setItem("artipilot_workspace_id", workspace.id);

            if (workspace.selected_plan) {
              localStorage.setItem(
                "artipilot_selected_plan",
                cleanPlan(workspace.selected_plan)
              );
            }

            if (workspace.selected_offer) {
              localStorage.setItem(
                "artipilot_selected_offer",
                cleanOffer(workspace.selected_offer)
              );
            }

            if (workspace.business_name) setBusinessName(workspace.business_name);

            if (isBusinessType(workspace.business_type)) {
              setBusinessType(workspace.business_type);
            }

            if (workspace.main_language) setLanguage(workspace.main_language);
            if (workspace.ai_job) setAiJob(workspace.ai_job);
            if (workspace.business_rules) setRules(workspace.business_rules);
          }
        } catch (authError) {
          console.error("Setup auth check error:", authError);
        } finally {
          setIsCheckingAuth(false);
        }
      }

      loadUserAndWorkspace();
    }, [router, selectedPlan, selectedOffer]);

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

      if (!userId) {
        showError("Please sign in again before creating your workspace.");
        router.replace(`/signup?plan=${selectedPlan}&offer=${selectedOffer}`);
        return;
      }

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

        const {
  data: { session },
} = await supabase.auth.getSession();

if (!session?.access_token) {
  throw new Error("Missing login session. Please sign in again.");
}

const response = await fetch("/api/workspace/setup", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    existingWorkspaceId,
    selectedPlan,
    selectedOffer,
    businessName: businessName.trim(),
    businessType,
    mainLanguage: language,
    aiJob: aiJob.trim(),
    businessRules: rules.trim(),
  }),
});

const result = await response.json();

if (!response.ok || !result?.ok) {
  throw new Error(result?.error || "Workspace could not be saved.");
}

const workspaceId = result.workspace?.id;

if (!workspaceId) {
  throw new Error("Workspace was saved but no workspace ID was returned.");
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

    if (isCheckingAuth) {
      return <LoadingScreen text="Preparing your workspace..." />;
    }

    return (
      <main className="relative min-h-screen overflow-hidden bg-[#030509] text-white">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(0,212,255,0.12),transparent_28%),radial-gradient(circle_at_82%_10%,rgba(54,255,159,0.10),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,138,31,0.06),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
        </div>

        <div className="relative z-10">
          <Navbar />

          <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
            <div className="mx-auto max-w-5xl">
              <div className="mb-8 text-center">
                <div className="inline-flex rounded-full border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-4 py-2 text-xs font-black text-[#36FF9F] sm:text-sm">
                  Workspace setup · {selectedPlanName} · €1 first month
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                  Create your Artipilot workspace
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#C8D0E0]">
                  Add your business details first. Then connect WhatsApp from your
                  dashboard when the Meta connection step is available for your
                  account.
                </p>
              </div>

              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                {[
                  ["First month", "€1"],
                  ["Then", `${selectedPlanPrice}/month`],
                  ["Plan", selectedPlanName],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[1.4rem] border border-white/10 bg-[#080D18]/85 p-4 text-center"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#36FF9F]">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mb-6 rounded-[1.7rem] border border-[#00D4FF]/20 bg-[#00D4FF]/10 p-5">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#36FF9F]">
                  Beta access notice
                </p>
                <p className="mt-3 leading-7 text-[#C8D0E0]">
                  Artipilot is currently in beta while official Meta review and
                  WhatsApp Business integration approval are being completed. You
                  can prepare your business workspace, AI instructions and rules
                  during this launch phase.
                </p>
              </div>

              {error ? (
                <div className="mb-5 rounded-[1.3rem] border border-red-500/25 bg-red-500/10 px-5 py-4 shadow-[0_0_28px_rgba(239,68,68,0.10)]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 8v5M12 16.5h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div>
                      <p className="font-black text-red-200">
                        Missing information
                      </p>
                      <p className="mt-1 text-sm leading-6 text-red-100/80">
                        {error}
                      </p>
                    </div>
                  </div>
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
                          Not sure what to write?
                        </p>
                        <p className="mt-1 text-sm leading-5 text-[#9AA6BC]">
                          Artipilot can fill smart suggestions for{" "}
                          <span className="font-bold text-[#36FF9F]">
                            {businessType.toLowerCase()}
                          </span>
                          .
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={applyAllSuggestions}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-4 py-2.5 text-sm font-black text-[#36FF9F] transition hover:bg-[#36FF9F]/15 active:scale-[0.98]"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                        </svg>
                        AI fill suggestions
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
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-[#C8D0E0] transition hover:border-[#36FF9F]/25 hover:bg-[#36FF9F]/10 hover:text-[#36FF9F] active:scale-[0.98]"
                      >
                        ✨ Suggest
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
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-[#C8D0E0] transition hover:border-[#36FF9F]/25 hover:bg-[#36FF9F]/10 hover:text-[#36FF9F] active:scale-[0.98]"
                      >
                        ✨ Suggest
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

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="group relative flex w-full items-center justify-center overflow-hidden rounded-full border border-[#36FF9F]/20 bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] px-6 py-4 text-base font-black text-[#03100A] shadow-[0_0_28px_rgba(54,255,159,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(54,255,159,0.25)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="absolute inset-0 bg-white/0 transition duration-300 group-hover:bg-white/15" />

                      <span className="relative flex items-center gap-2">
                        {isCreating ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#03100A]/30 border-t-[#03100A]" />
                            Saving workspace...
                          </>
                        ) : existingWorkspaceId ? (
                          "Finish workspace setup"
                        ) : (
                          "Create workspace"
                        )}
                      </span>
                    </button>
                  </div>

                  <p className="text-center text-xs leading-5 text-[#687388]">
                    WhatsApp connection comes next inside your dashboard.
                  </p>
                </form>
              </div>

              <div className="mt-6 text-center">
                <Link
                  href="/dashboard"
                  className="text-sm font-bold text-[#A8B3C7] transition hover:text-[#36FF9F]"
                >
                  Already completed setup? Go to dashboard
                </Link>
              </div>
            </div>
          </section>

          <Footer />
        </div>
      </main>
    );
  }

  export default function SetupPage() {
    return (
      <Suspense fallback={<LoadingScreen text="Loading setup..." />}>
        <SetupPageContent />
      </Suspense>
    );
  }