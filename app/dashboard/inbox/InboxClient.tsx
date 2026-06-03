"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatList, {
  type ChatFilter,
  type Contact,
} from "@/components/inbox/ChatList";
import ChatWindow, { type Message } from "@/components/inbox/ChatWindow";
import MessageComposer from "@/components/inbox/MessageComposer";
import {
  fetchContactsAction,
  fetchMessagesAction,
  fetchQuickRepliesAction,
  sendMessageAction,
  suggestAiAction,
  toggleAiAction,
} from "./actions";

type QuickReply = {
  id: string;
  title: string;
  content: string;
};

function getContactKey(contact: Contact | null | undefined) {
  return contact?.id || contact?.phone || null;
}

function sameMessageList(previous: Message[], next: Message[]) {
  if (previous.length !== next.length) {
    return false;
  }

  const previousLast = previous[previous.length - 1];
  const nextLast = next[next.length - 1];

  if (!previousLast && !nextLast) {
    return true;
  }

  if (!previousLast || !nextLast) {
    return false;
  }

  return (
    previousLast.id === nextLast.id &&
    previousLast.status === nextLast.status &&
    previousLast.body === nextLast.body &&
    previousLast.created_at === nextLast.created_at &&
    previousLast.message_type === nextLast.message_type &&
    previousLast.media_id === nextLast.media_id &&
    previousLast.media_url === nextLast.media_url &&
    previousLast.english_translation === nextLast.english_translation &&
    previousLast.detected_language === nextLast.detected_language &&
    previousLast.translation_status === nextLast.translation_status
  );
}

function sortMessages(messages: Message[]) {
  return [...messages].sort((a, b) => {
    const first = new Date(a.created_at).getTime();
    const second = new Date(b.created_at).getTime();

    if (Number.isNaN(first) || Number.isNaN(second)) {
      return 0;
    }

    return first - second;
  });
}

