"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Contact, Message } from "@/lib/db/types";
import {
  fetchPrivateApi,
  parsePrivateApiError,
  privateApiErrorLabel,
} from "@/lib/dashboard/privateFetch";

type ContactRow = Contact & { last_message_preview?: string };

type FilterTab = "all" | "unread" | "ai_on" | "ai_off" | "archived";

function formatTime(iso: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function contactLabel(c: ContactRow) {
  return c.name || c.profile_name || `+${c.phone}`;
}

export default function PrivateInbox() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [composer, setComposer] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [quickReplies, setQuickReplies] = useState<
    { id: string; title: string; content: string }[]
  >([]);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const selected = contacts.find((c) => c.id === selectedId) || null;

  const loadInbox = useCallback(async (contactId?: string | null) => {
    try {
      const q = contactId ? `?contact_id=${encodeURIComponent(contactId)}` : "";
      const res = await fetchPrivateApi(`/api/inbox${q}`, { method: "GET" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(await parsePrivateApiError("Inbox", res));
      }
      setContacts(data.contacts || []);
      if (contactId) setMessages(data.messages || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox(selectedId);
    const t = setInterval(() => void loadInbox(selectedId), 4000);
    return () => clearInterval(t);
  }, [selectedId, loadInbox]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchPrivateApi("/api/quick-replies", { method: "GET" });
        const d = await res.json();
        if (!res.ok) {
          setError(await parsePrivateApiError("Quick replies", res));
          return;
        }
        setQuickReplies((d.items || []).filter((x: { active: boolean }) => x.active));
      } catch {
        setError(privateApiErrorLabel("Quick replies", "Network error"));
      }
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filtered = useMemo(() => {
    let list = contacts;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          contactLabel(c).toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }
    if (filter === "unread") list = list.filter((c) => (c.unread_count || 0) > 0);
    if (filter === "ai_on") list = list.filter((c) => c.ai_enabled);
    if (filter === "ai_off") list = list.filter((c) => !c.ai_enabled);
    if (filter === "archived") list = list.filter((c) => c.archived);
    else list = list.filter((c) => !c.archived);
    return list;
  }, [contacts, search, filter]);

  async function sendMessage() {
    if (!selectedId || !composer.trim()) return;
    setSending(true);
    try {
      const res = await fetchPrivateApi("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: selectedId, body: composer.trim() }),
      });
      if (!res.ok) {
        throw new Error(await parsePrivateApiError("WhatsApp send", res));
      }
      setComposer("");
      await loadInbox(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function toggleAi() {
    if (!selectedId) return;
    const res = await fetchPrivateApi(`/api/contacts/${selectedId}/toggle-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) await loadInbox(selectedId);
  }

  async function suggestAi() {
    if (!selectedId) return;
    const res = await fetchPrivateApi("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: selectedId }),
    });
    const data = await res.json();
    if (data.suggestion) setComposer(String(data.suggestion));
  }

  async function deleteMsg(message: Message, mode: "me" | "everyone") {
    await fetchPrivateApi(`/api/messages/${message.id}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    setMenuMsgId(null);
    await loadInbox(selectedId);
  }

  async function createTestChat() {
    const res = await fetchPrivateApi("/api/dev/test-chat", {
      method: "POST",
    });
    const data = await res.json();
    if (data.contact?.id) {
      setSelectedId(data.contact.id);
      await loadInbox(data.contact.id);
    }
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "ai_on", label: "AI On" },
    { id: "ai_off", label: "AI Off" },
    { id: "archived", label: "Archived" },
  ];

  return (
    <div className="flex h-[calc(100dvh-0px)] md:h-[calc(100vh-0px)]">
      <section className="flex w-full flex-col border-r border-white/10 bg-[#111B21] md:w-[360px]">
        <div className="border-b border-white/10 p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts"
            className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm outline-none focus:border-[#00A884]"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`rounded-lg px-2 py-1 text-xs ${
                  filter === t.id ? "bg-[#00A884]/20 text-[#00A884]" : "text-[#8696A0]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && !contacts.length ? (
            <p className="p-4 text-sm text-[#8696A0]">Loading…</p>
          ) : null}
          {!loading && filtered.length === 0 ? (
            <div className="p-4 text-sm text-[#8696A0]">
              <p>
                No WhatsApp conversations yet. When a customer messages your WhatsApp
                Business number, chats will appear here.
              </p>
              {process.env.NODE_ENV !== "production" ? (
                <button
                  type="button"
                  onClick={() => void createTestChat()}
                  className="mt-4 rounded-lg bg-[#00A884] px-3 py-2 text-xs font-semibold text-white"
                >
                  Create test chat
                </button>
              ) : null}
            </div>
          ) : null}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full gap-3 border-b border-white/5 px-3 py-3 text-left transition hover:bg-white/5 ${
                selectedId === c.id ? "bg-[#00A884]/10" : ""
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00A884]/20 text-sm font-bold text-[#00A884]">
                {contactLabel(c).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{contactLabel(c)}</span>
                  <span className="shrink-0 text-[10px] text-[#8696A0]">
                    {formatTime(c.last_message_at)}
                  </span>
                </div>
                <p className="truncate text-xs text-[#8696A0]">
                  {c.last_message_preview || c.phone}
                </p>
                <div className="mt-1 flex gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      c.ai_enabled ? "bg-[#00A884]/20 text-[#00A884]" : "bg-white/10 text-[#8696A0]"
                    }`}
                  >
                    {c.ai_enabled ? "AI ON" : "AI OFF"}
                  </span>
                  {(c.unread_count || 0) > 0 ? (
                    <span className="rounded-full bg-[#00A884] px-1.5 text-[10px] font-bold text-white">
                      {c.unread_count}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="hidden min-w-0 flex-1 flex-col bg-[#0B141A] md:flex">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-[#8696A0]">
            Select a conversation
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#111B21] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{contactLabel(selected)}</p>
                <p className="text-xs text-[#8696A0]">+{selected.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => void toggleAi()}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  selected.ai_enabled
                    ? "bg-[#00A884]/20 text-[#00A884]"
                    : "bg-white/10 text-[#8696A0]"
                }`}
              >
                AI {selected.ai_enabled ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotes(selected.notes || "");
                  setNotesOpen(true);
                }}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs"
              >
                Notes
              </button>
            </header>

            {error ? (
              <p className="bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>
            ) : null}

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.map((m) => {
                const inbound = m.direction === "inbound";
                const isAi = m.sender_type === "ai";
                const body = m.deleted_for_everyone
                  ? "This message was deleted."
                  : m.body || "";

                return (
                  <div
                    key={m.id}
                    className={`group relative mb-2 flex ${inbound ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        inbound
                          ? "bg-[#202C33] text-[#E9EDEF]"
                          : isAi
                            ? "bg-[#005C4B] text-[#E9EDEF]"
                            : "bg-[#005C4B]/80 text-[#E9EDEF]"
                      } ${m.deleted_for_everyone ? "italic text-[#8696A0]" : ""}`}
                    >
                      {!inbound ? (
                        <p className="mb-0.5 text-[10px] font-semibold text-[#00A884]">
                          {isAi ? "AI" : "You"}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap">{body}</p>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#8696A0]">
                        <span>{formatTime(m.created_at)}</span>
                        {!inbound && m.status ? <span>{m.status}</span> : null}
                        {m.status === "failed" ? (
                          <span className="text-red-400">failed</span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMenuMsgId(menuMsgId === m.id ? null : m.id)}
                      className="absolute -right-1 top-0 rounded px-1 text-[#8696A0] opacity-0 group-hover:opacity-100"
                    >
                      ▾
                    </button>
                    {menuMsgId === m.id ? (
                      <div className="absolute right-0 top-6 z-10 min-w-[160px] rounded-lg border border-white/10 bg-[#111B21] py-1 text-xs shadow-lg">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-white/5"
                          onClick={() => {
                            void navigator.clipboard.writeText(body);
                            setMenuMsgId(null);
                          }}
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-white/5"
                          onClick={() => {
                            setComposer((p) => (p ? `${p}\n> ${body}` : `> ${body}`));
                            setMenuMsgId(null);
                          }}
                        >
                          Reply
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-white/5"
                          onClick={() => void deleteMsg(m, "me")}
                        >
                          Delete for me
                        </button>
                        {!inbound ? (
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-red-300 hover:bg-white/5"
                            onClick={() => void deleteMsg(m, "everyone")}
                          >
                            Delete for everyone
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <footer className="border-t border-white/10 bg-[#111B21] p-3">
              <div className="mb-2 flex flex-wrap gap-1">
                {quickReplies.slice(0, 6).map((qr) => (
                  <button
                    key={qr.id}
                    type="button"
                    onClick={() => setComposer(qr.content)}
                    className="rounded-lg bg-white/5 px-2 py-1 text-[10px] text-[#8696A0] hover:bg-white/10"
                  >
                    {qr.title}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void suggestAi()}
                  className="rounded-lg bg-[#00A884]/15 px-2 py-1 text-[10px] font-semibold text-[#00A884]"
                >
                  AI suggest
                </button>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  rows={2}
                  placeholder="Type a message"
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm outline-none focus:border-[#00A884]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={sending || !composer.trim()}
                  onClick={() => void sendMessage()}
                  className="rounded-xl bg-[#00A884] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      {notesOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111B21] p-4">
            <h3 className="font-semibold">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#0B141A] p-3 text-sm"
              rows={4}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNotesOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-[#8696A0]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedId) return;
                  void fetchPrivateApi(`/api/contacts/${selectedId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notes }),
                  }).then(() => {
                    setNotesOpen(false);
                    void loadInbox(selectedId);
                  });
                }}
                className="rounded-lg bg-[#00A884] px-3 py-2 text-sm font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
