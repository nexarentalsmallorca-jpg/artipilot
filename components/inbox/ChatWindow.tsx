"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Contact } from "./ChatList";

export type Message = {
  id: string;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "admin" | "ai" | "system";
  body: string | null;
  status: string | null;
  created_at: string;
  message_type?: string | null;
  media_id?: string | null;
  media_url?: string | null;
  english_translation?: string | null;
  detected_language?: string | null;
  translation_status?: string | null;
};

type ActionState = {
  blocked?: boolean | null;
  needs_human_attention?: boolean | null;
  human_attention_reason?: string | null;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function displayName(contact: Contact) {
  return contact.name || contact.profile_name || contact.phone || "Unknown";
}

function getInitial(contact: Contact) {
  return displayName(contact).slice(0, 1).toUpperCase();
}

function formatMessageTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHeaderDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return "Today";
  }

  if (isYesterday) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getSenderLabel(message: Message) {
  if (message.sender_type === "ai") {
    return "AI";
  }

  if (message.sender_type === "admin") {
    return "You";
  }

  if (message.sender_type === "system") {
    return "System";
  }

  return "";
}

function getStatusLabel(status: string | null) {
  if (!status) {
    return "";
  }

  const cleanStatus = status.toLowerCase();

  if (cleanStatus === "pending") {
    return "Sending";
  }

  if (cleanStatus === "sent") {
    return "Sent";
  }

  if (cleanStatus === "delivered") {
    return "Delivered";
  }

  if (cleanStatus === "read") {
    return "Read";
  }

  if (cleanStatus === "received") {
    return "";
  }

  if (cleanStatus === "failed") {
    return "Failed";
  }

  return status;
}

function isNearBottom(element: HTMLDivElement | null) {
  if (!element) {
    return true;
  }

  const distanceFromBottom =
    element.scrollHeight - element.scrollTop - element.clientHeight;

  return distanceFromBottom < 180;
}

function normalizeMessageType(message: Message) {
  const type = String(message.message_type || "text").toLowerCase();

  if (
    type === "image" ||
    type === "video" ||
    type === "document" ||
    type === "audio" ||
    type === "sticker" ||
    type === "location" ||
    type === "contacts" ||
    type === "system" ||
    type === "text"
  ) {
    return type;
  }

  return "text";
}

function getFileNameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const lastPart = parsed.pathname.split("/").filter(Boolean).pop();

    return decodeURIComponent(lastPart || "File");
  } catch {
    return "File";
  }
}

function shouldShowEnglishTranslation(message: Message) {
  const translation = cleanString(message.english_translation);
  const body = cleanString(message.body);

  if (!translation) {
    return false;
  }

  if (!body) {
    return true;
  }

  return translation.toLowerCase() !== body.toLowerCase();
}

function getTranslationLabel(message: Message) {
  const language = cleanString(message.detected_language);

  if (!language || language.toLowerCase() === "unknown") {
    return "English translation";
  }

  if (language.toLowerCase() === "en" || language.toLowerCase() === "english") {
    return "English";
  }

  return `English translation · ${language.toUpperCase()}`;
}

