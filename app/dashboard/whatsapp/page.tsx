"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  setup_completed: boolean | null;
};

type WhatsAppConnection = {
  id: string;
  workspace_id: string;
  owner_user_id: string;
  status: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
  phone_number_id?: string | null;
  waba_id?: string | null;
  meta_business_id?: string | null;
  last_connected_at: string | null;
};

type MetaEmbeddedSignupData = {
  business_id?: string;
  waba_id?: string;
  phone_number_id?: string;
  phone_number?: string;
  verified_name?: string;
};

type FacebookAuthResponse = {
  code?: string;
  accessToken?: string;
};

type FacebookLoginResponse = {
  authResponse?: FacebookAuthResponse;
  status?: string;
};

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: Record<string, unknown>
      ) => void;
    };
  }
}

type IconName =
  | "home"
  | "whatsapp"
  | "brain"
  | "inbox"
  | "settings"
  | "billing"
  | "check"
  | "warning"
  | "arrow"
  | "meta"
  | "refresh"
  | "lock"
  | "plug"
  | "spark"
  | "logout";

const navItems = [
  ["Dashboard", "Launch overview", "/dashboard", "home"],
  ["WhatsApp", "Connect number", "/dashboard/whatsapp", "whatsapp"],
  ["AI Training", "Teach your assistant", "/dashboard/ai-training", "brain"],
  ["Inbox", "Customer chats", "/dashboard/inbox", "inbox"],
  ["Settings", "Business profile", "/dashboard/settings", "settings"],
  ["Billing", "Plan and payments", "/dashboard/billing", "billing"],
] as const;

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

  if (name === "meta") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M3.5 15.2c0-4.5 2.2-8.4 4.9-8.4 1.6 0 2.8 1.1 4.1 3.1 1.3-2 2.6-3.1 4.2-3.1 2.7 0 4.8 3.9 4.8 8.4 0 1.7-.7 2.8-2 2.8-1.4 0-2.4-1-4.8-4.9l-2.2-3.4-2.2 3.4C7.9 17 6.9 18 5.5 18c-1.3 0-2-1.1-2-2.8Z"
          stroke="currentColor"
          strokeWidth="1.8"
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

  if (name === "lock") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M7 10V8a5 5 0 0 1 10 0v2M6.5 10h11A1.5 1.5 0 0 1 19 11.5v7A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-7A1.5 1.5 0 0 1 6.5 10Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
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
        d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ConnectionVisual() {
  return (
    <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-[#05070D] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[#36FF9F]/20 bg-black shadow-[0_0_34px_rgba(54,255,159,0.14)]">
            <Image
              src="/artipilot-logo.png"
              alt="Artipilot logo"
              width={42}
              height={42}
              className="h-10 w-10 object-contain"
              priority
            />
          </div>
          <p className="text-xs font-black text-white">Artipilot</p>
        </div>

        <div className="relative h-16 flex-1 overflow-hidden rounded-full border border-white/10 bg-black/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(24,119,242,0.20),transparent_55%)]" />
          <div className="connection-wave absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-gradient-to-r from-[#36FF9F] via-[#7AD7FF] to-[#1877F2]" />
          <div className="connection-dot absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#A7FFCB] shadow-[0_0_22px_rgba(54,255,159,0.95)]" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1877F2]/25 bg-[#0A1019] text-[#7EB6FF] shadow-[0_0_34px_rgba(24,119,242,0.16)]">
            <Icon name="meta" className="h-9 w-9" />
          </div>
          <p className="text-xs font-black text-white">Meta</p>
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppConnectPage() {
  const router = useRouter();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [metaConnecting, setMetaConnecting] = useState(false);
  const [facebookReady, setFacebookReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const signupDataRef = useRef<MetaEmbeddedSignupData | null>(null);

  const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
  const metaConfigId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

  const isDemoConnection =
    connection?.display_phone_number === "DEMO WhatsApp Number" ||
    connection?.verified_name === "Demo Customer" ||
    connection?.phone_number_id === "demo_phone_number_id" ||
    connection?.waba_id === "demo_waba_id";

  const connected = Boolean(
    connection?.status === "connected" &&
      !isDemoConnection &&
      (connection?.phone_number_id ||
        connection?.waba_id ||
        connection?.display_phone_number)
  );

  const loadConnection = useCallback(async () => {
    try {
      setRefreshing(true);
      setNotice("");

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
        .select(
          "id, owner_user_id, selected_plan, selected_offer, business_name, business_type, main_language, whatsapp_connected, ai_live, setup_completed"
        )
        .eq("owner_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (workspaceError) {
        console.error("Workspace load error:", workspaceError);
        setNotice("We could not load your workspace. Please refresh and try again.");
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
      localStorage.setItem("artipilot_workspace_id", currentWorkspace.id);
      localStorage.setItem(
        "artipilot_selected_plan",
        currentWorkspace.selected_plan || "growth"
      );
      localStorage.setItem(
        "artipilot_selected_offer",
        currentWorkspace.selected_offer || "first-month-1eur"
      );

      const { data: connections, error: connectionError } = await supabase
        .from("artipilot_whatsapp_connections")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("owner_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (connectionError) {
        console.error("Connection load error:", connectionError);
        setNotice("We could not check your WhatsApp connection status.");
        return;
      }

      const latestConnection = (connections?.[0] as WhatsAppConnection) || null;
      setConnection(latestConnection);
    } catch (error) {
      console.error("Load WhatsApp connection error:", error);
      setNotice("Something went wrong while loading this page.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  useEffect(() => {
    if (!metaAppId) {
      console.error("Missing NEXT_PUBLIC_META_APP_ID");
      setFacebookReady(false);
      return;
    }

    function initFacebookSdk() {
      if (!window.FB || !metaAppId) return false;

      try {
        window.FB.init({
          appId: metaAppId,
          cookie: true,
          xfbml: false,
          version: "v23.0",
        });

        setFacebookReady(true);
        return true;
      } catch (error) {
        console.error("Facebook SDK init error:", error);
        setFacebookReady(false);
        return false;
      }
    }

    if (window.FB) {
      initFacebookSdk();
      return;
    }

    window.fbAsyncInit = function () {
      initFacebookSdk();
    };

    const oldScript = document.getElementById("facebook-jssdk");
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;

    script.onload = function () {
      window.setTimeout(() => {
        if (window.FB) {
          initFacebookSdk();
        } else {
          setFacebookReady(false);
        }
      }, 700);
    };

    script.onerror = function () {
      setFacebookReady(false);
      setNotice(
        "Meta/Facebook SDK could not load. Please disable ad blocker, refresh, and try again."
      );
    };

    document.body.appendChild(script);
  }, [metaAppId]);

  useEffect(() => {
    function handleEmbeddedSignupMessage(event: MessageEvent) {
      const allowedOrigins = [
        "https://www.facebook.com",
        "https://web.facebook.com",
        "https://connect.facebook.net",
      ];

      if (!allowedOrigins.includes(event.origin)) return;

      let data: unknown = event.data;

      if (typeof event.data === "string") {
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
      }

      const message = data as {
        type?: string;
        event?: string;
        data?: MetaEmbeddedSignupData;
      };

      if (message.type !== "WA_EMBEDDED_SIGNUP") return;

      if (message.event === "FINISH" || message.event === "FINISHED") {
        signupDataRef.current = message.data || null;
      }

      if (message.event === "CANCEL") {
        setMetaConnecting(false);
        setNotice("Meta connection was cancelled. You can try again anytime.");
      }

      if (message.event === "ERROR") {
        setMetaConnecting(false);
        setNotice("Meta connection could not be completed. Please try again.");
      }
    }

    window.addEventListener("message", handleEmbeddedSignupMessage);

    return () => {
      window.removeEventListener("message", handleEmbeddedSignupMessage);
    };
  }, []);

  async function saveMetaConnection(code?: string) {
    if (!workspace?.id) {
      throw new Error("Workspace not loaded yet.");
    }

    const signupData = signupDataRef.current;

    const response = await fetch("/api/meta/embedded-signup/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: workspace.id,
        code: code || null,
        businessId: signupData?.business_id || null,
        wabaId: signupData?.waba_id || null,
        phoneNumberId: signupData?.phone_number_id || null,
        displayPhoneNumber: signupData?.phone_number || null,
        verifiedName: signupData?.verified_name || null,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || "Could not save Meta connection");
    }
  }

  function startMetaConnection() {
    setNotice("");

    if (!metaAppId || !metaConfigId) {
      setNotice(
        "Missing Meta App ID or Configuration ID. Please check your Vercel environment variables."
      );
      return;
    }

    if (!workspace?.id) {
      setNotice("Workspace not loaded yet. Please refresh and try again.");
      return;
    }

    if (!window.FB) {
      setNotice(
        "Meta login is not ready. Please wait 5 seconds, disable ad blocker if enabled, refresh, and try again."
      );
      return;
    }

    setMetaConnecting(true);
    signupDataRef.current = null;

    const popupTimeout = window.setTimeout(() => {
      setMetaConnecting(false);
      setNotice(
        "Meta popup did not respond. Please continue inside the Meta popup if it is still open, or allow popups and try again."
      );
    }, 30000);

    try {
      window.FB.login(
        function (response: FacebookLoginResponse) {
          window.clearTimeout(popupTimeout);

          void (async () => {
            try {
              const code = response.authResponse?.code;

              if (!code) {
                setMetaConnecting(false);
                setNotice(
                  `Meta did not return the connection code. Status: ${
                    response.status || "unknown"
                  }. Please complete the Meta popup and try again.`
                );
                return;
              }

              setNotice("Saving your WhatsApp connection...");

              await saveMetaConnection(code);
              await loadConnection();

              setNotice(
                "WhatsApp connected successfully. Artipilot is ready for the next step."
              );
            } catch (error) {
              console.error("Meta connection save error:", error);

              const message =
                error instanceof Error ? error.message : "Unknown save error";

              setNotice(`We could not save the Meta connection: ${message}`);
            } finally {
              setMetaConnecting(false);
            }
          })();
        },
        {
          config_id: metaConfigId,
          auth_type: "rerequest",
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType: "",
            sessionInfoVersion: "3",
          },
        }
      );
    } catch (error) {
      window.clearTimeout(popupTimeout);

      const message =
        error instanceof Error ? error.message : JSON.stringify(error);

      setMetaConnecting(false);
      setNotice(`Meta login could not start: ${message}`);
    }
  }

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
      setNotice("Could not switch account. Please refresh and try again.");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070D] px-4 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-[#0B101A] p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#1877F2]/20 border-t-[#1877F2]" />
          <p className="mt-5 font-black">Loading WhatsApp setup...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070D] pb-24 text-white lg:pb-0">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(24,119,242,0.15),transparent_33%),radial-gradient(circle_at_85%_15%,rgba(54,255,159,0.07),transparent_28%),radial-gradient(circle_at_20%_100%,rgba(73,182,255,0.08),transparent_30%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[290px] border-r border-white/10 bg-[#080D16]/85 p-5 backdrop-blur-xl lg:block">
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
            className={`mt-7 rounded-[1.5rem] border p-4 ${
              connected
                ? "border-[#36FF9F]/20 bg-[#36FF9F]/10"
                : "border-[#FFB020]/20 bg-[#FFB020]/8"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  connected
                    ? "bg-[#36FF9F]/10 text-[#36FF9F]"
                    : "bg-[#FFB020]/10 text-[#FFD166]"
                }`}
              >
                <Icon name={connected ? "check" : "warning"} />
              </div>

              <div>
                <p className="font-black">
                  {connected ? "Connected" : "Not connected"}
                </p>
                <p className="mt-1 text-xs text-[#A8B3C7]">
                  {connected
                    ? connection?.display_phone_number || "WhatsApp is ready."
                    : "Connect Meta first."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7AB3FF]">
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
            {navItems.map(([name, description, href, icon]) => (
              <Link
                key={name}
                href={href}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition duration-200 ${
                  name === "WhatsApp"
                    ? "border-[#1877F2]/25 bg-[#1877F2]/12 text-white"
                    : "border-transparent text-[#A8B3C7] hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    name === "WhatsApp"
                      ? "bg-[#1877F2]/15 text-[#7AB3FF]"
                      : "bg-white/[0.04] text-[#8E99AD] group-hover:text-[#7AB3FF]"
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
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#8E99AD]">
                  WhatsApp setup
                </p>
                <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                  Connect with Meta
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={loadConnection}
                  disabled={refreshing}
                  className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-[#C8D0E0] transition hover:bg-white/[0.07] disabled:opacity-60 sm:inline-flex"
                >
                  <Icon
                    name="refresh"
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <Link
                  href="/dashboard"
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-white transition hover:bg-white/[0.07]"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
            <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0B101A] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.38)] sm:p-8">
                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#1877F2]/18 blur-3xl" />
                <div className="absolute -bottom-20 left-12 h-72 w-72 rounded-full bg-[#36FF9F]/8 blur-3xl" />

                <div className="relative max-w-2xl">
                  <div
                    className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${
                      connected
                        ? "border-[#36FF9F]/20 bg-[#36FF9F]/10 text-[#36FF9F]"
                        : "border-[#1877F2]/25 bg-[#1877F2]/12 text-[#9FC9FF]"
                    }`}
                  >
                    <Icon
                      name={connected ? "check" : "meta"}
                      className="h-4 w-4"
                    />
                    {connected ? "Meta connected" : "Meta connection required"}
                  </div>

                  <h2 className="text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
                    Connect Artipilot
                    <br />
                    with Meta
                  </h2>

                  <p className="mt-4 max-w-xl text-sm leading-6 text-[#A8B3C7] sm:text-base">
                    Connect your Meta account through the official Meta
                    authorization flow to enable WhatsApp Business automation
                    inside Artipilot.
                  </p>

                  <ConnectionVisual />

                  <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-[#05070D] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1877F2]/15 text-[#9FC9FF]">
                        <Icon name="lock" />
                      </div>

                      <div>
                        <p className="font-black">Secure Meta connection</p>
                        <p className="mt-1 text-sm leading-6 text-[#8E99AD]">
                          Artipilot uses Meta&apos;s official connection flow to
                          request access for your selected WhatsApp Business
                          account.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {connected ? (
                      <Link
                        href="/dashboard/inbox"
                        className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#1877F2] to-[#4EA2FF] px-7 py-4 text-base font-black text-white shadow-[0_0_35px_rgba(24,119,242,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_0_48px_rgba(24,119,242,0.34)] active:translate-y-0 active:scale-[0.98]"
                      >
                        <Icon name="inbox" />
                        Open WhatsApp Inbox
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={startMetaConnection}
                        disabled={metaConnecting || !facebookReady}
                        className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#1877F2] to-[#4EA2FF] px-7 py-4 text-base font-black text-white shadow-[0_0_35px_rgba(24,119,242,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_0_48px_rgba(24,119,242,0.34)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {metaConnecting || !facebookReady ? (
                          <Icon name="refresh" className="animate-spin" />
                        ) : (
                          <Icon name="meta" />
                        )}

                        {metaConnecting
                          ? "Connecting..."
                          : facebookReady
                            ? "Continue with Meta"
                            : "Loading Meta..."}

                        {!metaConnecting && facebookReady ? (
                          <Icon name="arrow" />
                        ) : null}
                      </button>
                    )}

                    <Link
                      href="/dashboard/ai-training"
                      className="inline-flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-7 py-4 text-base font-black text-white transition hover:bg-white/[0.07] active:scale-[0.98]"
                    >
                      <Icon name="brain" />
                      AI Training
                    </Link>
                  </div>

                  {notice ? (
                    <div className="mt-5 rounded-[1.4rem] border border-[#1877F2]/25 bg-[#1877F2]/10 p-4 text-sm leading-6 text-[#CDE4FF]">
                      {notice}
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="rounded-[2rem] border border-white/10 bg-[#0B101A] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#7AB3FF]">
                  Steps
                </p>

                <h3 className="mt-2 text-2xl font-black">How it works</h3>

                <div className="mt-6 space-y-3">
                  {[
                    ["1", "Login with Meta"],
                    ["2", "Choose your WhatsApp Business account"],
                    ["3", "Allow the connection"],
                    ["4", "Return to Artipilot"],
                  ].map(([number, text]) => (
                    <div
                      key={number}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#05070D] p-4"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                          connected
                            ? "bg-[#36FF9F]/10 text-[#36FF9F]"
                            : "bg-[#1877F2]/15 text-[#9FC9FF]"
                        }`}
                      >
                        {connected ? (
                          <Icon name="check" className="h-4 w-4" />
                        ) : (
                          number
                        )}
                      </div>

                      <p className="text-sm font-black text-[#D8DEEA]">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-black text-white">Workspace</p>
                  <p className="mt-1 text-sm text-[#8E99AD]">
                    {workspace?.business_name || "Your business"}
                  </p>
                </div>

                <div className="mt-3 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-black text-white">Status</p>
                  <p
                    className={`mt-1 text-sm font-bold ${
                      connected ? "text-[#36FF9F]" : "text-[#FFD166]"
                    }`}
                  >
                    {connected
                      ? connection?.display_phone_number || "Connected"
                      : "Not connected yet"}
                  </p>
                </div>

                <div className="mt-3 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-black text-white">Meta SDK</p>
                  <p
                    className={`mt-1 text-sm font-bold ${
                      facebookReady ? "text-[#36FF9F]" : "text-[#FFD166]"
                    }`}
                  >
                    {facebookReady ? "Ready" : "Loading"}
                  </p>
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
            ["Settings", "/dashboard/settings", "settings"],
          ].map(([label, href, icon]) => (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-black ${
                label === "WhatsApp"
                  ? "bg-[#1877F2]/15 text-[#7AB3FF]"
                  : "text-[#8E99AD]"
              }`}
            >
              <Icon name={icon as IconName} className="h-5 w-5" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <style jsx>{`
        .connection-wave {
          animation: connectionPulse 1.6s ease-in-out infinite;
        }

        .connection-dot {
          animation: connectionMove 2.2s ease-in-out infinite;
        }

        @keyframes connectionPulse {
          0%,
          100% {
            opacity: 0.55;
            filter: blur(0px);
          }

          50% {
            opacity: 1;
            filter: blur(1px);
          }
        }

        @keyframes connectionMove {
          0% {
            left: 6%;
            opacity: 0;
          }

          15% {
            opacity: 1;
          }

          50% {
            opacity: 1;
          }

          85% {
            opacity: 1;
          }

          100% {
            left: 92%;
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}