"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  | "message"
  | "faq"
  | "rocket"
  | "business"
  | "plug"
  | "test"
  | "shield"
  | "clock"
  | "users"
  | "arrow"
  | "logout";

type Workspace = {
  id: string;
  owner_user_id: string;
  selected_plan: string | null;
  selected_offer?: string | null;
  business_name: string | null;
  business_type: string | null;
  main_language: string | null;
  ai_job: string | null;
  business_rules: string | null;
  setup_completed: boolean | null;
  whatsapp_connected: boolean | null;
  ai_live: boolean | null;
};

type WhatsAppConnection = {
  id: string;
  status: string | null;
  phone_number_id: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
};

type NavItem = {
  name: string;
  description: string;
  href: string;
  icon: IconName;
  badge?: string;
};

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    description: "Launch overview",
    href: "/dashboard",
    icon: "home",
  },
  {
    name: "WhatsApp",
    description: "Connect number",
    href: "/dashboard/whatsapp",
    icon: "whatsapp",
    badge: "Required",
  },
  {
    name: "AI Training",
    description: "Teach assistant",
    href: "/dashboard/ai-training",
    icon: "brain",
  },
  {
    name: "Inbox",
    description: "Customer chats",
    href: "/dashboard/inbox",
    icon: "inbox",
  },
  {
    name: "Settings",
    description: "Business profile",
    href: "/dashboard/settings",
    icon: "settings",
  },
  {
    name: "Billing",
    description: "Plan and payments",
    href: "/dashboard/billing",
    icon: "billing",
  },
];

const trainingCards = [
  {
    title: "Business rules",
    description: "Tell the AI what it should never forget.",
    icon: "shield" as IconName,
    status: "Ready",
  },
  {
    title: "Opening hours",
    description: "Let customers know when your team is available.",
    icon: "clock" as IconName,
    status: "Next",
  },
  {
    title: "FAQs",
    description: "Add common questions and ready-made answers.",
    icon: "faq" as IconName,
    status: "Next",
  },
  {
    title: "Booking flow",
    description: "Choose what details the AI must collect.",
    icon: "message" as IconName,
    status: "Next",
  },
];

function getPlanName(plan: string | null) {
  if (plan === "starter") return "Starter";
  if (plan === "business") return "Business";
  return "Growth";
}

