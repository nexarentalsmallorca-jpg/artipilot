"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PushNotificationBoxProps = {
  isDark?: boolean;
  compact?: boolean;
};

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

function isBrowserSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export default function PushNotificationBox({
  isDark = false,
  compact = false,
}: PushNotificationBoxProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">(
    "unknown"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState("");

  const boxClass = isDark
    ? "border-[#1F2937] bg-[#0B111C] text-white"
    : "border-[#E2E8F0] bg-white text-[#0F172A]";

  const mutedClass = isDark ? "text-[#94A3B8]" : "text-[#64748B]";

  const buttonClass =
    "rounded-full bg-[#22C55E] px-4 py-2 text-xs font-black text-white transition hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:opacity-50";

  const secondaryButtonClass = isDark
    ? "rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-[#CBD5E1] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
    : "rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-xs font-black text-[#334155] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50";

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    if (!token) return {};

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!isBrowserSupported()) {
      setSupported(false);
      setPermission("unknown");
      setSubscribed(false);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");

      if (!registration) {
        setSubscribed(false);
        return;
      }

      const existingSubscription =
        await registration.pushManager.getSubscription();

      setSubscribed(Boolean(existingSubscription));
    } catch {
      setSubscribed(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function enableNotifications() {
    try {
      setLoading(true);
      setNotice("");

      if (!isBrowserSupported()) {
        setNotice(
          "This browser does not support web push notifications. On iPhone, open Artipilot from the Home Screen shortcut."
        );
        return;
      }

      if (!window.isSecureContext) {
        setNotice("Notifications only work on HTTPS domains, not insecure pages.");
        return;
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        setNotice(
          "Notifications were not allowed. Enable them from your browser/site settings."
        );
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        setNotice("NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const authHeaders = await getAuthHeaders();

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setNotice(data?.error || "Could not save notification subscription.");
        return;
      }

      setSubscribed(true);
      setNotice("Notifications enabled on this device.");
    } catch (error) {
      console.error("Enable notifications error:", error);
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not enable notifications on this device."
      );
    } finally {
      setLoading(false);
      void refreshStatus();
    }
  }

  async function sendTestNotification() {
    try {
      setTesting(true);
      setNotice("");

      const authHeaders = await getAuthHeaders();

      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setNotice(data?.error || "Could not send test notification.");
        return;
      }

      setNotice("Test notification sent. Check your phone/computer.");
    } catch (error) {
      console.error("Test notification error:", error);
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not send test notification."
      );
    } finally {
      setTesting(false);
    }
  }

  const statusText = !supported
    ? "Not supported on this browser"
    : permission === "granted" && subscribed
      ? "Enabled on this device"
      : permission === "denied"
        ? "Blocked in browser settings"
        : "Not enabled on this device";

  if (compact) {
    return (
      <div className={`rounded-2xl border p-3 ${boxClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-black">Notifications</p>
            <p className={`mt-0.5 truncate text-[11px] ${mutedClass}`}>
              {statusText}
            </p>
          </div>

          {subscribed ? (
            <button
              type="button"
              onClick={sendTestNotification}
              disabled={testing}
              className={secondaryButtonClass}
            >
              {testing ? "Testing..." : "Test"}
            </button>
          ) : (
            <button
              type="button"
              onClick={enableNotifications}
              disabled={loading}
              className={buttonClass}
            >
              {loading ? "Enabling..." : "Enable"}
            </button>
          )}
        </div>

        {notice ? (
          <p className={`mt-2 text-[11px] font-bold ${mutedClass}`}>{notice}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 ${boxClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black">Customer message notifications</p>
          <p className={`mt-1 text-xs leading-5 ${mutedClass}`}>
            Get normal phone/computer notifications only when a customer sends a
            WhatsApp message. AI replies and manual replies will not notify you.
          </p>
          <p className={`mt-2 text-xs font-black ${mutedClass}`}>
            Status: {statusText}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={enableNotifications}
            disabled={loading || (permission === "granted" && subscribed)}
            className={buttonClass}
          >
            {loading
              ? "Enabling..."
              : permission === "granted" && subscribed
                ? "Enabled"
                : "Enable"}
          </button>

          <button
            type="button"
            onClick={sendTestNotification}
            disabled={testing || !subscribed}
            className={secondaryButtonClass}
          >
            {testing ? "Testing..." : "Test"}
          </button>
        </div>
      </div>

      {notice ? (
        <p className={`mt-3 rounded-xl text-xs font-bold ${mutedClass}`}>
          {notice}
        </p>
      ) : null}
    </div>
  );
}