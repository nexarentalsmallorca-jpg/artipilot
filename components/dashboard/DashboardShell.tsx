"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const NAV = [
  { href: "/dashboard/inbox", label: "Inbox", shortLabel: "Inbox" },
  { href: "/dashboard/training", label: "AI Training", shortLabel: "Training" },
  {
    href: "/dashboard/quick-replies",
    label: "Quick Replies",
    shortLabel: "Replies",
  },
  { href: "/dashboard/settings", label: "Settings", shortLabel: "Settings" },
  { href: "/dashboard/status", label: "System Status", shortLabel: "Status" },
];

const PUSH_SW_URL = "/artipilot-push-sw.js";
const PUSH_SW_SCOPE = "/";
const PUSH_SUBSCRIPTION_API = "/api/private/push-subscription";

type PushStatus =
  | "checking"
  | "unsupported"
  | "missing_key"
  | "denied"
  | "ready"
  | "enabled"
  | "saving"
  | "error";

type PushApiResponse = {
  ok?: boolean;
  error?: string;
  subscription?: unknown;
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageTitle(pathname: string) {
  const activeItem = NAV.find((item) => isActivePath(pathname, item.href));
  return activeItem?.label || "Artipilot Private";
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function getPushErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.trim()
  ) {
    return payload.error;
  }

  return fallback;
}

async function parseJsonSafely(response: Response): Promise<PushApiResponse> {
  try {
    return (await response.json()) as PushApiResponse;
  } catch {
    return {};
  }
}

