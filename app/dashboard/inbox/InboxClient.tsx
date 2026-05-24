"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function InboxClient({
  initialContacts = [],
}: {
  initialContacts?: Contact[];
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialContacts[0]?.id || null
  );

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  const selected = useMemo(() => {
    return contacts.find((contact) => contact.id === selectedId) || null;
  }, [contacts, selectedId]);

  const loadContacts = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoadingContacts(true);
        }

        const result = await fetchContactsAction();

        if (result.error) {
          setLoadError(result.error);
          return;
        }

        const nextContacts = result.contacts || [];
        setContacts(nextContacts);
        setLoadError(null);

        setSelectedId((currentSelectedId) => {
          if (currentSelectedId) {
            const stillExists = nextContacts.some(
              (contact) => contact.id === currentSelectedId
            );

            if (stillExists) {
              return currentSelectedId;
            }
          }

          return nextContacts[0]?.id || null;
        });
      } catch (error) {
        console.error("Failed to load contacts:", error);
        setLoadError("Could not load WhatsApp conversations.");
      } finally {
        if (!silent) {
          setLoadingContacts(false);
        }
      }
    },
    []
  );

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
      try {
        if (!silent) {
          setLoadingMessages(true);
        }

        setMessageError(null);

        const result = await fetchMessagesAction(contactId);

        if (result.error) {
          setMessages([]);
          setMessageError(result.error);
          return;
        }

        setMessages(result.messages || []);
        await loadContacts(true);
      } catch (error) {
        console.error("Failed to load messages:", error);
        setMessages([]);
        setMessageError("Could not load messages for this conversation.");
      } finally {
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [loadContacts]
  );

  useEffect(() => {
    void loadContacts();
    void loadQuickReplies();

    const timer = window.setInterval(() => {
      void loadContacts(true);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadContacts, loadQuickReplies]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedId);

    const timer = window.setInterval(() => {
      void loadMessages(selectedId, true);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [selectedId, loadMessages]);

  async function handleSelectContact(contactId: string) {
    setSelectedId(contactId);
    setMessageError(null);
  }

  async function handleSend(body: string) {
    if (!selectedId) {
      throw new Error("Select a conversation first.");
    }

    const cleanBody = body.trim();

    if (!cleanBody) {
      throw new Error("Message cannot be empty.");
    }

    try {
      const result = await sendMessageAction(selectedId, cleanBody);

      if (result.error) {
        throw new Error(result.error);
      }

      await loadMessages(selectedId);
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error instanceof Error
        ? error
        : new Error("Could not send WhatsApp message.");
    }
  }

  async function handleAiSuggest() {
    if (!selectedId) {
      return null;
    }

    try {
      const result = await suggestAiAction(selectedId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.suggestion || null;
    } catch (error) {
      console.error("Failed to generate AI suggestion:", error);
      throw error instanceof Error
        ? error
        : new Error("Could not generate AI reply.");
    }
  }

  async function handleToggleAi() {
    if (!selected) {
      return;
    }

    const previousValue = selected.ai_enabled;
    const nextValue = !previousValue;

    setContacts((previousContacts) =>
      previousContacts.map((contact) =>
        contact.id === selected.id
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
            contact.id === selected.id
              ? { ...contact, ...result.contact }
              : contact
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle AI:", error);

      setContacts((previousContacts) =>
        previousContacts.map((contact) =>
          contact.id === selected.id
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
    <div className="flex h-[100dvh] overflow-hidden bg-[#0b141a] text-white">
      <aside
        className={[
          "h-full border-r border-white/10 bg-[#111b21]",
          "w-full shrink-0 md:w-96 lg:w-[390px]",
          selected ? "hidden md:block" : "block",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          {loadError ? (
            <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-200">
              {loadError}
            </div>
          ) : null}

          {loadingContacts && contacts.length === 0 ? (
            <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
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

      <section
        className={[
          "min-w-0 flex-1 flex-col bg-[#0b141a]",
          selected ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        {messageError ? (
          <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-200">
            {messageError}
          </div>
        ) : null}

        {selected ? (
          <div className="flex items-center gap-3 border-b border-white/10 bg-[#202c33] px-3 py-2 md:hidden">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
            >
              Back
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {selected.name || selected.phone || "WhatsApp contact"}
              </p>
              <p className="text-xs text-slate-400">
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
        />
      </section>

      {!selected ? (
        <section className="hidden min-w-0 flex-1 items-center justify-center bg-[#0b141a] px-6 text-center md:flex">
          <div className="max-w-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-2xl font-black text-emerald-300">
              A
            </div>

            <h1 className="text-2xl font-black tracking-tight">
              Artipilot WhatsApp AI
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Select a conversation to view messages, send manual replies, or
              control AI automatic replies for that contact.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}