function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    const isUrl = /^(https?:\/\/|www\.)/i.test(part);

    if (!isUrl) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    const href = part.startsWith("http") ? part : `https://${part}`;

    return (
      <a
        key={`${part}-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[#027eb5] underline decoration-[#027eb5]/40 underline-offset-2"
      >
        {part}
      </a>
    );
  });
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (data?.error) {
      return String(data.error);
    }
  } catch {
    // Ignore JSON parse error.
  }

  return fallback;
}

function TranslationBlock({ message }: { message: Message }) {
  if (!shouldShowEnglishTranslation(message)) {
    return null;
  }

  const translation = cleanString(message.english_translation);

  return (
    <div className="mt-2 rounded-xl border border-black/5 bg-black/[0.035] px-3 py-2">
      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#667781]">
        {getTranslationLabel(message)}
      </p>

      <p className="whitespace-pre-wrap break-words text-xs leading-5 text-[#3b4a54]">
        {linkifyText(translation)}
      </p>
    </div>
  );
}

function MediaContent({ message }: { message: Message }) {
  const type = normalizeMessageType(message);
  const mediaUrl = message.media_url || "";
  const body = message.body || "";

  if (!mediaUrl) {
    if (type !== "text" && type !== "system") {
      return (
        <div className="rounded-xl bg-black/5 px-3 py-2 text-sm text-[#667781]">
          {body || `${type} message`}
        </div>
      );
    }

    return null;
  }

  if (type === "image" || type === "sticker") {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-xl"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt={body || "WhatsApp image"}
          className="max-h-[360px] w-full max-w-[320px] rounded-xl object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (type === "video") {
    return (
      <video
        src={mediaUrl}
        controls
        className="max-h-[360px] w-full max-w-[340px] rounded-xl bg-black"
      />
    );
  }

  if (type === "audio") {
    return (
      <div className="rounded-xl bg-white/70 p-2">
        <audio src={mediaUrl} controls className="w-full max-w-[320px]" />
      </div>
    );
  }

  if (type === "document") {
    const fileName = body || getFileNameFromUrl(mediaUrl);

    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex max-w-[340px] items-center gap-3 rounded-xl bg-white/75 p-3 transition hover:bg-white"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f5] text-xl">
          📄
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-[#111b21]">
            {fileName}
          </span>
          <span className="mt-0.5 block text-xs text-[#667781]">Open file</span>
        </span>
      </a>
    );
  }

  return null;
}

export default function ChatWindow({
  contact,
  messages,
  loading,
  onToggleAi,
}: {
  contact: Contact | null;
  messages: Message[];
  loading: boolean;
  onToggleAi: () => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const previousContactIdRef = useRef<string | null>(null);
  const previousLastMessageIdRef = useRef<string | null>(null);

  const [userIsNearBottom, setUserIsNearBottom] = useState(true);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const [localState, setLocalState] = useState<ActionState>({});

  const contactId = contact?.id || contact?.phone || null;
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastMessageId = lastMessage?.id || null;

  const currentBlocked = Boolean(localState.blocked ?? contact?.blocked);
  const currentNeedsHuman = Boolean(
    localState.needs_human_attention ?? contact?.needs_human_attention
  );
  const currentHumanReason =
    localState.human_attention_reason ?? contact?.human_attention_reason ?? null;

  const visibleMessages = useMemo(
    () => messages.filter((message) => !hiddenMessageIds.has(message.id)),
    [messages, hiddenMessageIds]
  );

  const shouldShowFullLoading = loading && visibleMessages.length === 0;

  const groupedMessages = useMemo(() => {
    let lastDateLabel = "";

    return visibleMessages.map((message) => {
      const dateLabel = formatHeaderDate(message.created_at);
      const showDateLabel = Boolean(dateLabel && dateLabel !== lastDateLabel);

      if (showDateLabel) {
        lastDateLabel = dateLabel;
      }

      return {
        message,
        dateLabel,
        showDateLabel,
      };
    });
  }, [visibleMessages]);

  function refreshSoon() {
    window.dispatchEvent(new CustomEvent("artipilot:inbox-refresh"));
  }

  async function patchContact(payload: Record<string, unknown>) {
    if (!contact?.id) {
      return;
    }

    setBusyAction("contact");
    setActionError(null);

    try {
      const response = await fetch("/api/private/contacts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact_id: contact.id,
          ...payload,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Contact update failed."));
      }

      const data = await response.json();

      if (data?.contact) {
        setLocalState({
          blocked: data.contact.blocked,
          needs_human_attention: data.contact.needs_human_attention,
          human_attention_reason: data.contact.human_attention_reason,
        });
      }

      setChatMenuOpen(false);
      refreshSoon();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Contact update failed."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteSingleMessage(messageId: string) {
    const confirmed = window.confirm("Delete this message from your inbox?");

    if (!confirmed) {
      return;
    }

    setBusyAction(`message:${messageId}`);
    setActionError(null);

    try {
      const response = await fetch("/api/private/messages", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message_id: messageId,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Failed to delete message."));
      }

      setHiddenMessageIds((current) => {
        const next = new Set(current);
        next.add(messageId);
        return next;
      });

      setMessageMenuId(null);
      refreshSoon();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to delete message."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteWholeChat() {
    if (!contact?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete the full chat with ${displayName(contact)}? This removes the conversation from your private inbox.`
    );

    if (!confirmed) {
      return;
    }

    setBusyAction("delete-chat");
    setActionError(null);

    try {
      const response = await fetch("/api/private/chat", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact_id: contact.id,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Failed to delete chat."));
      }

      window.location.href = "/dashboard/inbox";
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to delete chat."
      );
      setBusyAction(null);
    }
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });
    });
  }

  function handleScroll() {
    const nearBottom = isNearBottom(scrollContainerRef.current);

    setUserIsNearBottom(nearBottom);

    if (nearBottom) {
      setShowNewMessagesButton(false);
    }
  }

  useEffect(() => {
    setLocalState({});
    setHiddenMessageIds(new Set());
    setActionError(null);
    setChatMenuOpen(false);
    setMessageMenuId(null);
  }, [contactId]);

  useEffect(() => {
    if (!contactId) {
      previousContactIdRef.current = null;
      previousLastMessageIdRef.current = null;
      setShowNewMessagesButton(false);
      return;
    }

    const previousContactId = previousContactIdRef.current;
    const contactChanged = previousContactId !== contactId;

    if (contactChanged) {
      previousContactIdRef.current = contactId;
      previousLastMessageIdRef.current = lastMessageId;
      setShowNewMessagesButton(false);

      setTimeout(() => {
        scrollToBottom("auto");
      }, 50);

      return;
    }

    const previousLastMessageId = previousLastMessageIdRef.current;
    const hasNewMessage =
      Boolean(lastMessageId) && previousLastMessageId !== lastMessageId;

    if (!hasNewMessage) {
      return;
    }

    previousLastMessageIdRef.current = lastMessageId;

    const latestMessageIsMine =
      lastMessage?.direction === "outbound" ||
      lastMessage?.sender_type === "admin" ||
      lastMessage?.sender_type === "ai";

    if (userIsNearBottom || latestMessageIsMine) {
      setShowNewMessagesButton(false);

      setTimeout(() => {
        scrollToBottom("smooth");
      }, 50);

      return;
    }

    setShowNewMessagesButton(true);
  }, [contactId, lastMessageId, lastMessage, userIsNearBottom]);

  if (!contact) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[#f0f2f5] px-6 text-center text-[#667781]">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#00a884]/10 text-2xl font-black text-[#00a884]">
            A
          </div>

          <h2 className="text-xl font-bold text-[#111b21]">
            Select a conversation
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#667781]">
            Choose a WhatsApp chat from the left side to view messages, send a
            manual reply, or control AI automatic replies.
          </p>
        </div>
      </div>
    );
  }

  const chatMenu = (
    <div className="absolute right-0 top-11 z-40 w-64 overflow-hidden rounded-2xl border border-[#d1d7db] bg-white text-sm shadow-2xl">
      <button
        type="button"
        disabled={busyAction === "contact"}
        onClick={() =>
          patchContact({
            needs_human_attention: true,
            human_attention_reason:
              "Marked manually for human attention from the inbox.",
          })
        }
        className="block w-full px-4 py-3 text-left font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        Mark needs human attention
      </button>

      <button
        type="button"
        disabled={busyAction === "contact"}
        onClick={() =>
          patchContact({
            needs_human_attention: false,
          })
        }
        className="block w-full px-4 py-3 text-left font-bold text-[#54656f] transition hover:bg-[#f5f6f6] disabled:opacity-50"
      >
        Clear human attention
      </button>

      <button
        type="button"
        disabled={busyAction === "contact"}
        onClick={() =>
          patchContact({
            blocked: !currentBlocked,
          })
        }
        className="block w-full px-4 py-3 text-left font-bold text-[#54656f] transition hover:bg-[#f5f6f6] disabled:opacity-50"
      >
        {currentBlocked ? "Unblock customer" : "Block customer"}
      </button>

      <button
        type="button"
        disabled={busyAction === "delete-chat"}
        onClick={() => void deleteWholeChat()}
        className="block w-full border-t border-[#e9edef] px-4 py-3 text-left font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        Delete whole chat
      </button>
    </div>
  );

  return (
    <div className="flex h-full flex-1 flex-col bg-[#efeae2]">
      <header className="flex shrink-0 items-center justify-between border-b border-[#d1d7db] bg-[#f0f2f5] px-3 py-2 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-sm font-bold text-[#54656f]">
            {getInitial(contact)}

            <span
              className={[
                "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#f0f2f5]",
                currentBlocked
                  ? "bg-red-500"
                  : contact.ai_enabled
                    ? "bg-[#00a884]"
                    : "bg-[#8696a0]",
              ].join(" ")}
            />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-[#111b21]">
              {displayName(contact)}
            </h2>

            <p className="truncate text-[11px] text-[#667781]">
              {currentBlocked
                ? "Blocked"
                : currentNeedsHuman
                  ? "Needs human attention"
                  : contact.phone}
            </p>
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleAi}
            disabled={currentBlocked}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              contact.ai_enabled && !currentBlocked
                ? "bg-[#d9fdd3] text-[#008069]"
                : "bg-[#e9edef] text-[#54656f]",
            ].join(" ")}
          >
            AI {contact.ai_enabled && !currentBlocked ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={() => setChatMenuOpen((open) => !open)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656f] transition hover:bg-[#e9edef]"
            title="Chat options"
            aria-label="Chat options"
          >
            ⋮
          </button>

          {chatMenuOpen ? chatMenu : null}
        </div>
      </header>

      <header className="hidden shrink-0 items-center justify-between border-b border-[#d1d7db] bg-[#f0f2f5] px-4 py-2.5 md:flex">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-base font-bold text-[#54656f]">
            {getInitial(contact)}

            <span
              className={[
                "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#f0f2f5]",
                currentBlocked
                  ? "bg-red-500"
                  : contact.ai_enabled
                    ? "bg-[#00a884]"
                    : "bg-[#8696a0]",
              ].join(" ")}
              title={
                currentBlocked
                  ? "Blocked"
                  : contact.ai_enabled
                    ? "AI On"
                    : "AI Off"
              }
            />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#111b21]">
              {displayName(contact)}
            </h2>

            <p className="truncate text-xs text-[#667781]">
              {currentBlocked
                ? "Blocked customer"
                : currentNeedsHuman
                  ? "Needs human attention"
                  : contact.phone}
            </p>
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleAi}
            disabled={currentBlocked}
            className={[
              "rounded-full px-4 py-2 text-xs font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              contact.ai_enabled && !currentBlocked
                ? "bg-[#d9fdd3] text-[#008069] hover:bg-[#c8f7c0]"
                : "bg-[#e9edef] text-[#54656f] hover:bg-[#dce1e3]",
            ].join(" ")}
            title={
              currentBlocked
                ? "Customer is blocked"
                : contact.ai_enabled
                  ? "AI auto-replies are active for this contact"
                  : "AI auto-replies are off for this contact"
            }
          >
            AI {contact.ai_enabled && !currentBlocked ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={() => setChatMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] transition hover:bg-[#e9edef]"
            title="Chat options"
            aria-label="Chat options"
          >
            ⋮
          </button>

          {chatMenuOpen ? chatMenu : null}
        </div>
      </header>

      {actionError ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700">
          {actionError}
        </div>
      ) : null}

      {currentNeedsHuman ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-xs leading-5 text-red-800">
          <span className="font-black">Needs human attention.</span>{" "}
          {currentHumanReason ||
            "This customer should be reviewed by the team manually."}
        </div>
      ) : null}

      {currentBlocked ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-xs leading-5 text-red-800">
          <span className="font-black">Blocked customer.</span> AI replies are
          off. Be careful before sending manual messages.
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {loading && visibleMessages.length > 0 ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-[#d1d7db] bg-white/95 px-3 py-1 text-[11px] font-bold text-[#667781] shadow-lg">
            Syncing...
          </div>
        ) : null}

        {showNewMessagesButton ? (
          <button
            type="button"
            onClick={() => {
              setShowNewMessagesButton(false);
              scrollToBottom("smooth");
            }}
            className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#00a884] px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-[#008f72] active:scale-[0.98]"
          >
            New messages ↓
          </button>
        ) : null}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto bg-[#efeae2] px-3 py-3 md:px-8 md:py-4"
        >
          {shouldShowFullLoading ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#d1d7db] border-t-[#00a884]" />
                <p className="text-sm text-[#667781]">Loading messages...</p>
              </div>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div className="max-w-sm rounded-3xl border border-[#d1d7db] bg-white/80 p-6 shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#d9fdd3] text-xl">
                  💬
                </div>

                <h3 className="text-base font-bold text-[#111b21]">
                  No messages yet
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#667781]">
                  When this contact sends a WhatsApp message, it will appear
                  here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pb-3">
              {groupedMessages.map(({ message, dateLabel, showDateLabel }) => {
                const outbound = message.direction === "outbound";
                const body = message.body || "";
                const senderLabel = getSenderLabel(message);
                const statusLabel = getStatusLabel(message.status);
                const timeLabel = formatMessageTime(message.created_at);
                const isSystem = message.sender_type === "system";
                const isFailed = message.status?.toLowerCase() === "failed";
                const hasMedia = Boolean(message.media_url);
                const type = normalizeMessageType(message);
                const messageBusy = busyAction === `message:${message.id}`;

                return (
                  <div key={message.id}>
                    {showDateLabel ? (
                      <div className="my-4 flex justify-center">
                        <span className="rounded-lg bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#667781] shadow-sm">
                          {dateLabel}
                        </span>
                      </div>
                    ) : null}

                    <div
                      className={[
                        "group flex w-full",
                        isSystem
                          ? "justify-center"
                          : outbound
                            ? "justify-end"
                            : "justify-start",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "relative max-w-[86%] px-3 py-2 text-sm shadow-sm md:max-w-[74%]",
                          isSystem
                            ? "rounded-xl bg-white/80 text-center text-[#667781]"
                            : outbound
                              ? "rounded-2xl rounded-tr-md bg-[#d9fdd3] text-[#111b21]"
                              : "rounded-2xl rounded-tl-md bg-white text-[#111b21]",
                          isFailed ? "border border-red-200 bg-red-50" : "",
                          hasMedia ? "min-w-[230px]" : "",
                        ].join(" ")}
                      >
                        {!isSystem ? (
                          <div className="absolute right-1 top-1">
                            <button
                              type="button"
                              onClick={() =>
                                setMessageMenuId((current) =>
                                  current === message.id ? null : message.id
                                )
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[#667781] opacity-0 transition hover:bg-black/5 group-hover:opacity-100"
                              title="Message options"
                              aria-label="Message options"
                            >
                              ⋮
                            </button>

                            {messageMenuId === message.id ? (
                              <div className="absolute right-0 top-7 z-30 w-40 overflow-hidden rounded-xl border border-[#d1d7db] bg-white text-xs shadow-xl">
                                <button
                                  type="button"
                                  disabled={messageBusy}
                                  onClick={() =>
                                    void deleteSingleMessage(message.id)
                                  }
                                  className="block w-full px-3 py-2 text-left font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  {messageBusy ? "Deleting..." : "Delete message"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {senderLabel ? (
                          <span
                            className={[
                              "mb-1 block pr-6 text-[10px] font-bold uppercase tracking-wide",
                              message.sender_type === "ai"
                                ? "text-[#008069]"
                                : message.sender_type === "admin"
                                  ? "text-[#0b72b9]"
                                  : "text-[#667781]",
                            ].join(" ")}
                          >
                            {senderLabel}
                          </span>
                        ) : null}

                        <MediaContent message={message} />

                        {body && !(hasMedia && type === "document") ? (
                          <p
                            className={[
                              "whitespace-pre-wrap break-words leading-6",
                              hasMedia ? "mt-2" : "",
                            ].join(" ")}
                          >
                            {linkifyText(body)}
                          </p>
                        ) : null}

                        {!body && !hasMedia ? (
                          <p className="whitespace-pre-wrap break-words leading-6">
                            {" "}
                          </p>
                        ) : null}

                        <TranslationBlock message={message} />

                        <div
                          className={[
                            "mt-1 flex items-center justify-end gap-1 text-[10px]",
                            isFailed ? "text-red-600" : "text-[#667781]",
                          ].join(" ")}
                        >
                          {timeLabel ? <span>{timeLabel}</span> : null}
                          {statusLabel ? <span>· {statusLabel}</span> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef} className="h-1" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}