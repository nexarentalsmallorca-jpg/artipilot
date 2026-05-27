"use client";

import { useEffect, useMemo, useState } from "react";

type PushSubscriptionDebug = {
  id?: string;
  endpoint?: string;
  hasEndpoint?: boolean;
  hasP256dh?: boolean;
  hasAuth?: boolean;
  enabled?: boolean;
  userAgent?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Status = {
  hasPrivateSession: boolean;

  supabaseConfigured: boolean;

  whatsappTokenConfigured: boolean;
  whatsappPhoneNumberIdConfigured: boolean;
  whatsappVerifyTokenConfigured: boolean;

  openAiConfigured: boolean;

  vapidPublicKeyConfigured: boolean;
  vapidPrivateKeyConfigured: boolean;
  vapidSubjectConfigured: boolean;

  totalPushSubscriptions: number;
  enabledPushSubscriptions?: number;
  validPushSubscriptions?: number;
  pushSubscriptions?: PushSubscriptionDebug[];

  totalContacts: number;
  totalMessages: number;

  canReceiveMessages: boolean;
  canSendMessages: boolean;
  canAutoReply: boolean;
  canSendPushNotifications: boolean;
};

type StatusRow = {
  label: string;
  value: string;
  ok: boolean;
  description: string;
};

function statusText(ok: boolean) {
  return ok ? "OK" : "Missing";
}

function readyText(ok: boolean) {
  return ok ? "Ready" : "Not ready";
}

function statusClass(ok: boolean) {
  return ok
    ? "bg-[#e7fce3] text-[#008069] border-[#c8f7c0]"
    : "bg-red-50 text-red-700 border-red-200";
}

function warningClass(ok: boolean) {
  return ok
    ? "bg-[#e7fce3] text-[#008069] border-[#c8f7c0]"
    : "bg-yellow-50 text-yellow-800 border-yellow-300";
}

function cleanNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingPush, setTestingPush] = useState(false);

  async function loadStatus() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/private/status", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load status.");
      }

      setStatus(data);
    } catch (error) {
      console.error("[ARTIPILOT_STATUS_PAGE_ERROR]", error);
      setError(
        error instanceof Error ? error.message : "Failed to load status."
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendTestPush() {
    setTestingPush(true);
    setTestResult(null);
    setError(null);

    try {
      const response = await fetch("/api/private/push-test", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || "Failed to send test notification.");
      }

      setTestResult(
        `Test sent. Sent: ${cleanNumber(data.sent)}, Failed: ${cleanNumber(
          data.failed
        )}, Skipped: ${cleanNumber(data.skipped)}`
      );

      await loadStatus();
    } catch (error) {
      console.error("[ARTIPILOT_PUSH_TEST_PAGE_ERROR]", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send test notification."
      );
    } finally {
      setTestingPush(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  const pushTotal = cleanNumber(status?.totalPushSubscriptions);
  const pushEnabled = cleanNumber(
    status?.enabledPushSubscriptions,
    pushTotal
  );
  const pushValid = cleanNumber(status?.validPushSubscriptions, pushTotal);

  const rows = useMemo<StatusRow[]>(() => {
    if (!status) {
      return [];
    }

    return [
      {
        label: "Private session",
        value: status.hasPrivateSession ? "Active" : "Missing",
        ok: status.hasPrivateSession,
        description: "Confirms that your private dashboard login cookie works.",
      },
      {
        label: "Supabase",
        value: statusText(status.supabaseConfigured),
        ok: status.supabaseConfigured,
        description:
          "Needed to save contacts, messages, AI status, quick replies, and notification subscriptions.",
      },
      {
        label: "WhatsApp verify token",
        value: statusText(status.whatsappVerifyTokenConfigured),
        ok: status.whatsappVerifyTokenConfigured,
        description:
          "Needed so Meta can verify and deliver incoming WhatsApp webhooks.",
      },
      {
        label: "WhatsApp access token",
        value: statusText(status.whatsappTokenConfigured),
        ok: status.whatsappTokenConfigured,
        description:
          "Needed to send manual WhatsApp replies and Nero AI auto-replies.",
      },
      {
        label: "WhatsApp phone number ID",
        value: statusText(status.whatsappPhoneNumberIdConfigured),
        ok: status.whatsappPhoneNumberIdConfigured,
        description:
          "Needed so Meta knows which WhatsApp Business number sends messages.",
      },
      {
        label: "OpenAI",
        value: statusText(status.openAiConfigured),
        ok: status.openAiConfigured,
        description: "Needed for Nero AI suggestions and automatic replies.",
      },
      {
        label: "VAPID public key",
        value: statusText(status.vapidPublicKeyConfigured),
        ok: status.vapidPublicKeyConfigured,
        description:
          "Needed in the browser to enable browser push notifications.",
      },
      {
        label: "VAPID private key",
        value: statusText(status.vapidPrivateKeyConfigured),
        ok: status.vapidPrivateKeyConfigured,
        description:
          "Needed on the server to send push notifications to your devices.",
      },
      {
        label: "VAPID subject",
        value: status.vapidSubjectConfigured ? "Set" : "Using default",
        ok: true,
        description:
          "Sender identity for push notifications. If missing, the app uses a default mailto value.",
      },
      {
        label: "Push subscriptions saved",
        value: String(pushTotal),
        ok: pushTotal > 0,
        description:
          "Total browser/device subscription rows saved in Supabase.",
      },
      {
        label: "Push subscriptions enabled",
        value: String(pushEnabled),
        ok: pushEnabled > 0,
        description:
          "Enabled subscription rows that the server will try to send notifications to.",
      },
      {
        label: "Push subscriptions valid",
        value: String(pushValid),
        ok: pushValid > 0,
        description:
          "Rows with endpoint, p256dh, and auth keys present. This must be above 0.",
      },
    ];
  }, [pushEnabled, pushTotal, pushValid, status]);

  const systemCards = useMemo<StatusRow[]>(() => {
    if (!status) {
      return [];
    }

    return [
      {
        label: "Receive WhatsApp messages",
        value: readyText(status.canReceiveMessages),
        ok: status.canReceiveMessages,
        description:
          "Incoming customer WhatsApp messages can reach your private inbox.",
      },
      {
        label: "Send WhatsApp messages",
        value: readyText(status.canSendMessages),
        ok: status.canSendMessages,
        description:
          "Manual replies, text messages, and media sends can be sent through Meta.",
      },
      {
        label: "Nero AI auto-reply",
        value: readyText(status.canAutoReply),
        ok: status.canAutoReply,
        description:
          "Nero can generate and send automatic WhatsApp replies to customers.",
      },
      {
        label: "Browser notifications",
        value: readyText(status.canSendPushNotifications),
        ok: status.canSendPushNotifications,
        description:
          "New inbound WhatsApp messages can trigger browser push notifications.",
      },
    ];
  }, [status]);

  const allCoreOk =
    Boolean(status?.hasPrivateSession) &&
    Boolean(status?.supabaseConfigured) &&
    Boolean(status?.whatsappVerifyTokenConfigured) &&
    Boolean(status?.whatsappTokenConfigured) &&
    Boolean(status?.whatsappPhoneNumberIdConfigured) &&
    Boolean(status?.openAiConfigured);

  const pushReady =
    Boolean(status?.vapidPublicKeyConfigured) &&
    Boolean(status?.vapidPrivateKeyConfigured) &&
    pushEnabled > 0 &&
    pushValid > 0;

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] px-4 py-6 text-[#111b21] md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#008069]">
              Private system
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111b21]">
              System Status
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667781]">
              Check if your private WhatsApp AI system is connected correctly.
              Nero auto-reply needs Supabase, WhatsApp, and OpenAI. Browser
              notifications also need VAPID keys and at least one valid enabled
              subscription.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void sendTestPush()}
              disabled={loading || testingPush || !pushReady}
              className="rounded-full bg-[#111b21] px-5 py-3 text-sm font-black text-white transition hover:bg-[#263238] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testingPush ? "Sending test..." : "Send test push"}
            </button>

            <button
              type="button"
              onClick={() => void loadStatus()}
              disabled={loading}
              className="rounded-full bg-[#00a884] px-5 py-3 text-sm font-black text-white transition hover:bg-[#008f72] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Checking..." : "Refresh"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {testResult ? (
          <div className="mb-5 rounded-3xl border border-[#c8f7c0] bg-[#e7fce3] p-5 text-sm leading-6 text-[#008069] shadow-sm">
            {testResult}
          </div>
        ) : null}

        {loading && !status ? (
          <div className="rounded-3xl border border-[#d1d7db] bg-white p-6 text-sm text-[#667781] shadow-sm">
            Checking your private WhatsApp AI setup...
          </div>
        ) : null}

        {status ? (
          <>
            <div
              className={[
                "mb-5 rounded-3xl border p-5 shadow-sm",
                allCoreOk
                  ? "border-[#c8f7c0] bg-[#e7fce3]"
                  : "border-yellow-300 bg-yellow-50",
              ].join(" ")}
            >
              <p
                className={[
                  "text-sm font-black",
                  allCoreOk ? "text-[#008069]" : "text-yellow-800",
                ].join(" ")}
              >
                {allCoreOk
                  ? "Everything important for Nero looks connected."
                  : "Some important settings are missing."}
              </p>

              <p className="mt-2 text-sm leading-6 text-[#54656f]">
                For push notifications, the key numbers are enabled and valid
                subscriptions. If the button says enabled but this page shows 0
                valid subscriptions, the browser subscription is not being saved
                correctly.
              </p>
            </div>

            <div
              className={[
                "mb-5 rounded-3xl border p-5 shadow-sm",
                pushReady
                  ? "border-[#c8f7c0] bg-[#e7fce3]"
                  : "border-yellow-300 bg-yellow-50",
              ].join(" ")}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p
                    className={[
                      "text-sm font-black",
                      pushReady ? "text-[#008069]" : "text-yellow-800",
                    ].join(" ")}
                  >
                    {pushReady
                      ? "Push notifications look ready."
                      : "Push notifications are not fully ready yet."}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#54656f]">
                    Required: VAPID public key, VAPID private key, at least 1
                    enabled subscription, and at least 1 valid subscription.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-[#667781]">
                      Total
                    </p>
                    <p className="mt-1 text-2xl font-black">{pushTotal}</p>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-[#667781]">
                      Enabled
                    </p>
                    <p className="mt-1 text-2xl font-black">{pushEnabled}</p>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-[#667781]">
                      Valid
                    </p>
                    <p className="mt-1 text-2xl font-black">{pushValid}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {systemCards.map((row) => (
                <div
                  key={row.label}
                  className="rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h2 className="text-sm font-black text-[#111b21]">
                      {row.label}
                    </h2>

                    <span
                      className={[
                        "shrink-0 rounded-full border px-3 py-1 text-[11px] font-black",
                        statusClass(row.ok),
                      ].join(" ")}
                    >
                      {row.value}
                    </span>
                  </div>

                  <p className="text-xs leading-5 text-[#667781]">
                    {row.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-3">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-black text-[#111b21]">
                        {row.label}
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-[#667781]">
                        {row.description}
                      </p>
                    </div>

                    <span
                      className={[
                        "shrink-0 rounded-full border px-3 py-1 text-xs font-black",
                        row.label.includes("Push")
                          ? warningClass(row.ok)
                          : statusClass(row.ok),
                      ].join(" ")}
                    >
                      {row.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {status.pushSubscriptions?.length ? (
              <div className="mt-5 rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-base font-black text-[#111b21]">
                    Saved notification subscriptions
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-[#667781]">
                    These are masked for safety. Each active device should have
                    endpoint, p256dh, and auth.
                  </p>
                </div>

                <div className="grid gap-3">
                  {status.pushSubscriptions.map((subscription, index) => {
                    const valid =
                      Boolean(subscription.hasEndpoint) &&
                      Boolean(subscription.hasP256dh) &&
                      Boolean(subscription.hasAuth) &&
                      subscription.enabled !== false;

                    return (
                      <div
                        key={subscription.id || String(index)}
                        className="rounded-2xl border border-[#e9edef] bg-[#f7f8f8] p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-[#111b21]">
                              {subscription.endpoint || "No endpoint"}
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-[#667781]">
                              {subscription.userAgent || "Unknown browser"}
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-[#667781]">
                              Updated: {formatDate(subscription.updatedAt)}
                            </p>
                          </div>

                          <span
                            className={[
                              "w-fit shrink-0 rounded-full border px-3 py-1 text-[11px] font-black",
                              statusClass(valid),
                            ].join(" ")}
                          >
                            {valid ? "Valid" : "Problem"}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 text-[11px] font-bold text-[#54656f] sm:grid-cols-4">
                          <span>Enabled: {subscription.enabled ? "yes" : "no"}</span>
                          <span>
                            Endpoint: {subscription.hasEndpoint ? "yes" : "no"}
                          </span>
                          <span>P256DH: {subscription.hasP256dh ? "yes" : "no"}</span>
                          <span>Auth: {subscription.hasAuth ? "yes" : "no"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#667781]">
                  Total contacts
                </p>

                <p className="mt-2 text-3xl font-black text-[#111b21]">
                  {status.totalContacts}
                </p>
              </div>

              <div className="rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#667781]">
                  Total messages
                </p>

                <p className="mt-2 text-3xl font-black text-[#111b21]">
                  {status.totalMessages}
                </p>
              </div>

              <div className="rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#667781]">
                  Notification devices
                </p>

                <p className="mt-2 text-3xl font-black text-[#111b21]">
                  {pushEnabled}/{pushTotal}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}