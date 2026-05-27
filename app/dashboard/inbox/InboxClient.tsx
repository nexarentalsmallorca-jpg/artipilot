"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatList, { type Contact } from "@/components/inbox/ChatList";
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

type Filter = "all" | "unread" | "ai_on" | "ai_off";

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
    previousLast.media_url === nextLast.media_url
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

  /**
   * IMPORTANT:
   * Keep this NULL by default.
   * This prevents the app/PWA/mobile shortcut from auto-opening the first chat,
   * especially your own Sahil/Sahin self-chat.
   */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
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

      /**
       * IMPORTANT:
       * Do NOT auto-select the first contact.
       * Only keep the selected chat if it still exists.
       * If the selected chat disappears, go back to inbox list.
       */
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

        /**
         * If user switched chat while this request was loading,
         * do not overwrite the new selected chat messages.
         */
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

    const response = await fetch("/api/whatsapp/send", {
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

    const contactKey = getContactKey(selected);

    if (!contactKey) {
      return;
    }

    const previousValue = selected.ai_enabled;
    const nextValue = !previousValue;

    setContacts((previousContacts) =>
      previousContacts.map((contact) =>
        getContactKey(contact) === contactKey
          ? { ...contact, ai_enabled: nextValue }
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
    <div className="flex h-[100dvh] overflow-hidden bg-[#efeae2] text-[#111b21]">
      <aside
        className={[
          "h-full shrink-0 border-r border-[#d1d7db] bg-white",
          "w-full md:w-96 lg:w-[410px]",
          selected ? "hidden md:block" : "block",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          {loadError ? (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
              {loadError}
            </div>
          ) : null}

          {loadingContacts && contacts.length === 0 ? (
            <div className="border-b border-[#e9edef] bg-[#f0f2f5] px-4 py-3 text-xs text-[#667781]">
              Loading WhatsApp conversations...
            </div>
          ) : null}

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
      </aside>

      <main
        className={[
          "min-w-0 flex-1 flex-col bg-[#efeae2]",
          selected ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        {messageError ? (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {messageError}
          </div>
        ) : null}

        {selected ? (
          <div className="flex items-center gap-3 border-b border-[#d1d7db] bg-[#f0f2f5] px-3 py-2 md:hidden">
            <button
              type="button"
              onClick={() => void handleBackToInbox()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-semibold text-[#54656f] hover:bg-[#e9edef]"
              aria-label="Back to chats"
            >
              ‹
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#111b21]">
                {selected.name || selected.profile_name || selected.phone}
              </p>
              <p className="text-xs text-[#667781]">
                AI {selected.ai_enabled ? "on" : "off"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          <ChatWindow
            contact={selected}
            messages={messages}
            loading={loadingMessages}
            onToggleAi={() => void handleToggleAi()}
          />
        </div>

        <MessageComposer
          disabled={!selected}
          quickReplies={quickReplies}
          onSend={handleSend}
          onAiSuggest={handleAiSuggest}
          onSendMedia={handleSendMedia}
        />
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