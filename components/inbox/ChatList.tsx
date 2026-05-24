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

function displayName(c: Contact) {
  return c.name || c.profile_name || c.phone;
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  onFilterChange: (f: Filter) => void;
  onSearchChange: (q: string) => void;
  onSelect: (id: string) => void;
}) {
  const q = search.trim().toLowerCase();

  const filtered = contacts.filter((c) => {
    if (filter === "unread" && !(c.unread_count > 0)) return false;
    if (filter === "ai_on" && !c.ai_enabled) return false;
    if (filter === "ai_off" && c.ai_enabled) return false;
    if (!q) return true;
    const name = displayName(c).toLowerCase();
    return name.includes(q) || c.phone.includes(q);
  });

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "ai_on", label: "AI On" },
    { id: "ai_off", label: "AI Off" },
  ];

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-[#111B21]">
      <div className="border-b border-white/10 p-3">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search chats"
          className="w-full rounded-lg border border-white/10 bg-[#0B141A] px-3 py-2 text-sm text-white outline-none focus:border-[#00A884]"
        />
        <div className="mt-2 flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={`rounded-full px-2.5 py-1 text-xs ${
                filter === f.id
                  ? "bg-[#00A884]/20 text-[#00A884]"
                  : "bg-white/5 text-[#8696A0]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-[#8696A0]">
            No conversations yet. When someone messages your WhatsApp Business
            number, they&apos;ll appear here.
          </p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`flex w-full items-start gap-3 border-b border-white/5 px-3 py-3 text-left transition hover:bg-white/5 ${
                selectedId === c.id ? "bg-[#00A884]/10" : ""
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00A884]/20 text-sm font-semibold text-[#00A884]">
                {displayName(c).slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-white">
                    {displayName(c)}
                  </span>
                  <span className="shrink-0 text-[10px] text-[#8696A0]">
                    {formatTime(c.last_message_at)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="truncate text-xs text-[#8696A0]">
                    {c.last_message || "No messages yet"}
                  </p>
                  {c.unread_count > 0 ? (
                    <span className="ml-auto shrink-0 rounded-full bg-[#00A884] px-1.5 py-0.5 text-[10px] font-bold text-black">
                      {c.unread_count}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${
                    c.ai_enabled
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/10 text-[#8696A0]"
                  }`}
                >
                  {c.ai_enabled ? "AI On" : "AI Off"}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
