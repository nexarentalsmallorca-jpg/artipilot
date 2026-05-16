"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Workspace = {
  id: string;
  owner_user_id: string;
  selected_plan: string | null;
  selected_offer?: string | null;
  business_name: string | null;
  business_type: string | null;
  main_language: string | null;
  whatsapp_connected: boolean | null;
  ai_live: boolean | null;
  setup_completed?: boolean | null;
};

type IconName =
  | "home"
  | "whatsapp"
  | "brain"
  | "inbox"
  | "settings"
  | "billing"
  | "check"
  | "warning"
  | "spark"
  | "card"
  | "arrow"
  | "refresh";

const navItems = [
  ["Dashboard", "Launch overview", "/dashboard", "home"],
  ["WhatsApp", "Connect number", "/dashboard/whatsapp", "whatsapp"],
  ["AI Training", "Teach your assistant", "/dashboard/ai-training", "brain"],
  ["Inbox", "Customer chats", "/dashboard/inbox", "inbox"],
  ["Settings", "Business profile", "/dashboard/settings", "settings"],
  ["Billing", "Plan and payments", "/dashboard/billing", "billing"],
] as const;

const plans = [
  {
    slug: "starter",
    name: "Starter",
    price: "€19",
    description: "For small businesses starting with AI WhatsApp support.",
    features: [
      "€1 for the first month",
      "1 WhatsApp workspace",
      "AI suggested replies",
      "Manual approval before sending",
      "Simple WhatsApp inbox",
      "Business FAQ setup",
      "Cancel anytime",
    ],
  },
  {
    slug: "growth",
    name: "Growth",
    price: "€49",
    description:
      "Best for businesses that want automatic replies and lead capture.",
    features: [
      "€1 for the first month",
      "Automatic AI replies",
      "Lead details collection",
      "Human takeover anytime",
      "Conversation history",
      "Mobile-friendly dashboard",
      "Best for daily WhatsApp enquiries",
    ],
    popular: true,
  },
  {
    slug: "business",
    name: "Business",
    price: "€69",
    description:
      "For teams that need higher limits, stronger rules, and more control.",
    features: [
      "€1 for the first month",
      "Higher message limits",
      "Advanced AI instructions",
      "Priority support",
      "Team-ready dashboard",
      "Better control for busy inboxes",
      "Built for growing businesses",
    ],
  },
];

function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const common = "h-5 w-5 " + className;

  if (name === "home") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 10.8 12 4l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "whatsapp") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M5.2 19 6.3 15.4A7.5 7.5 0 1 1 9 18.1L5.2 19Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 8.8c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.2.7l-.4.4c.6 1 1.4 1.8 2.5 2.4l.5-.5c.2-.2.5-.3.8-.1l1.5.7c.3.1.4.3.4.6v.4c0 .5-.4 1-1 1.1-3.5.3-7.6-3.7-7.3-7.2.1-.1.2-.1.3-.1Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "brain") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M9 4.5A3 3 0 0 0 6 7.4 3.6 3.6 0 0 0 4 13.6 3.2 3.2 0 0 0 8.8 18H9V4.5ZM15 4.5a3 3 0 0 1 3 2.9 3.6 3.6 0 0 1 2 6.2 3.2 3.2 0 0 1-4.8 4.4H15V4.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 9H6.8M15 9h2.2M9 13H6.4M15 13h2.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "inbox") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 13 6.4 6.5A1.5 1.5 0 0 1 7.8 5h8.4a1.5 1.5 0 0 1 1.4 1.5L20 13v5.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V13Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M4 13h4l1.2 2h5.6l1.2-2h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M19 12a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 3.1h5l.3-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "billing" || name === "card") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M4 10h16M7 15h4" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="m5 12.5 4 4L19 6.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "warning") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 4 21 20H3L12 4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 9v4M12 16.5h.01"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12h14M13 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M20 7v5h-5M4 17v-5h5M18.2 9A7 7 0 0 0 6.6 6.2L4 8.7M5.8 15A7 7 0 0 0 17.4 17.8L20 15.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className={common} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getPlanName(plan: string | null | undefined) {
  if (plan === "starter") return "Starter";
  if (plan === "business") return "Business";
  return "Growth";
}

