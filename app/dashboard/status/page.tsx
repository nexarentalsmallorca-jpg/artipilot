"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.error("Status page error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load status."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

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
          "Needed in the browser to enable phone/browser push notifications.",
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
        value: status.vapidSubjectConfigured ? "Set" : "Optional",
        ok: true,
        description:
          "Sender identity for push notifications. If missing, the app uses a default mailto value.",
      },
      {
        label: "Push subscriptions",
        value: String(status.totalPushSubscriptions),
        ok: status.totalPushSubscriptions > 0,
        description:
          "Number of devices/browsers that have enabled Artipilot phone notifications.",
      },
    ];
  }, [status]);

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
        label: "Phone notifications",
        value: readyText(status.canSendPushNotifications),
        ok: status.canSendPushNotifications,
        description:
          "New inbound WhatsApp messages can trigger browser/phone push notifications.",
      },
    ];
  }, [status]);

  const allCoreOk =
    status?.hasPrivateSession &&
    status?.supabaseConfigured &&
    status?.whatsappVerifyTokenConfigured &&
    status?.whatsappTokenConfigured &&
    status?.whatsappPhoneNumberIdConfigured &&
    status?.openAiConfigured;

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
              Nero auto-reply needs Supabase, WhatsApp, and OpenAI. Phone
              notifications also need VAPID keys and at least one enabled
              device.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loading}
            className="rounded-full bg-[#00a884] px-5 py-3 text-sm font-black text-white transition hover:bg-[#008f72] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Checking..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700 shadow-sm">
            {error}
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
                If something is missing, check your Vercel environment variables
                and redeploy the project. For AI auto-reply and notifications,
                check Vercel logs for [NERO_WEBHOOK], [NERO_WEBHOOK_ERROR], and
                [ARTIPILOT_PUSH_SEND_FAILED].
              </p>
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
                        statusClass(row.ok),
                      ].join(" ")}
                    >
                      {row.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

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
                  {status.totalPushSubscriptions}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}