function getPlanPrice(plan: string | null) {
  if (plan === "starter") return "€19";
  if (plan === "business") return "€69";
  return "€49";
}

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
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

  if (name === "billing") {
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

  if (name === "spark") {
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

  if (name === "message") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-5 4v-4.2A2.5 2.5 0 0 1 5 12.5v-6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8 8h8M8 11h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "faq") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9.8 9a2.3 2.3 0 1 1 3.5 2c-.8.5-1.3 1-1.3 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 16.5h.01"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "rocket") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M14 4c2.5-.8 4.7-.6 6 .7.4 1.3.5 3.5-.7 6L13 17l-6-6 7-7Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 15 6 18H4l1-3 3-3M15 9h.01M13 17l-1 4-3-3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "business") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 21V5.5A1.5 1.5 0 0 1 6.5 4h8A1.5 1.5 0 0 1 16 5.5V21"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M16 10h2.5A1.5 1.5 0 0 1 20 11.5V21M3 21h18M8 8h2M8 12h2M8 16h2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "plug") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M8 7V3M16 7V3M7 7h10v4a5 5 0 0 1-10 0V7ZM12 16v5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "test") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 15h8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3 20 6.5v5.8c0 4.4-3.3 7.2-8 8.7-4.7-1.5-8-4.3-8-8.7V6.5L12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 7v5l3 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20a6 6 0 0 1 12 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M17 11a3 3 0 0 0 0-6M16 15a5 5 0 0 1 5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M10 6H6.5A1.5 1.5 0 0 0 5 7.5v9A1.5 1.5 0 0 0 6.5 18H10M14 8l4 4-4 4M18 12H9"
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
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusPill({
  status,
}: {
  status: "completed" | "next" | "locked" | string;
}) {
  const styles =
    status === "completed"
      ? "border-[#36FF9F]/20 bg-[#36FF9F]/10 text-[#36FF9F]"
      : status === "next"
        ? "border-[#00D4FF]/25 bg-[#00D4FF]/10 text-[#80E9FF]"
        : "border-white/10 bg-white/[0.04] text-[#8E99AD]";

  const label =
    status === "completed" ? "Done" : status === "next" ? "Next" : status;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${styles}`}
    >
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          router.replace("/signup");
          return;
        }

        setUserEmail(session.user.email || null);

        const { data: workspaces, error: workspaceError } = await supabase
          .from("artipilot_workspaces")
          .select("*")
          .eq("owner_user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (workspaceError) {
          console.error("Dashboard workspace error:", workspaceError);
          return;
        }

        const currentWorkspace = workspaces?.[0] as Workspace | undefined;

        if (!currentWorkspace) {
          router.replace("/setup");
          return;
        }

        if (!currentWorkspace.setup_completed) {
          const plan = currentWorkspace.selected_plan || "growth";
          const offer = currentWorkspace.selected_offer || "first-month-1eur";
          router.replace(`/setup?plan=${plan}&offer=${offer}`);
          return;
        }

        setWorkspace(currentWorkspace);
        setAiEnabled(Boolean(currentWorkspace.ai_live));

        localStorage.setItem("artipilot_workspace_id", currentWorkspace.id);
        localStorage.setItem(
          "artipilot_selected_plan",
          currentWorkspace.selected_plan || "growth"
        );
        localStorage.setItem(
          "artipilot_selected_offer",
          currentWorkspace.selected_offer || "first-month-1eur"
        );

        const { data: connections } = await supabase
          .from("artipilot_whatsapp_connections")
          .select(
            "id, status, phone_number_id, display_phone_number, verified_name"
          )
          .eq("workspace_id", currentWorkspace.id)
          .eq("owner_user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        setConnection((connections?.[0] as WhatsAppConnection) || null);

        const { count: messagesTotal } = await supabase
          .from("artipilot_messages")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", currentWorkspace.id)
          .eq("owner_user_id", session.user.id);

        const { count: contactsTotal } = await supabase
          .from("artipilot_contacts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", currentWorkspace.id)
          .eq("owner_user_id", session.user.id);

        setMessageCount(messagesTotal || 0);
        setContactCount(contactsTotal || 0);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  const whatsappConnected = Boolean(
    workspace?.whatsapp_connected || connection?.status === "connected"
  );

  const planName = getPlanName(workspace?.selected_plan || "growth");
  const planPrice = getPlanPrice(workspace?.selected_plan || "growth");

  const checklist = useMemo(() => {
    return [
      {
        title: "Business profile",
        description: workspace?.business_name
          ? `${workspace.business_name} profile is ready.`
          : "Your basic business details are ready.",
        status: "completed" as const,
        icon: "business" as IconName,
      },
      {
        title: "Connect WhatsApp",
        description: whatsappConnected
          ? connection?.display_phone_number
            ? `Connected: ${connection.display_phone_number}`
            : "WhatsApp is connected."
          : "Connect your WhatsApp Business number to receive messages.",
        status: whatsappConnected ? ("completed" as const) : ("next" as const),
        icon: "whatsapp" as IconName,
      },
      {
        title: "Train your AI",
        description:
          "Add prices, FAQs, services, rules and booking instructions.",
        status: whatsappConnected ? ("next" as const) : ("locked" as const),
        icon: "brain" as IconName,
      },
      {
        title: "Test assistant",
        description: "Send test messages before your AI talks to customers.",
        status: whatsappConnected ? ("next" as const) : ("locked" as const),
        icon: "test" as IconName,
      },
      {
        title: "Go live",
        description: "Turn on automation when everything looks perfect.",
        status: workspace?.ai_live ? ("completed" as const) : ("locked" as const),
        icon: "rocket" as IconName,
      },
    ];
  }, [workspace, whatsappConnected, connection]);

  const progress = useMemo(() => {
    const completed = checklist.filter(
      (item) => item.status === "completed"
    ).length;

    return Math.round((completed / checklist.length) * 100);
  }, [checklist]);

  async function switchAccount() {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("artipilot_workspace_id");
      localStorage.removeItem("artipilot_workspace_setup");
      localStorage.removeItem("artipilot_selected_plan");
      localStorage.removeItem("artipilot_selected_offer");
      router.replace("/signup");
    } catch (error) {
      console.error("Switch account error:", error);
    }
  }

  async function toggleAiLive() {
    if (!workspace) return;

    const nextValue = !aiEnabled;
    setAiEnabled(nextValue);

    const { error } = await supabase
      .from("artipilot_workspaces")
      .update({
        ai_live: nextValue,
      })
      .eq("id", workspace.id)
      .eq("owner_user_id", workspace.owner_user_id);

    if (error) {
      console.error("AI live update error:", error);
      setAiEnabled(!nextValue);
      return;
    }

    setWorkspace({
      ...workspace,
      ai_live: nextValue,
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070D] px-4 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-[#0B101A] p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#36FF9F]/20 border-t-[#36FF9F]" />
          <p className="mt-5 font-black">Loading dashboard...</p>
          <p className="mt-2 text-sm text-[#8E99AD]">
            Preparing your workspace.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070D] pb-24 text-white lg:pb-0">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,rgba(0,212,255,0.10),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(54,255,159,0.08),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,138,31,0.06),transparent_34%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[290px] border-r border-white/10 bg-[#080D16]/80 p-5 backdrop-blur-xl lg:block">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-black">
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

          <div
            className={`mt-7 rounded-[1.6rem] border p-4 ${
              whatsappConnected
                ? "border-[#36FF9F]/15 bg-[#36FF9F]/10"
                : "border-[#FFB020]/15 bg-[#FFB020]/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  whatsappConnected
                    ? "bg-[#36FF9F]/10 text-[#36FF9F]"
                    : "bg-[#FFB020]/10 text-[#FFD166]"
                }`}
              >
                <Icon name={whatsappConnected ? "check" : "warning"} />
              </div>

              <div>
                <p className="font-black">
                  {whatsappConnected ? "Connected" : "Not live yet"}
                </p>
                <p className="mt-1 text-xs text-[#B6C0D4]">
                  {whatsappConnected
                    ? connection?.display_phone_number || "WhatsApp connected."
                    : "Connect WhatsApp first."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#36FF9F]">
              Account
            </p>

            <p className="mt-2 truncate text-sm font-bold text-white">
              {userEmail || "Signed in"}
            </p>

            <button
              type="button"
              onClick={switchAccount}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-[#C8D0E0] transition hover:bg-white/[0.07]"
            >
              <Icon name="logout" className="h-4 w-4" />
              Switch account
            </button>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item, index) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition duration-200 ${
                  index === 0
                    ? "border-[#36FF9F]/20 bg-[#36FF9F]/10 text-white"
                    : "border-transparent text-[#A8B3C7] hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    index === 0
                      ? "bg-[#36FF9F]/12 text-[#36FF9F]"
                      : "bg-white/[0.04] text-[#8E99AD] group-hover:text-[#36FF9F]"
                  }`}
                >
                  <Icon name={item.icon} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black">{item.name}</p>

                    {item.badge && !whatsappConnected ? (
                      <span className="rounded-full bg-[#00D4FF]/10 px-2 py-0.5 text-[10px] font-black text-[#80E9FF]">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-0.5 truncate text-xs text-[#657089]">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </nav>

          <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-black">Launch progress</p>

            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-[#8E99AD]">
              {progress}% completed.{" "}
              {whatsappConnected
                ? "Train and test your AI next."
                : "Connect WhatsApp to unlock the next setup steps."}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070D]/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <Link
                href="/dashboard"
                className="flex min-w-0 items-center gap-3 lg:hidden"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black">
                  <Image
                    src="/artipilot-logo.png"
                    alt="Artipilot logo"
                    width={38}
                    height={38}
                    className="h-8 w-8 object-contain"
                    priority
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-base font-black leading-none">
                    Artipilot
                  </p>
                  <p className="mt-1 text-xs text-[#8E99AD]">Dashboard</p>
                </div>
              </Link>

              <div className="hidden lg:block">
                <p className="text-sm font-bold text-[#8E99AD]">
                  Workspace dashboard
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">
                  {workspace?.business_name
                    ? `Welcome, ${workspace.business_name}`
                    : "Welcome back"}
                </h1>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={toggleAiLive}
                  className={`hidden rounded-full border px-4 py-2 text-sm font-black transition sm:inline-flex ${
                    aiEnabled
                      ? "border-[#36FF9F]/25 bg-[#36FF9F]/10 text-[#36FF9F]"
                      : "border-white/10 bg-white/[0.04] text-[#A8B3C7]"
                  }`}
                >
                  AI {aiEnabled ? "On" : "Off"}
                </button>

                <Link
                  href="/dashboard/whatsapp"
                  className="inline-flex items-center gap-2 rounded-full border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-4 py-2 text-sm font-black text-[#36FF9F] transition hover:bg-[#36FF9F]/15 active:scale-[0.98]"
                >
                  <Icon name="whatsapp" className="h-4 w-4" />
                  {whatsappConnected ? "Manage" : "Connect"}
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0B101A] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8">
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#36FF9F]/10 blur-3xl" />
                <div className="absolute bottom-0 left-20 h-64 w-64 rounded-full bg-[#00D4FF]/10 blur-3xl" />

                <div className="relative">
                  <div
                    className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${
                      whatsappConnected
                        ? "border-[#36FF9F]/20 bg-[#36FF9F]/10 text-[#36FF9F]"
                        : "border-[#FFB020]/20 bg-[#FFB020]/10 text-[#FFD166]"
                    }`}
                  >
                    <Icon
                      name={whatsappConnected ? "check" : "warning"}
                      className="h-4 w-4"
                    />
                    {whatsappConnected
                      ? "WhatsApp connected"
                      : "Your AI is not live yet"}
                  </div>

                  <h2 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
                    {whatsappConnected
                      ? "Your WhatsApp workspace is ready."
                      : "Connect WhatsApp to start receiving customer messages."}
                  </h2>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-[#A8B3C7]">
                    {whatsappConnected
                      ? "Now train your AI, test replies, and go live when everything looks perfect."
                      : "Your workspace is ready. The next important step is to connect your WhatsApp Business number, then train and test your AI before going live."}
                  </p>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/dashboard/whatsapp"
                      className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full border border-[#36FF9F]/20 bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] px-6 py-4 text-base font-black text-[#03100A] shadow-[0_0_28px_rgba(54,255,159,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(54,255,159,0.25)] active:translate-y-0 active:scale-[0.98]"
                    >
                      <span className="absolute inset-0 bg-white/0 transition duration-300 group-hover:bg-white/15" />
                      <Icon name="whatsapp" className="relative h-5 w-5" />
                      <span className="relative">
                        {whatsappConnected
                          ? "Manage WhatsApp"
                          : "Connect WhatsApp"}
                      </span>
                      <Icon name="arrow" className="relative h-5 w-5" />
                    </Link>

                    <Link
                      href="/dashboard/ai-training"
                      className="inline-flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-6 py-4 text-base font-black text-white transition hover:bg-white/[0.07] active:scale-[0.98]"
                    >
                      <Icon name="brain" className="h-5 w-5 text-[#36FF9F]" />
                      Train AI
                    </Link>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[#0B101A] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.30)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#36FF9F]">
                      Quick status
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      Launch checklist
                    </h3>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#36FF9F]/15 bg-[#36FF9F]/10 text-[#36FF9F]">
                    <Icon name="rocket" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {checklist.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#05070D] p-4"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                          item.status === "completed"
                            ? "bg-[#36FF9F]/10 text-[#36FF9F]"
                            : item.status === "next"
                              ? "bg-[#00D4FF]/10 text-[#80E9FF]"
                              : "bg-white/[0.04] text-[#657089]"
                        }`}
                      >
                        <Icon
                          name={
                            item.status === "completed" ? "check" : item.icon
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black">{item.title}</p>
                          <StatusPill status={item.status} />
                        </div>

                        <p className="mt-1 text-sm leading-5 text-[#8E99AD]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.7rem] border border-white/10 bg-[#0B101A] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#36FF9F]/10 text-[#36FF9F]">
                  <Icon name="message" />
                </div>
                <p className="mt-4 text-2xl font-black">{messageCount}</p>
                <p className="mt-1 text-sm text-[#8E99AD]">Customer messages</p>
              </div>

              <div className="rounded-[1.7rem] border border-white/10 bg-[#0B101A] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00D4FF]/10 text-[#80E9FF]">
                  <Icon name="users" />
                </div>
                <p className="mt-4 text-2xl font-black">{contactCount}</p>
                <p className="mt-1 text-sm text-[#8E99AD]">Contacts</p>
              </div>

              <div className="rounded-[1.7rem] border border-white/10 bg-[#0B101A] p-5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    whatsappConnected
                      ? "bg-[#36FF9F]/10 text-[#36FF9F]"
                      : "bg-[#FFB020]/10 text-[#FFD166]"
                  }`}
                >
                  <Icon name={whatsappConnected ? "check" : "warning"} />
                </div>
                <p className="mt-4 text-2xl font-black">
                  {whatsappConnected ? "Connected" : "Not connected"}
                </p>
                <p className="mt-1 text-sm text-[#8E99AD]">WhatsApp status</p>
              </div>

              <div className="rounded-[1.7rem] border border-white/10 bg-[#0B101A] p-5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    aiEnabled
                      ? "bg-[#36FF9F]/10 text-[#36FF9F]"
                      : "bg-white/[0.04] text-[#A8B3C7]"
                  }`}
                >
                  <Icon name="spark" />
                </div>
                <p className="mt-4 text-2xl font-black">
                  {aiEnabled ? "Live" : "Draft"}
                </p>
                <p className="mt-1 text-sm text-[#8E99AD]">AI mode</p>
              </div>
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[2rem] border border-white/10 bg-[#0B101A] p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#36FF9F]">
                      Plan
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      {planName} · €1 first month
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#8E99AD]">
                      Your selected plan is {planName}. After the first month,
                      it continues at {planPrice}/month unless cancelled before
                      renewal.
                    </p>
                  </div>

                  <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#36FF9F]/10 text-[#36FF9F] sm:flex">
                    <Icon name="billing" className="h-7 w-7" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    "€1 for the first month",
                    `${planPrice}/month after the first month`,
                    "Cancel anytime before renewal",
                    "Billing activation will be handled in the billing page",
                  ].map((text) => (
                    <div
                      key={text}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#05070D] p-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#36FF9F]/10 text-[#36FF9F]">
                        <Icon name="check" className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-bold text-[#C8D0E0]">{text}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/dashboard/billing"
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-6 py-4 text-base font-black text-white transition hover:bg-white/[0.07] active:scale-[0.98]"
                >
                  <Icon name="billing" />
                  Open billing
                </Link>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[#0B101A] p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#36FF9F]">
                      AI training
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      Teach your assistant
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#8E99AD]">
                      Add the information your AI needs to answer like your best
                      employee.
                    </p>
                  </div>

                  <Link
                    href="/dashboard/ai-training"
                    className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-black text-[#C8D0E0] transition hover:bg-white/[0.04] sm:inline-flex"
                  >
                    Open
                  </Link>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {trainingCards.map((card) => (
                    <Link
                      key={card.title}
                      href="/dashboard/ai-training"
                      className="group rounded-[1.4rem] border border-white/10 bg-[#05070D] p-4 transition hover:-translate-y-0.5 hover:border-[#36FF9F]/20 hover:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04] text-[#36FF9F]">
                          <Icon name={card.icon} />
                        </div>

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-black text-[#8E99AD]">
                          {card.status}
                        </span>
                      </div>

                      <p className="mt-4 font-black text-white">{card.title}</p>
                      <p className="mt-1 text-sm leading-5 text-[#8E99AD]">
                        {card.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-[1.6rem] border border-white/10 bg-[#080D16]/95 p-2 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {[
            navItems[0],
            navItems[1],
            navItems[2],
            navItems[3],
            navItems[4],
          ].map((item, index) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-black ${
                index === 0
                  ? "bg-[#36FF9F]/10 text-[#36FF9F]"
                  : "text-[#8E99AD]"
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              <span className="max-w-full truncate">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}