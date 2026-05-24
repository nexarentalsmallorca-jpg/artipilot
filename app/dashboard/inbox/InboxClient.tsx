"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function InboxClient({
  initialContacts = [],
}: {
  initialContacts?: Contact[];
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [quickReplies, setQuickReplies] = useState<
    { id: string; title: string; content: string }[]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  const selected = contacts.find((c) => c.id === selectedId) || null;

  const loadContacts = useCallback(async () => {
    const result = await fetchContactsAction();
    if (result.error) {
      setLoadError(result.error);
      return;
    }
    setContacts(result.contacts);
    setLoadError(null);
  }, []);

  const loadQuickReplies = useCallback(async () => {
    const result = await fetchQuickRepliesAction();
    setQuickReplies(result.items);
  }, []);

  const loadMessages = useCallback(async (contactId: string) => {
    setLoadingMessages(true);
    setMessageError(null);
    const result = await fetchMessagesAction(contactId);
    if (result.error) {
      setMessages([]);
      setMessageError(result.error);
    } else {
      setMessages(result.messages);
      await loadContacts();
    }
    setLoadingMessages(false);
  }, [loadContacts]);

  useEffect(() => {
    void loadContacts();
    void loadQuickReplies();
    const timer = setInterval(() => void loadContacts(), 15000);
    return () => clearInterval(timer);
  }, [loadContacts, loadQuickReplies]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
    const timer = setInterval(() => void loadMessages(selectedId), 8000);
    return () => clearInterval(timer);
  }, [selectedId, loadMessages]);

  async function handleSend(body: string) {
    if (!selectedId) return;
    const result = await sendMessageAction(selectedId, body);
    if (result.error) {
      throw new Error(result.error);
    }
    await loadMessages(selectedId);
  }

  async function handleAiSuggest() {
    if (!selectedId) return null;
    const result = await suggestAiAction(selectedId);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.suggestion || null;
  }

  async function handleToggleAi() {
    if (!selected) return;
    const next = !selected.ai_enabled;
    const result = await toggleAiAction(selected.id, next);
    if (result.error) {
      setMessageError(result.error);
      return;
    }
    if (result.contact) {
      setContacts((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, ...result.contact } : c))
      );
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] md:h-screen">
      <div className="w-full md:w-96 lg:w-[380px]">
        {loadError ? (
          <p className="border-b border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            {loadError}
          </p>
        ) : null}
        <ChatList
          contacts={contacts}
          selectedId={selectedId}
          filter={filter}
          search={search}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onSelect={setSelectedId}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {messageError ? (
          <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
            {messageError}
          </p>
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
      </div>
    </div>
  );
}
