"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Contact, Message, QuickReply } from "@/lib/db/types";

type ContactRow = Contact & { last_message_preview?: string };

function displayName(c: ContactRow) {
  return c.name || c.profile_name || c.phone;
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function InboxClient() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) || null,
    [contacts, selectedId]
  );

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const label = displayName(c).toLowerCase();
      return label.includes(q) || c.phone.includes(q);
    });
  }, [contacts, search]);

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError("");
    try {
      const res = await fetch("/api/contacts", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setContactsError(data.error || data.hint || "Failed to load contacts");
        setContacts([]);
        return;
      }
      setContacts(data.contacts || []);
    } catch {
      setContactsError("Network error loading contacts");
    } finally {
      setContactsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (contactId: string) => {
    setMessagesLoading(true);
    setMessagesError("");
    try {
      const res = await fetch(
        `/api/messages?contact_id=${encodeURIComponent(contactId)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) {
        setMessagesError(data.error || "Failed to load messages");
        setMessages([]);
        return;
      }
      setMessages(data.messages || []);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch {
      setMessagesError("Network error loading messages");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const loadQuickReplies = useCallback(async () => {
    try {
      const res = await fetch("/api/quick-replies", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setQuickReplies((data.items || []).filter((q: QuickReply) => q.active));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadContacts();
    void loadQuickReplies();
    const t = setInterval(() => {
      void loadContacts();
      if (selectedId) void loadMessages(selectedId);
    }, 15000);
    return () => clearInterval(t);
  }, [loadContacts, loadMessages, selectedId]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function createContact() {
    setCreating(true);
    setContactsError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone, name: newName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setContactsError(data.error || "Failed to create contact");
        return;
      }
      const contact = data.contact as ContactRow;
      setContacts((prev) => [contact, ...prev.filter((c) => c.id !== contact.id)]);
      setSelectedId(contact.id);
      setShowNewChat(false);
      setNewPhone("");
      setNewName("");
    } catch {
      setContactsError("Network error creating contact");
    } finally {
      setCreating(false);
    }
  }

  async function sendMessage() {
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    setSendError("");
    const text = draft.trim();
    setDraft("");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: selectedId, body: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || "Send failed");
        setDraft(text);
        return;
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message as Message]);
      }
      await loadMessages(selectedId);
      await loadContacts();
    } catch {
      setSendError("Network error sending message");
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  async function toggleAi() {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/contacts/${selectedId}/toggle-ai`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.contact) {
        setContacts((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, ...data.contact } : c))
        );
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="-mx-6 -my-8 flex h-[calc(100vh-88px)] flex-col overflow-hidden rounded-none border border-white/10 bg-[#0b141a] md:h-[calc(100vh-96px)]">
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_1fr]">
        {/* Sidebar */}
        <aside className="flex min-h-0 flex-col border-r border-white/10 bg-[#111b21]">
          <div className="border-b border-white/10 p-3">
            <div className="flex gap-2">
              <input
                type="search"
                placeholder="Search chats"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-lg bg-[#202c33] px-3 py-2 text-sm text-white placeholder:text-[#8696a0] outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={() => setShowNewChat(true)}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                New
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {contactsLoading && (
              <p className="p-4 text-sm text-[#8696a0]">Loading contacts…</p>
            )}
            {contactsError && (
              <p className="m-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {contactsError}
              </p>
            )}
            {!contactsLoading && !contactsError && filteredContacts.length === 0 && (
              <p className="p-4 text-sm text-[#8696a0]">
                No contacts in the database yet. Use New to add a phone number and
                start a chat.
              </p>
            )}
            {filteredContacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-start gap-3 border-b border-white/5 px-3 py-3 text-left hover:bg-[#202c33] ${
                  selectedId === c.id ? "bg-[#2a3942]" : ""
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6b7c85] text-lg font-semibold text-white">
                  {displayName(c).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-[#e9edef]">
                      {displayName(c)}
                    </span>
                    <span className="shrink-0 text-xs text-[#8696a0]">
                      {formatTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="truncate text-sm text-[#8696a0]">
                      {c.last_message_preview || c.phone}
                    </p>
                    {c.unread_count > 0 && (
                      <span className="ml-auto shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <span
                    className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      c.ai_enabled
                        ? "bg-emerald-900/50 text-emerald-300"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    AI {c.ai_enabled ? "ON" : "OFF"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat panel */}
        <section className="flex min-h-0 flex-col bg-[#0b141a]">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-[#8696a0]">
              Select a conversation
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#202c33] px-4 py-3">
                <div>
                  <h2 className="font-semibold text-[#e9edef]">
                    {displayName(selected)}
                  </h2>
                  <p className="text-xs text-[#8696a0]">{selected.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleAi()}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    selected.ai_enabled
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-600 text-slate-200"
                  }`}
                >
                  AI {selected.ai_enabled ? "ON" : "OFF"}
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {messagesLoading && (
                  <p className="text-sm text-[#8696a0]">Loading messages…</p>
                )}
                {messagesError && (
                  <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {messagesError}
                  </p>
                )}
                {!messagesLoading && messages.length === 0 && !messagesError && (
                  <p className="text-sm text-[#8696a0]">
                    No messages for this contact yet.
                  </p>
                )}
                <div className="space-y-2">
                  {messages.map((m) => {
                    const outbound = m.direction === "outbound";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            outbound
                              ? "bg-[#005c4b] text-[#e9edef]"
                              : "bg-[#202c33] text-[#e9edef]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {m.body || `[${m.message_type}]`}
                          </p>
                          <p className="mt-1 text-right text-[10px] text-[#8696a0]">
                            {m.sender_type !== "customer" && m.sender_type !== "admin"
                              ? `${m.sender_type} · `
                              : ""}
                            {formatTime(m.created_at)}
                            {m.status && m.status !== "received"
                              ? ` · ${m.status}`
                              : ""}
                          </p>
                          {m.status_error && (
                            <p className="mt-1 text-[10px] text-red-300">
                              {m.status_error}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div ref={messagesEndRef} />
              </div>

              <footer className="border-t border-white/10 bg-[#202c33] p-3">
                {sendError && (
                  <p className="mb-2 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
                    {sendError}
                  </p>
                )}
                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies((v) => !v)}
                    className="rounded border border-white/10 px-2 py-1 text-xs text-[#8696a0] hover:bg-white/5"
                  >
                    Quick replies
                  </button>
                  {showQuickReplies &&
                    quickReplies.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          setDraft((d) => (d ? `${d}\n${q.content}` : q.content));
                          setShowQuickReplies(false);
                        }}
                        className="rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10"
                      >
                        {q.title}
                      </button>
                    ))}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    rows={2}
                    placeholder="Type a message"
                    disabled={sending}
                    className="min-h-[44px] flex-1 resize-none rounded-lg bg-[#2a3942] px-3 py-2 text-sm text-white placeholder:text-[#8696a0] outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={sending || !draft.trim()}
                    className="self-end rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111b21] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">New chat</h3>
            <p className="mt-1 text-sm text-[#8696a0]">
              Enter the customer WhatsApp number (with country code, digits only).
            </p>
            <label className="mt-4 block text-sm text-[#8696a0]">
              Phone
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="34612345678"
                className="mt-1 w-full rounded-lg bg-[#202c33] px-3 py-2 text-white outline-none"
              />
            </label>
            <label className="mt-3 block text-sm text-[#8696a0]">
              Name (optional)
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-lg bg-[#202c33] px-3 py-2 text-white outline-none"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewChat(false)}
                className="rounded-lg px-4 py-2 text-sm text-[#8696a0] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || !newPhone.trim()}
                onClick={() => void createContact()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
