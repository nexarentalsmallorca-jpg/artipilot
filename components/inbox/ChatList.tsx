"use client";

export type Contact = {
  id: string;
  phone: string;
  name: string | null;
  profile_name: string | null;
  ai_enabled: boolean;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

type Filter = "all" | "unread" | "ai_on" | "ai_off";

function displayName(contact: Contact) {
  return contact.name || contact.profile_name || contact.phone || "Unknown";
}

function getInitial(contact: Contact) {
  return displayName(contact).slice(0, 1).toUpperCase();
}

function formatTime(iso: string | null) {
  if (!iso) {
    return "";
  }

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
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isYesterday) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function contactMatchesSearch(contact: Contact, query: string) {
  if (!query) {
    return true;
  }

  const name = normalizeText(displayName(contact));
  const phone = normalizeText(contact.phone);
  const lastMessage = normalizeText(contact.last_message);

  return (
    name.includes(query) ||
    phone.includes(query) ||
    lastMessage.includes(query)
  );
}

export default function ChatList({
  contacts,
  selectedId,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onSelect,
}: {
  contacts: Contact[];
  selectedId: string | null;
  filter: Filter;
  search: string;
  onFilterChange: (filter: Filter) => void;
  onSearchChange: (query: string) => void;
  onSelect: (id: string) => void;
}) {
  const query = search.trim().toLowerCase();

  const filteredContacts = contacts.filter((contact) => {
    if (filter === "unread" && contact.unread_count <= 0) {
      return false;
    }

    if (filter === "ai_on" && !contact.ai_enabled) {
      return false;
    }

    if (filter === "ai_off" && contact.ai_enabled) {
      return false;
    }

    return contactMatchesSearch(contact, query);
  });

  const unreadTotal = contacts.reduce(
    (total, contact) => total + Math.max(contact.unread_count || 0, 0),
    0
  );

  const aiOnTotal = contacts.filter((contact) => contact.ai_enabled).length;
  const aiOffTotal = contacts.filter((contact) => !contact.ai_enabled).length;

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: contacts.length },
    { id: "unread", label: "Unread", count: unreadTotal },
    { id: "ai_on", label: "AI On", count: aiOnTotal },
    { id: "ai_off", label: "AI Off", count: aiOffTotal },
  ];

  return (
    <div className="flex h-full flex-col bg-[#111b21] text-white">
      <header className="border-b border-white/10 bg-[#202c33] px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight">Chats</h1>
            <p className="mt-0.5 text-xs text-[#8696a0]">
              Private WhatsApp AI inbox
            </p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884]/15 text-sm font-black text-[#00a884]">
            A
          </div>
        </div>

        <div className="relative">
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search chats or phone number"
            className="w-full rounded-xl border border-white/10 bg-[#111b21] px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-[#8696a0] focus:border-[#00a884]/70 focus:ring-4 focus:ring-[#00a884]/10"
          />

          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-sm text-[#8696a0] hover:bg-white/10 hover:text-white"
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => {
            const active = filter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange(item.id)}
                className={[
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition",
                  active
                    ? "bg-[#00a884]/20 text-[#00a884]"
                    : "bg-white/[0.06] text-[#8696a0] hover:bg-white/[0.1] hover:text-white",
                ].join(" ")}
              >
                <span>{item.label}</span>
                {typeof item.count === "number" ? (
                  <span className="ml-1 opacity-70">{item.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="max-w-xs">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-xl">
                💬
              </div>

              <h2 className="text-base font-bold text-white">
                {contacts.length === 0
                  ? "No conversations yet"
                  : "No matching conversations"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#8696a0]">
                {contacts.length === 0
                  ? "When someone messages your WhatsApp Business number, the conversation will appear here."
                  : "Try changing the search text or filter."}
              </p>
            </div>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const active = selectedId === contact.id;
            const name = displayName(contact);
            const time = formatTime(contact.last_message_at);
            const hasUnread = contact.unread_count > 0;

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => onSelect(contact.id)}
                className={[
                  "group flex w-full items-start gap-3 border-b border-white/[0.06] px-3 py-3 text-left transition",
                  active
                    ? "bg-[#00a884]/10"
                    : "hover:bg-white/[0.05] active:bg-white/[0.08]",
                ].join(" ")}
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00a884]/15 text-base font-black text-[#00a884]">
                  {getInitial(contact)}

                  <span
                    className={[
                      "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111b21]",
                      contact.ai_enabled ? "bg-[#00a884]" : "bg-[#8696a0]",
                    ].join(" ")}
                    title={contact.ai_enabled ? "AI On" : "AI Off"}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={[
                          "truncate text-sm",
                          hasUnread ? "font-black text-white" : "font-semibold text-white",
                        ].join(" ")}
                      >
                        {name}
                      </p>

                      {contact.phone && contact.phone !== name ? (
                        <p className="mt-0.5 truncate text-[11px] text-[#8696a0]">
                          {contact.phone}
                        </p>
                      ) : null}
                    </div>

                    {time ? (
                      <span
                        className={[
                          "shrink-0 text-[10px]",
                          hasUnread ? "font-bold text-[#00a884]" : "text-[#8696a0]",
                        ].join(" ")}
                      >
                        {time}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <p
                      className={[
                        "min-w-0 flex-1 truncate text-xs",
                        hasUnread ? "font-semibold text-slate-200" : "text-[#8696a0]",
                      ].join(" ")}
                    >
                      {contact.last_message || "No messages yet"}
                    </p>

                    {hasUnread ? (
                      <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#00a884] px-1.5 py-0.5 text-[10px] font-black text-black">
                        {contact.unread_count > 99 ? "99+" : contact.unread_count}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={[
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                        contact.ai_enabled
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/10 text-[#8696a0]",
                      ].join(" ")}
                    >
                      {contact.ai_enabled ? "AI auto-reply on" : "AI auto-reply off"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}