function getApiErrorMessage(payload: unknown, fallback: string) {
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

export default function InboxClient({
  initialContacts = [],
}: {
  initialContacts?: Contact[];
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [filter, setFilter] = useState<ChatFilter>("all");
  const [search, setSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  const selectedIdRef = useRef<string | null>(selectedId);
  const loadingMessagesRef = useRef(false);
  const loadingContactsRef = useRef(false);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selected = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    return (
      contacts.find((contact) => getContactKey(contact) === selectedId) || null
    );
  }, [contacts, selectedId]);

  const selectedBlocked = selected?.blocked === true;
  const selectedNeedsHumanAttention =
    selected?.needs_human_attention === true;

  const loadContacts = useCallback(async (silent = false) => {
    if (loadingContactsRef.current) {
      return;
    }

    loadingContactsRef.current = true;

    try {
      if (!silent) {
        setLoadingContacts(true);
      }

      const result = await fetchContactsAction();

      if (result.error) {
        if (!silent) {
          setLoadError(result.error);
        }

        return;
      }

      const nextContacts = result.contacts || [];

      setContacts(nextContacts);
      setLoadError(null);

      setSelectedId((currentSelectedId) => {
        if (!currentSelectedId) {
          return null;
        }

        const stillExists = nextContacts.some(
          (contact) => getContactKey(contact) === currentSelectedId
        );

        return stillExists ? currentSelectedId : null;
      });
    } catch (error) {
      console.error("Failed to load contacts:", error);

      if (!silent) {
        setLoadError("Could not load WhatsApp conversations.");
      }
    } finally {
      loadingContactsRef.current = false;

      if (!silent) {
        setLoadingContacts(false);
      }
    }
  }, []);

  const loadQuickReplies = useCallback(async () => {
    try {
      const result = await fetchQuickRepliesAction();
      setQuickReplies(result.items || []);
    } catch (error) {
      console.error("Failed to load quick replies:", error);
      setQuickReplies([]);
    }
  }, []);

  const loadMessages = useCallback(
    async (contactId: string, silent = false) => {
      if (!contactId) {
        return;
      }

      if (loadingMessagesRef.current) {
        return;
      }

      loadingMessagesRef.current = true;

      try {
        if (!silent) {
          setLoadingMessages(true);
          setMessageError(null);
        }

        const result = await fetchMessagesAction(contactId);

        if (selectedIdRef.current !== contactId) {
          return;
        }

        if (result.error) {
          if (!silent) {
            setMessageError(result.error);
            setMessages([]);
          }

          return;
        }

        const nextMessages = sortMessages(result.messages || []);

        setMessages((previousMessages) => {
          if (sameMessageList(previousMessages, nextMessages)) {
            return previousMessages;
          }

          return nextMessages;
        });

        setMessageError(null);
      } catch (error) {
        console.error("Failed to load messages:", error);

        if (!silent) {
          setMessages([]);
          setMessageError("Could not load messages for this conversation.");
        }
      } finally {
        loadingMessagesRef.current = false;

        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    []
  );

  const refreshInbox = useCallback(
    async (silent = true) => {
      await loadContacts(silent);

      const currentSelectedId = selectedIdRef.current;

      if (currentSelectedId) {
        await loadMessages(currentSelectedId, silent);
      }
    },
    [loadContacts, loadMessages]
  );

  useEffect(() => {
    void loadContacts();
    void loadQuickReplies();

    const contactsTimer = window.setInterval(() => {
      void loadContacts(true);
    }, 6000);

    return () => {
      window.clearInterval(contactsTimer);
    };
  }, [loadContacts, loadQuickReplies]);

  useEffect(() => {
    function handleCustomRefresh() {
      void refreshInbox(true);
    }

    window.addEventListener("artipilot:inbox-refresh", handleCustomRefresh);

    return () => {
      window.removeEventListener("artipilot:inbox-refresh", handleCustomRefresh);
    };
  }, [refreshInbox]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setMessageError(null);
      return;
    }

    setMessages([]);
    setMessageError(null);

    void loadMessages(selectedId);

    const messagesTimer = window.setInterval(() => {
      const currentSelectedId = selectedIdRef.current;

      if (currentSelectedId) {
        void loadMessages(currentSelectedId, true);
      }
    }, 3000);

    return () => {
      window.clearInterval(messagesTimer);
    };
  }, [selectedId, loadMessages]);

  async function handleSelectContact(contactId: string) {
    setSelectedId(contactId);
    setMessageError(null);
  }

  async function handleBackToInbox() {
    setSelectedId(null);
    setMessages([]);
    setMessageError(null);
    void loadContacts(true);
  }

  async function handleSend(body: string) {
    if (!selectedId) {
      throw new Error("Select a conversation first.");
    }

    if (selectedBlocked) {
      throw new Error("This customer is blocked. Unblock them before sending.");
    }

    const cleanBody = body.trim();

    if (!cleanBody) {
      throw new Error("Message cannot be empty.");
    }

    const activeContactId = selectedId;

    const result = await sendMessageAction(activeContactId, cleanBody);

    if (result.error) {
      throw new Error(result.error);
    }

    await loadMessages(activeContactId, true);
    void loadContacts(true);
  }

  async function handleSendMedia(file: File, caption: string) {
    if (!selectedId) {
      throw new Error("Select a conversation first.");
    }

    if (selectedBlocked) {
      throw new Error("This customer is blocked. Unblock them before sending.");
    }

    if (!file) {
      throw new Error("Select a file first.");
    }

    const activeContactId = selectedId;
    const formData = new FormData();

    formData.append("contactId", activeContactId);
    formData.append("file", file);

    if (caption.trim()) {
      formData.append("caption", caption.trim());
      formData.append("message", caption.trim());
    }

    const response = await fetch("/api/private/send", {
      method: "POST",
      body: formData,
    });

    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(
        getApiErrorMessage(payload, "Could not send this file on WhatsApp.")
      );
    }

    await loadMessages(activeContactId, true);
    void loadContacts(true);
  }

  async function handleAiSuggest() {
    if (!selectedId) {
      return null;
    }

    if (selectedBlocked) {
      throw new Error("This customer is blocked.");
    }

    const result = await suggestAiAction(selectedId);

    if (result.error) {
      throw new Error(result.error);
    }

    return result.suggestion || null;
  }

  async function handleToggleAi() {
    if (!selected) {
      return;
    }

    if (selectedBlocked) {
      setMessageError("This customer is blocked. Unblock them before enabling AI.");
      return;
    }

    const contactKey = getContactKey(selected);

    if (!contactKey) {
      return;
    }

    const previousValue = selected.ai_enabled;
    const nextValue = !previousValue;

    setContacts((previousContacts) =>
      previousContacts.map((contact) =>
        getContactKey(contact) === contactKey
          ? {
              ...contact,
              ai_enabled: nextValue,
              needs_human_attention: nextValue
                ? false
                : contact.needs_human_attention,
              human_attention_reason: nextValue
                ? null
                : contact.human_attention_reason,
              human_attention_at: nextValue ? null : contact.human_attention_at,
            }
          : contact
      )
    );

    try {
      const result = await toggleAiAction(selected.id, nextValue);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.contact) {
        setContacts((previousContacts) =>
          previousContacts.map((contact) =>
            getContactKey(contact) === contactKey
              ? { ...contact, ...result.contact }
              : contact
          )
        );
      }

      void loadContacts(true);
    } catch (error) {
      console.error("Failed to toggle AI:", error);

      setContacts((previousContacts) =>
        previousContacts.map((contact) =>
          getContactKey(contact) === contactKey
            ? { ...contact, ai_enabled: previousValue }
            : contact
        )
      );

      setMessageError(
        error instanceof Error ? error.message : "Could not update AI status."
      );
    }
  }

  return (
    <div className="flex h-[100svh] max-h-[100svh] overflow-hidden bg-[#efeae2] text-[#111b21]">
      <aside
        className={[
          "h-full shrink-0 border-r border-[#d1d7db] bg-white",
          "w-full md:w-96 lg:w-[410px]",
          selected ? "hidden md:block" : "block",
        ].join(" ")}
      >
        <div className="flex h-full min-h-0 flex-col">
          {loadError ? (
            <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
              {loadError}
            </div>
          ) : null}

          {loadingContacts && contacts.length === 0 ? (
            <div className="shrink-0 border-b border-[#e9edef] bg-[#f0f2f5] px-4 py-3 text-xs text-[#667781]">
              Loading WhatsApp conversations...
            </div>
          ) : null}

          <div className="min-h-0 flex-1">
            <ChatList
              contacts={contacts}
              selectedId={selectedId}
              filter={filter}
              search={search}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
              onSelect={handleSelectContact}
            />
          </div>
        </div>
      </aside>

      <main
        className={[
          "min-w-0 flex-1 flex-col bg-[#efeae2]",
          selected
            ? "fixed inset-0 z-50 flex h-[100svh] max-h-[100svh] md:relative md:inset-auto md:z-auto"
            : "hidden md:flex",
        ].join(" ")}
      >
        {selected ? (
          <div className="shrink-0 border-b border-[#d1d7db] bg-[#f0f2f5]">
            {messageError ? (
              <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs leading-5 text-red-700">
                {messageError}
              </div>
            ) : null}

            <div className="flex h-14 items-center gap-3 px-2 md:hidden">
              <button
                type="button"
                onClick={() => void handleBackToInbox()}
                className="flex h-10 w-10 items-center justify-center rounded-full text-3xl leading-none text-[#111b21] hover:bg-[#e9edef]"
                aria-label="Back to chats"
              >
                ‹
              </button>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-sm font-bold text-[#54656f]">
                {(selected.name || selected.profile_name || selected.phone || "?")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-[#111b21]">
                  {selected.name || selected.profile_name || selected.phone}
                </p>
                <p
                  className={[
                    "truncate text-xs",
                    selectedBlocked || selectedNeedsHumanAttention
                      ? "font-bold text-red-600"
                      : "text-[#667781]",
                  ].join(" ")}
                >
                  {selectedBlocked
                    ? "Blocked"
                    : selectedNeedsHumanAttention
                      ? "Needs human attention"
                      : `AI ${selected.ai_enabled ? "on" : "off"}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleToggleAi()}
                disabled={selectedBlocked}
                className={[
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                  selected.ai_enabled
                    ? "bg-[#d9fdd3] text-[#008069]"
                    : "bg-white text-[#54656f]",
                  selectedBlocked ? "opacity-50" : "",
                ].join(" ")}
              >
                AI {selected.ai_enabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        ) : messageError ? (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {messageError}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden">
          <ChatWindow
            contact={selected}
            messages={messages}
            loading={loadingMessages}
            onToggleAi={() => void handleToggleAi()}
          />
        </div>

        <div className="shrink-0 border-t border-[#d1d7db] bg-[#f0f2f5] pb-[max(env(safe-area-inset-bottom),0px)]">
          <MessageComposer
            disabled={!selected}
            quickReplies={quickReplies}
            onSend={handleSend}
            onAiSuggest={handleAiSuggest}
            onSendMedia={handleSendMedia}
            blocked={selectedBlocked}
            needsHumanAttention={selectedNeedsHumanAttention}
          />
        </div>
      </main>

      {!selected ? (
        <section className="hidden min-w-0 flex-1 items-center justify-center bg-[#f0f2f5] px-6 text-center md:flex">
          <div className="max-w-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#00a884]/10 text-2xl font-black text-[#00a884]">
              A
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-[#111b21]">
              Artipilot Private Inbox
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#667781]">
              Select a WhatsApp conversation to view messages, send manual
              replies, or control AI automatic replies for that customer.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}