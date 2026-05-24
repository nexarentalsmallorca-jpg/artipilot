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
};

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

  const contactId = contact?.id || contact?.phone || null;
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastMessageId = lastMessage?.id || null;

  const shouldShowFullLoading = loading && messages.length === 0;

  const groupedMessages = useMemo(() => {
    let lastDateLabel = "";

    return messages.map((message) => {
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
  }, [messages]);

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
      <div className="flex h-full flex-1 items-center justify-center bg-[#0b141a] px-6 text-center text-[#8696a0]">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#00a884]/10 text-2xl font-black text-[#00a884]">
            A
          </div>

          <h2 className="text-xl font-black text-white">
            Select a conversation
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#8696a0]">
            Choose a WhatsApp chat from the left side to view messages, send a
            manual reply, or control AI automatic replies.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-[#0b141a]">
      <header className="hidden items-center justify-between border-b border-white/10 bg-[#202c33] px-4 py-3 md:flex">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884]/15 text-base font-black text-[#00a884]">
            {getInitial(contact)}
            <span
              className={[
                "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#202c33]",
                contact.ai_enabled ? "bg-[#00a884]" : "bg-[#8696a0]",
              ].join(" ")}
            />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-white">
              {displayName(contact)}
            </h2>
            <p className="truncate text-xs text-[#8696a0]">{contact.phone}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleAi}
          className={[
            "rounded-full px-4 py-2 text-xs font-black transition active:scale-[0.98]",
            contact.ai_enabled
              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
              : "bg-white/10 text-[#8696a0] hover:bg-white/15 hover:text-white",
          ].join(" ")}
          title={
            contact.ai_enabled
              ? "AI auto-replies are active for this contact"
              : "AI auto-replies are off for this contact"
          }
        >
          AI {contact.ai_enabled ? "ON" : "OFF"}
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        {loading && messages.length > 0 ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-[#202c33]/95 px-3 py-1 text-[11px] font-bold text-[#8696a0] shadow-lg">
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
            className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#00a884] px-4 py-2 text-xs font-black text-[#001f19] shadow-lg transition hover:bg-[#21c79b] active:scale-[0.98]"
          >
            New messages ↓
          </button>
        ) : null}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto bg-[#0b141a] bg-[radial-gradient(circle_at_top_left,rgba(0,168,132,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_35%)] px-3 py-4 md:px-5"
        >
          {shouldShowFullLoading ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00a884]" />
                <p className="text-sm text-[#8696a0]">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div className="max-w-sm rounded-3xl border border-white/10 bg-[#202c33]/70 p-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#00a884]/10 text-xl">
                  💬
                </div>

                <h3 className="text-base font-black text-white">
                  No messages yet
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#8696a0]">
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

                return (
                  <div key={message.id}>
                    {showDateLabel ? (
                      <div className="my-4 flex justify-center">
                        <span className="rounded-full bg-[#202c33]/90 px-3 py-1 text-[11px] font-bold text-[#8696a0] shadow">
                          {dateLabel}
                        </span>
                      </div>
                    ) : null}

                    <div
                      className={[
                        "flex w-full",
                        outbound ? "justify-end" : "justify-start",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm md:max-w-[72%]",
                          outbound
                            ? "rounded-tr-md bg-[#005c4b] text-white"
                            : "rounded-tl-md bg-[#202c33] text-[#e9edef]",
                          message.sender_type === "system"
                            ? "mx-auto rounded-2xl bg-white/10 text-center text-[#8696a0]"
                            : "",
                        ].join(" ")}
                      >
                        {senderLabel ? (
                          <span
                            className={[
                              "mb-1 block text-[10px] font-black uppercase tracking-wide",
                              message.sender_type === "ai"
                                ? "text-emerald-300"
                                : message.sender_type === "admin"
                                  ? "text-sky-300"
                                  : "text-[#8696a0]",
                            ].join(" ")}
                          >
                            {senderLabel}
                          </span>
                        ) : null}

                        <p className="whitespace-pre-wrap break-words leading-6">
                          {body || " "}
                        </p>

                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
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