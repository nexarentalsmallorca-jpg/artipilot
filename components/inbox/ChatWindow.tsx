"use client";

import type { Contact } from "./ChatList";

export type Message = {
  id: string;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "admin" | "ai" | "system";
  body: string | null;
  status: string | null;
  created_at: string;
};

function displayName(c: Contact) {
  return c.name || c.profile_name || c.phone;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  if (!contact) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[#0B141A] text-[#8696A0]">
        Select a conversation
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-[#0B141A]">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#111B21] px-4 py-3">
        <div>
          <h2 className="font-semibold text-white">{displayName(contact)}</h2>
          <p className="text-xs text-[#8696A0]">{contact.phone}</p>
        </div>
        <button
          type="button"
          onClick={onToggleAi}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            contact.ai_enabled
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-white/10 text-[#8696A0]"
          }`}
        >
          AI {contact.ai_enabled ? "ON" : "OFF"}
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-sm text-[#8696A0]">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-[#8696A0]">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const outbound = m.direction === "outbound";
            return (
              <div
                key={m.id}
                className={`flex ${outbound ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    outbound
                      ? "bg-[#005C4B] text-white"
                      : "bg-[#202C33] text-[#E9EDEF]"
                  }`}
                >
                  {m.sender_type === "ai" ? (
                    <span className="mb-1 block text-[10px] font-bold uppercase text-emerald-300">
                      AI
                    </span>
                  ) : null}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">
                    {formatTime(m.created_at)}
                    {m.status ? ` · ${m.status}` : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
