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
  blocked?: boolean | null;
  needs_human_attention?: boolean | null;
  human_attention_reason?: string | null;
  human_attention_at?: string | null;
};

export type ChatFilter = "all" | "unread" | "human" | "ai_on" | "ai_off";

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
  const reason = normalizeText(contact.human_attention_reason);

  return (
    name.includes(query) ||
    phone.includes(query) ||
    lastMessage.includes(query) ||
    reason.includes(query)
  );
}

function getLastMessagePreview(contact: Contact) {
  const message = String(contact.last_message || "").trim();

  if (!message) {
    return "No messages yet";
  }

  return message;
}

function isHumanAttention(contact: Contact) {
  return contact.needs_human_attention === true;
}

function isBlocked(contact: Contact) {
  return contact.blocked === true;
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
  filter: ChatFilter;
  search: string;
  onFilterChange: (filter: ChatFilter) => void;
  onSearchChange: (query: string) => void;
  onSelect: (id: string) => void;
}) {
  const query = search.trim().toLowerCase();

  const sortedContacts = [...contacts].sort((a, b) => {
    const aHuman = isHumanAttention(a) ? 1 : 0;
    const bHuman = isHumanAttention(b) ? 1 : 0;

    if (aHuman !== bHuman) {
      return bHuman - aHuman;
    }

    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;

    return bTime - aTime;
  });

  const filteredContacts = sortedContacts.filter((contact) => {
    if (filter === "unread" && contact.unread_count <= 0) {
      return false;
    }

    if (filter === "human" && !isHumanAttention(contact)) {
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

  const humanTotal = contacts.filter((contact) =>
    isHumanAttention(contact)
  ).length;

  const aiOnTotal = contacts.filter((contact) => contact.ai_enabled).length;
  const aiOffTotal = contacts.filter((contact) => !contact.ai_enabled).length;

  const filters: { id: ChatFilter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: contacts.length },
    { id: "unread", label: "Unread", count: unreadTotal },
    { id: "human", label: "Human", count: humanTotal },
    { id: "ai_on", label: "AI On", count: aiOnTotal },
    { id: "ai_off", label: "AI Off", count: aiOffTotal },
  ];

  return (
    <div className="flex h-full flex-col bg-white text-[#111b21]">
      <header className="shrink-0 border-b border-[#e9edef] bg-white">
        <div className="flex items-center justify-between gap-3 bg-[#f0f2f5] px-3 py-2 md:px-4 md:py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-black tracking-tight text-[#111b21] md:text-xl">
              Chats
            </h1>
            <p className="mt-0.5 hidden text-xs text-[#667781] sm:block">
              Artipilot private WhatsApp inbox
            </p>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656f] transition hover:bg-[#e9edef] md:h-9 md:w-9"
              title="New chat"
              aria-label="New chat"
            >
              ✎
            </button>

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656f] transition hover:bg-[#e9edef] md:h-9 md:w-9"
              title="Menu"
              aria-label="Menu"
            >
              ⋮
            </button>
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search or start new chat"
              className="w-full rounded-lg border border-transparent bg-[#f0f2f5] px-10 py-2 text-sm text-[#111b21] outline-none transition placeholder:text-[#667781] focus:border-[#00a884] focus:bg-white md:py-2.5"
            />

            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#667781]">
              🔍
            </span>

            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-base text-[#667781] hover:bg-[#e9edef] hover:text-[#111b21]"
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:mt-3">
            {filters.map((item) => {
              const active = filter === item.id;
              const isHumanFilter = item.id === "human";

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onFilterChange(item.id)}
                  className={[
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-black transition",
                    active && isHumanFilter
                      ? "bg-red-100 text-red-700"
                      : active
                        ? "bg-[#e7fce3] text-[#008069]"
                        : isHumanFilter && item.count
                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]",
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
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {filteredContacts.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="max-w-xs">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e7fce3] text-xl">
                💬
              </div>

              <h2 className="text-base font-bold text-[#111b21]">
                {contacts.length === 0
                  ? "No conversations yet"
                  : "No matching conversations"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#667781]">
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
            const needsHuman = isHumanAttention(contact);
            const blocked = isBlocked(contact);

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => onSelect(contact.id)}
                className={[
                  "group flex w-full items-start gap-3 border-b px-3 py-3 text-left transition",
                  needsHuman ? "border-red-100" : "border-[#f0f2f5]",
                  active && needsHuman
                    ? "bg-red-50"
                    : active
                      ? "bg-[#f0f2f5]"
                      : needsHuman
                        ? "bg-red-50/60 hover:bg-red-50 active:bg-red-100"
                        : "bg-white hover:bg-[#f5f6f6] active:bg-[#e9edef]",
                ].join(" ")}
              >
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-base font-bold text-[#54656f] md:h-12 md:w-12">
                  {getInitial(contact)}

                  <span
                    className={[
                      "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white",
                      blocked
                        ? "bg-red-500"
                        : contact.ai_enabled
                          ? "bg-[#00a884]"
                          : "bg-[#8696a0]",
                    ].join(" ")}
                    title={
                      blocked
                        ? "Blocked"
                        : contact.ai_enabled
                          ? "AI On"
                          : "AI Off"
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={[
                          "truncate text-sm text-[#111b21]",
                          hasUnread || needsHuman
                            ? "font-black"
                            : "font-semibold",
                        ].join(" ")}
                      >
                        {name}
                      </p>

                      {contact.phone && contact.phone !== name ? (
                        <p className="mt-0.5 truncate text-[11px] text-[#667781]">
                          {contact.phone}
                        </p>
                      ) : null}
                    </div>

                    {time ? (
                      <span
                        className={[
                          "shrink-0 text-[11px]",
                          needsHuman
                            ? "font-black text-red-600"
                            : hasUnread
                              ? "font-bold text-[#00a884]"
                              : "text-[#667781]",
                        ].join(" ")}
                      >
                        {time}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <p
                      className={[
                        "min-w-0 flex-1 truncate text-sm",
                        needsHuman
                          ? "font-semibold text-red-700"
                          : hasUnread
                            ? "font-semibold text-[#111b21]"
                            : "text-[#667781]",
                      ].join(" ")}
                    >
                      {getLastMessagePreview(contact)}
                    </p>

                    {hasUnread ? (
                      <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {contact.unread_count > 99
                          ? "99+"
                          : contact.unread_count}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {needsHuman ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
                        Needs human attention
                      </span>
                    ) : null}

                    {blocked ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
                        Blocked
                      </span>
                    ) : null}

                    <span
                      className={[
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        contact.ai_enabled && !blocked
                          ? "bg-[#e7fce3] text-[#008069]"
                          : "bg-[#f0f2f5] text-[#667781]",
                      ].join(" ")}
                    >
                      {contact.ai_enabled && !blocked
                        ? "AI auto-reply on"
                        : "AI off"}
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