function getPlanPrice(plan: string | null | undefined) {
  if (plan === "starter") return "€19";
  if (plan === "business") return "€69";
  return "€49";
}

export default function BillingPage() {
  const router = useRouter();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const currentPlanName = useMemo(
    () => getPlanName(workspace?.selected_plan),
    [workspace?.selected_plan]
  );

  const currentPlanPrice = useMemo(
    () => getPlanPrice(workspace?.selected_plan),
    [workspace?.selected_plan]
  );

  async function loadWorkspace() {
    try {
      setLoading(true);
      setNotice("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        router.replace("/signup");
        return;
      }

      const { data, error } = await supabase
        .from("artipilot_workspaces")
        .select(
          "id, owner_user_id, selected_plan, selected_offer, business_name, business_type, main_language, whatsapp_connected, ai_live, setup_completed"
        )
        .eq("owner_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Billing workspace load error:", error);
        setNotice("Could not load billing details. Please refresh and try again.");
        return;
      }

      if (!data) {
        router.replace("/setup");
        return;
      }

      const currentWorkspace = data as Workspace;

      if (!currentWorkspace.setup_completed) {
        const plan = currentWorkspace.selected_plan || "growth";
        const offer = currentWorkspace.selected_offer || "first-month-1eur";
        router.replace(`/setup?plan=${plan}&offer=${offer}`);
        return;
      }

      setWorkspace(currentWorkspace);
      localStorage.setItem("artipilot_workspace_id", currentWorkspace.id);
      localStorage.setItem(
        "artipilot_selected_plan",
        currentWorkspace.selected_plan || "growth"
      );
      localStorage.setItem(
        "artipilot_selected_offer",
        currentWorkspace.selected_offer || "first-month-1eur"
      );
    } catch (error) {
      console.error("Billing load error:", error);
      setNotice("Something went wrong while loading billing.");
    } finally {
      setLoading(false);
    }
  }

  async function handleChoosePlan(planSlug: string, planName: string) {
    if (!workspace) return;

    try {
      setNotice("");

      const { error } = await supabase
        .from("artipilot_workspaces")
        .update({
          selected_plan: planSlug,
          selected_offer: "first-month-1eur",
        })
        .eq("id", workspace.id)
        .eq("owner_user_id", workspace.owner_user_id);

      if (error) {
        console.error("Plan update error:", error);
        setNotice("Plan could not be updated. Please try again.");
        return;
      }

      setWorkspace({
        ...workspace,
        selected_plan: planSlug,
        selected_offer: "first-month-1eur",
      });

      localStorage.setItem("artipilot_selected_plan", planSlug);
      localStorage.setItem("artipilot_selected_offer", "first-month-1eur");

      setNotice(
        `${planName} selected. Stripe checkout is not connected yet, so no payment has been taken. Later this button will open checkout: €1 for the first month, then the normal monthly price.`
      );
    } catch (error) {
      console.error("Choose plan error:", error);
      setNotice("Something went wrong while selecting this plan.");
    }
  }

  useEffect(() => {
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070D] px-4 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-[#0B101A] p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#36FF9F]/20 border-t-[#36FF9F]" />
          <p className="mt-5 font-black">Loading billing...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070D] pb-24 text-white lg:pb-0">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(54,255,159,0.10),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(0,212,255,0.08),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(24,119,242,0.10),transparent_35%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[290px] shrink-0 border-r border-white/10 bg-[#080D16]/85 p-5 backdrop-blur-xl lg:block">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-black shadow-[0_0_28px_rgba(54,255,159,0.14)]">
              <Image
                src="/artipilot-logo.png"
                alt="Artipilot logo"
                width={40}
                height={40}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>

            <div>
              <p className="text-lg font-black leading-none">Artipilot</p>
              <p className="mt-1 text-xs text-[#8E99AD]">
                AI WhatsApp Automation
              </p>
            </div>
          </Link>

          <div className="mt-7 rounded-[1.5rem] border border-[#36FF9F]/20 bg-[#36FF9F]/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#36FF9F]/10 text-[#36FF9F]">
                <Icon name="billing" />
              </div>

              <div>
                <p className="font-black">Billing</p>
                <p className="mt-1 text-xs text-[#A8B3C7]">
                  {currentPlanName} · {currentPlanPrice}/month
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map(([name, description, href, icon]) => (
              <Link
                key={name}
                href={href}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition duration-200 ${
                  name === "Billing"
                    ? "border-[#36FF9F]/25 bg-[#36FF9F]/12 text-white"
                    : "border-transparent text-[#A8B3C7] hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    name === "Billing"
                      ? "bg-[#36FF9F]/15 text-[#36FF9F]"
                      : "bg-white/[0.04] text-[#8E99AD] group-hover:text-[#36FF9F]"
                  }`}
                >
                  <Icon name={icon as IconName} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{name}</p>
                  <p className="mt-0.5 truncate text-xs text-[#657089]">
                    {description}
                  </p>
                </div>
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070D]/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#8E99AD]">Billing</p>
                <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                  Choose your Artipilot plan
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={loadWorkspace}
                  className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.07] sm:inline-flex"
                >
                  <Icon name="refresh" className="h-4 w-4" />
                  Refresh
                </button>

                <Link
                  href="/dashboard"
                  className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.07]"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
            {notice ? (
              <div className="mb-5 rounded-[1.4rem] border border-[#36FF9F]/25 bg-[#36FF9F]/10 p-4 text-sm font-bold text-[#B9FFD9]">
                {notice}
              </div>
            ) : null}

            <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0B101A] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.35)] sm:p-8">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#36FF9F]/10 blur-3xl" />
              <div className="absolute -bottom-20 left-12 h-72 w-72 rounded-full bg-[#00D4FF]/8 blur-3xl" />

              <div className="relative">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-4 py-2 text-sm font-black text-[#36FF9F]">
                  <Icon name="spark" className="h-4 w-4" />
                  €1 first month offer
                </div>

                <h2 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                  Start for €1. Continue with your selected plan.
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-[#A8B3C7] sm:text-base">
                  New accounts can start any plan for €1 for the first month.
                  After the first month, the subscription continues at the normal
                  monthly price unless cancelled before renewal.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    ["Current plan", currentPlanName],
                    ["First month", "€1"],
                    ["After month one", `${currentPlanPrice}/month`],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[1.4rem] border border-white/10 bg-[#05070D] p-4"
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

                <div className="mt-8 grid gap-5 lg:grid-cols-3">
                  {plans.map((plan) => {
                    const isCurrentPlan = workspace?.selected_plan
                      ? workspace.selected_plan === plan.slug
                      : plan.slug === "growth";

                    return (
                      <div
                        key={plan.name}
                        className={`relative rounded-[2rem] border p-6 ${
                          plan.popular
                            ? "border-[#36FF9F]/35 bg-[#36FF9F]/10 shadow-[0_0_50px_rgba(54,255,159,0.12)]"
                            : "border-white/10 bg-[#05070D]"
                        }`}
                      >
                        <div className="mb-4 flex flex-wrap gap-2">
                          {plan.popular ? (
                            <div className="inline-flex rounded-full border border-[#36FF9F]/25 bg-[#36FF9F]/15 px-3 py-1 text-xs font-black text-[#36FF9F]">
                              Most popular
                            </div>
                          ) : null}

                          {isCurrentPlan ? (
                            <div className="inline-flex rounded-full border border-[#00D4FF]/25 bg-[#00D4FF]/10 px-3 py-1 text-xs font-black text-[#80E9FF]">
                              Current plan
                            </div>
                          ) : null}
                        </div>

                        <h3 className="text-2xl font-black">{plan.name}</h3>

                        <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#36FF9F]">
                            First month
                          </p>

                          <div className="mt-2 flex items-end gap-2">
                            <p className="bg-gradient-to-r from-white via-[#B9F6FF] to-[#36FF9F] bg-clip-text text-5xl font-black leading-none text-transparent">
                              €1
                            </p>
                            <p className="pb-1 text-sm font-bold text-[#A8B3C7]">
                              for 30 days
                            </p>
                          </div>

                          <p className="mt-3 text-sm font-black text-white">
                            Then {plan.price}/month
                          </p>
                        </div>

                        <p className="mt-4 text-sm leading-6 text-[#A8B3C7]">
                          {plan.description}
                        </p>

                        <div className="mt-6 space-y-3">
                          {plan.features.map((feature) => (
                            <div key={feature} className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#36FF9F]/10 text-[#36FF9F]">
                                <Icon name="check" className="h-3.5 w-3.5" />
                              </div>
                              <p className="text-sm font-bold text-[#D8DEEA]">
                                {feature}
                              </p>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleChoosePlan(plan.slug, plan.name)}
                          className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black transition active:scale-[0.98] ${
                            plan.popular
                              ? "bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] text-[#03100A] hover:-translate-y-0.5"
                              : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]"
                          }`}
                        >
                          {isCurrentPlan
                            ? "Keep this plan"
                            : `Choose ${plan.name}`}
                          <Icon name="arrow" className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
              <div className="rounded-[2rem] border border-white/10 bg-[#0B101A] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD166]/20 bg-[#FFD166]/10 px-4 py-2 text-sm font-black text-[#FFD166]">
                  <Icon name="warning" className="h-4 w-4" />
                  Payment setup pending
                </div>

                <h3 className="mt-4 text-2xl font-black">
                  Stripe checkout is not connected yet
                </h3>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8E99AD]">
                  This page now saves the selected plan in Supabase, but it does
                  not charge the customer yet. Later we will connect Stripe
                  Checkout, subscriptions, invoices, customer portal, and the
                  real €1 first-month payment flow.
                </p>
              </div>

              <aside className="rounded-[2rem] border border-white/10 bg-[#0B101A] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#36FF9F]">
                  Workspace
                </p>

                <h3 className="mt-2 text-2xl font-black">Current account</h3>

                <div className="mt-6 space-y-3">
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-black text-white">Business</p>
                    <p className="mt-1 text-sm text-[#8E99AD]">
                      {workspace?.business_name || "Not set yet"}
                    </p>
                  </div>

                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-black text-white">Plan</p>
                    <p className="mt-1 text-sm font-bold text-[#36FF9F]">
                      {currentPlanName} · {currentPlanPrice}/month
                    </p>
                  </div>

                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-black text-white">Offer</p>
                    <p className="mt-1 text-sm font-bold text-[#36FF9F]">
                      €1 first month
                    </p>
                  </div>

                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-black text-white">WhatsApp</p>
                    <p
                      className={`mt-1 text-sm font-bold ${
                        workspace?.whatsapp_connected
                          ? "text-[#36FF9F]"
                          : "text-[#FFD166]"
                      }`}
                    >
                      {workspace?.whatsapp_connected
                        ? "Connected"
                        : "Not connected"}
                    </p>
                  </div>

                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-black text-white">AI Training</p>
                    <p
                      className={`mt-1 text-sm font-bold ${
                        workspace?.ai_live ? "text-[#36FF9F]" : "text-[#FFD166]"
                      }`}
                    >
                      {workspace?.ai_live ? "Live" : "Not active yet"}
                    </p>
                  </div>

                  <Link
                    href="/dashboard/ai-training"
                    className="flex items-center justify-center gap-2 rounded-full border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-5 py-3 text-sm font-black text-[#36FF9F] transition hover:bg-[#36FF9F]/15"
                  >
                    <Icon name="brain" className="h-4 w-4" />
                    Open AI Training
                  </Link>
                </div>
              </aside>
            </section>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-[1.6rem] border border-white/10 bg-[#080D16]/95 p-2 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {[
            ["Dashboard", "/dashboard", "home"],
            ["WhatsApp", "/dashboard/whatsapp", "whatsapp"],
            ["Training", "/dashboard/ai-training", "brain"],
            ["Inbox", "/dashboard/inbox", "inbox"],
            ["Billing", "/dashboard/billing", "billing"],
          ].map(([label, href, icon]) => (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-black ${
                label === "Billing"
                  ? "bg-[#36FF9F]/10 text-[#36FF9F]"
                  : "text-[#8E99AD]"
              }`}
            >
              <Icon name={icon as IconName} className="h-5 w-5" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}