function NotificationButton({
  hideWhenEnabled = false,
}: {
  hideWhenEnabled?: boolean;
}) {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [message, setMessage] = useState<string>("Checking notifications...");
  const [busy, setBusy] = useState(false);

  const vapidPublicKey = useMemo(
    () => cleanString(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    []
  );

  async function getRegistration() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported on this device.");
    }

    let registration = await navigator.serviceWorker.getRegistration(
      PUSH_SW_SCOPE
    );

    if (!registration || !registration.active) {
      registration = await navigator.serviceWorker.register(PUSH_SW_URL, {
        scope: PUSH_SW_SCOPE,
        updateViaCache: "none",
      });
    } else {
      try {
        await registration.update();
      } catch (error) {
        console.warn("[ARTIPILOT_PUSH_SW_UPDATE_FAILED]", error);
      }
    }

    await navigator.serviceWorker.ready;

    return registration;
  }

  async function saveSubscription(subscription: PushSubscription) {
    const response = await fetch(PUSH_SUBSCRIPTION_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        ...subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });

    const payload = await parseJsonSafely(response);

    if (!response.ok || payload.ok === false) {
      throw new Error(
        getPushErrorMessage(payload, "Could not save notification subscription.")
      );
    }

    return payload;
  }

  async function checkServerSubscriptionStatus() {
    const response = await fetch(PUSH_SUBSCRIPTION_API, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await parseJsonSafely(response);

    if (!response.ok || payload.ok === false) {
      throw new Error(
        getPushErrorMessage(payload, "Could not check saved subscriptions.")
      );
    }

    return payload;
  }

  async function checkNotificationStatus() {
    if (typeof window === "undefined") {
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      setMessage("Notifications are not supported on this device/browser.");
      return;
    }

    if (!("PushManager" in window)) {
      setStatus("unsupported");
      setMessage("Push notifications are not supported on this browser.");
      return;
    }

    if (!vapidPublicKey) {
      setStatus("missing_key");
      setMessage("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel.");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      setMessage("Notifications are blocked in this browser.");
      return;
    }

    if (Notification.permission !== "granted") {
      setStatus("ready");
      setMessage("Enable phone notifications for new WhatsApp messages.");
      return;
    }

    try {
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setStatus("ready");
        setMessage("Enable phone notifications for new WhatsApp messages.");
        return;
      }

      await saveSubscription(subscription);
      await checkServerSubscriptionStatus();

      setStatus("enabled");
      setMessage("Notifications are enabled and saved.");
    } catch (error) {
      console.error("[ARTIPILOT_PUSH_STATUS_CHECK_FAILED]", error);
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not check notification status."
      );
    }
  }

  async function enableNotifications() {
    if (busy) {
      return;
    }

    setBusy(true);
    setStatus("saving");
    setMessage("Enabling notifications...");

    try {
      if (!("Notification" in window)) {
        throw new Error("Notifications are not supported on this browser.");
      }

      if (!("serviceWorker" in navigator)) {
        throw new Error("Service workers are not supported on this device.");
      }

      if (!("PushManager" in window)) {
        throw new Error("Push notifications are not supported on this browser.");
      }

      if (!vapidPublicKey) {
        throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel.");
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "ready");
        setMessage(
          permission === "denied"
            ? "Notifications are blocked in this browser."
            : "Notification permission was not granted."
        );
        return;
      }

      const registration = await getRegistration();

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      await saveSubscription(subscription);
      await checkServerSubscriptionStatus();

      setStatus("enabled");
      setMessage("Notifications are enabled and saved.");
    } catch (error) {
      console.error("[ARTIPILOT_PUSH_ENABLE_FAILED]", error);
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not enable notifications."
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetNotifications() {
    if (busy) {
      return;
    }

    setBusy(true);
    setStatus("saving");
    setMessage("Resetting notifications...");

    try {
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        try {
          await fetch(PUSH_SUBSCRIPTION_API, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              endpoint: subscription.endpoint,
            }),
          });
        } catch (error) {
          console.warn("[ARTIPILOT_PUSH_DELETE_REMOTE_FAILED]", error);
        }

        await subscription.unsubscribe();
      }

      setStatus("ready");
      setMessage(
        "Notifications were reset. Enable again to create a fresh subscription."
      );
    } catch (error) {
      console.error("[ARTIPILOT_PUSH_RESET_FAILED]", error);
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not reset notifications."
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void checkNotificationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEnabled = status === "enabled";
  const isDisabled =
    busy ||
    status === "unsupported" ||
    status === "missing_key" ||
    status === "denied" ||
    status === "checking";

  if (hideWhenEnabled && isEnabled) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#e9edef] bg-[#f7f8f8] p-3">
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base",
            isEnabled
              ? "bg-[#d9fdd3] text-[#008069]"
              : "bg-white text-[#54656f]",
          ].join(" ")}
        >
          🔔
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-[#111b21]">
            Browser notifications
          </p>

          <p className="mt-1 text-[11px] leading-5 text-[#667781]">
            {message}
          </p>

          <button
            type="button"
            disabled={isDisabled || isEnabled}
            onClick={() => void enableNotifications()}
            className={[
              "mt-2 w-full rounded-xl px-3 py-2 text-xs font-black transition active:scale-[0.98]",
              isEnabled
                ? "bg-[#d9fdd3] text-[#008069]"
                : "bg-[#00a884] text-white hover:bg-[#008f72]",
              isDisabled && !isEnabled
                ? "cursor-not-allowed opacity-50"
                : "",
            ].join(" ")}
          >
            {status === "checking"
              ? "Checking..."
              : status === "saving"
                ? "Working..."
                : isEnabled
                  ? "Enabled"
                  : "Enable"}
          </button>

          {(isEnabled || status === "error") && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void resetNotifications()}
              className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-xs font-black text-[#54656f] transition hover:bg-[#eef0f1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset notifications
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="flex h-[100svh] max-h-[100svh] overflow-hidden bg-[#f0f2f5] text-[#111b21]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#d1d7db] bg-white md:flex">
        <div className="border-b border-[#e9edef] bg-[#f0f2f5] px-5 py-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9fdd3] text-base font-black text-[#008069]">
              A
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight text-[#111b21]">
                Artipilot Private
              </p>
              <p className="truncate text-xs font-medium text-[#667781]">
                NEXA WhatsApp AI
              </p>
            </div>
          </div>

          <span className="inline-flex rounded-full bg-[#d9fdd3] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#008069]">
            Private system
          </span>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-xl px-3 py-3 text-sm font-bold transition",
                  active
                    ? "bg-[#e7fce3] text-[#008069]"
                    : "text-[#54656f] hover:bg-[#f5f6f6] hover:text-[#111b21]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-[#e9edef] p-3">
          <NotificationButton />

          <Link
            href="/logout"
            prefetch={false}
            className="block rounded-xl px-3 py-3 text-sm font-bold text-[#667781] transition hover:bg-red-50 hover:text-red-600"
          >
            Log out
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-[#d1d7db] bg-[#f0f2f5] px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9fdd3] text-sm font-black text-[#008069]">
              A
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#111b21]">
                {pageTitle}
              </p>
              <p className="truncate text-[11px] font-medium text-[#667781]">
                Artipilot Private
              </p>
            </div>
          </div>

          <Link
            href="/logout"
            prefetch={false}
            className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#667781] shadow-sm transition hover:bg-red-50 hover:text-red-600"
          >
            Log out
          </Link>
        </header>

        <div className="shrink-0 border-b border-[#d1d7db] bg-white px-3 py-2 md:hidden">
          <NotificationButton hideWhenEnabled />
        </div>

        <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#d1d7db] bg-white px-2 py-2 md:hidden">
          {NAV.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "shrink-0 rounded-full px-3 py-2 text-xs font-black transition",
                  active
                    ? "bg-[#e7fce3] text-[#008069]"
                    : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef] hover:text-[#111b21]",
                ].join(" ")}
              >
                {item.shortLabel}
              </Link>
            );
          })}
        </nav>

        <main className="min-h-0 flex-1 overflow-hidden bg-[#f0f2f5]">
          {children}
        </main>
      </div>
    </div>
  );
}