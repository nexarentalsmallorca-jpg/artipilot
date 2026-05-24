"use client";

import { useCallback, useEffect, useState } from "react";
import ChatList, { type Contact } from "@/components/inbox/ChatList";
import ChatWindow, { type Message } from "@/components/inbox/ChatWindow";
import MessageComposer from "@/components/inbox/MessageComposer";

type Filter = "all" | "unread" | "ai_on" | "ai_off";

async function privateFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  if (method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export default function InboxClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
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
    try {
      const data = await privateFetch<{ contacts: Contact[] }>(
        "/api/private/contacts"
      );
      setContacts(data.contacts || []);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load contacts");
    }
  }, []);

  const loadQuickReplies = useCallback(async () => {
    try {
      const data = await privateFetch<{ items: { id: string; title: string; content: string }[] }>(
        "/api/private/quick-replies"
      );
      setQuickReplies(data.items || []);
    } catch {
      setQuickReplies([]);
    }
  }, []);

  const loadMessages = useCallback(async (contactId: string) => {
    setLoadingMessages(true);
    setMessageError(null);
    try {
      const data = await privateFetch<{ messages: Message[] }>(
        `/api/private/messages?contact_id=${encodeURIComponent(contactId)}`
      );
      setMessages(data.messages || []);
      await loadContacts();
    } catch (e) {
      setMessages([]);
      setMessageError(
        e instanceof Error ? e.message : "Failed to load messages"
      );
    } finally {
      setLoadingMessages(false);
    }
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
    const data = await privateFetch<{ message: Message; error?: string }>(
      "/api/private/send",
      {
        method: "POST",
        body: JSON.stringify({ contact_id: selectedId, body }),
      }
    );
    if (data.error) {
      throw new Error(data.error);
    }
    await loadMessages(selectedId);
  }

  async function handleAiSuggest() {
    if (!selectedId) return null;
    const data = await privateFetch<{ suggestion: string }>(
      "/api/private/ai-suggest",
      {
        method: "POST",
        body: JSON.stringify({ contact_id: selectedId }),
      }
    );
    return data.suggestion;
  }

  async function handleToggleAi() {
    if (!selected) return;
    const next = !selected.ai_enabled;
    await privateFetch("/api/private/contacts", {
      method: "PATCH",
      body: JSON.stringify({ contact_id: selected.id, ai_enabled: next }),
    });
    setContacts((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, ai_enabled: next } : c))
    );
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
