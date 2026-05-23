"use client";

import PushNotificationBox from "@/components/dashboard/PushNotificationBox";
import { cx, displayName, formatListTime, normalizePhone } from "@/lib/inbox/helpers";
import type { Contact, MobileFilter } from "@/lib/inbox/types";
import ContactAvatar from "./ContactAvatar";
import InboxIcon from "./InboxIcon";

type ChatListSidebarProps = {
  visible: boolean;
  isDark: boolean;
  userEmail: string | null;
  userAvatarUrl: string | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  mobileFilter: MobileFilter;
  onFilterChange: (filter: MobileFilter) => void;
  contactsCount: number;
  unreadCount: number;
  favoritesCount: number;
  humanCount: number;
  loading: boolean;
  loadError: string;
  localNotice: string;
  notificationsOpen: boolean;
  onNotificationsOpen: (open: boolean) => void;
  chatListMenuOpen: boolean;
  onChatListMenuOpen: (open: boolean) => void;
  onToggleTheme: () => void;
  onMarkAllRead: () => void;
  filteredContacts: Contact[];
  selectedPhone: string | null;
  onSelectContact: (contact: Contact) => void;
  isPinned: (contact: Contact) => boolean;
  isMuted: (contact: Contact) => boolean;
  isBlocked: (contact: Contact) => boolean;
  needsHuman: (contact: Contact) => boolean;
};

const FILTERS: [MobileFilter, string][] = [
  ["all", "All"],
  ["unread", "Unread"],
  ["favorites", "Favorites"],
  ["human", "Human"],
];

export default function ChatListSidebar({
  visible,
  isDark,
  userEmail,
  userAvatarUrl,
  searchValue,
  onSearchChange,
  mobileFilter,
  onFilterChange,
  contactsCount,
  unreadCount,
  favoritesCount,
  humanCount,
  loading,
  loadError,
  localNotice,
  notificationsOpen,
  onNotificationsOpen,
  chatListMenuOpen,
  onChatListMenuOpen,
  onToggleTheme,
  onMarkAllRead,
  filteredContacts,
  selectedPhone,
  onSelectContact,
  isPinned,
  isMuted,
  isBlocked,
  needsHuman,
}: ChatListSidebarProps) {
  const filterCounts: Record<MobileFilter, number> = {
    all: contactsCount,
    unread: unreadCount,
    favorites: favoritesCount,
    groups: 0,
    human: humanCount,
  };

  return (
    <aside
      className={cx(
        "flex h-full min-h-0 w-full flex-col border-[#E9EDEF] bg-white md:w-[32%] md:max-w-[420px] md:min-w-[300px] md:border-r",
        visible
          ? "absolute inset-0 z-10 flex md:relative md:inset-auto md:z-auto"
          : "hidden md:flex"
      )}
    >
      {/* Desktop header */}
      <header className="hidden h-[60px] shrink-0 items-center justify-between bg-[#F0F2F5] px-4 md:flex">
        <div className="flex min-w-0 items-center gap-3">
          <ContactAvatar contact={null} size={40} userAvatarUrl={userAvatarUrl} userEmail={userEmail} showAiBadge={false} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-[#111B21]">Artipilot Inbox</p>
            <p className="truncate text-[13px] text-[#667781]">{userEmail || "Business messaging"}</p>
          </div>
        </div>
        <div className="relative flex items-center gap-1 text-[#54656F]">
          <button type="button" onClick={onToggleTheme} className="rounded-full p-2 transition hover:bg-black/5" aria-label="Toggle theme">
            <InboxIcon name={isDark ? "sun" : "moon"} />
          </button>
          <button type="button" className="rounded-full p-2 transition hover:bg-black/5" aria-label="New chat">
            <InboxIcon name="newChat" />
          </button>
          <button
            type="button"
            onClick={() => onChatListMenuOpen(!chatListMenuOpen)}
            className="rounded-full p-2 transition hover:bg-black/5"
            aria-label="More options"
          >
            <InboxIcon name="dots" />
          </button>
          {chatListMenuOpen ? (
            <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-lg bg-white py-1 text-sm text-[#111B21] shadow-lg ring-1 ring-black/5">
              <button type="button" onClick={() => void onMarkAllRead()} className="block w-full px-4 py-2.5 text-left hover:bg-[#F5F6F6]">
                Mark all as read
              </button>
              <button type="button" onClick={() => onNotificationsOpen(true)} className="block w-full px-4 py-2.5 text-left hover:bg-[#F5F6F6]">
                Notifications
              </button>
              <button type="button" onClick={onToggleTheme} className="block w-full px-4 py-2.5 text-left hover:bg-[#F5F6F6]">
                Toggle theme
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Mobile header */}
      <header className="shrink-0 bg-white px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] md:hidden">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[32px] font-bold tracking-tight text-[#008069]">Chats</h1>
          <div className="relative flex items-center gap-4 text-[#54656F]">
            <button type="button" className="rounded-full p-1" aria-label="Camera">
              <InboxIcon name="camera" className="h-6 w-6" />
            </button>
            <button type="button" onClick={() => onChatListMenuOpen(!chatListMenuOpen)} className="rounded-full p-1" aria-label="Menu">
              <InboxIcon name="dots" className="h-6 w-6" />
            </button>
            {chatListMenuOpen ? (
              <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black/5">
                <button type="button" onClick={() => void onMarkAllRead()} className="block w-full px-4 py-3 text-left hover:bg-[#F5F6F6]">
                  Mark all as read
                </button>
                <button type="button" onClick={() => onNotificationsOpen(true)} className="block w-full px-4 py-3 text-left hover:bg-[#F5F6F6]">
                  Notifications
                </button>
                <button type="button" onClick={onToggleTheme} className="block w-full px-4 py-3 text-left hover:bg-[#F5F6F6]">
                  Theme
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <label className="flex h-[52px] items-center gap-3 rounded-xl bg-[#F0F2F5] px-4 text-[#54656F]">
          <InboxIcon name="search" className="h-5 w-5" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search conversations"
            className="w-full bg-transparent text-[16px] outline-none placeholder:text-[#667781]"
          />
        </label>
      </header>

      {/* Desktop search */}
      <div className="hidden shrink-0 px-3 py-2 md:block">
        <label className="flex h-9 items-center gap-3 rounded-lg bg-[#F0F2F5] px-3 text-[#54656F]">
          <InboxIcon name="search" className="h-4 w-4" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search or start new chat"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#667781]"
          />
        </label>
      </div>

      {/* Filters */}
      <div className="flex shrink-0 gap-2 overflow-x-auto px-3 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(([key, label]) => {
          const count = filterCounts[key];
          const active = mobileFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onFilterChange(key)}
              className={cx(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition",
                active
                  ? "bg-[#E7FCEB] text-[#008069] ring-1 ring-[#BFEBCB]"
                  : "bg-[#F0F2F5] text-[#54656F] hover:bg-[#E9EDEF]"
              )}
            >
              {label}
              {count > 0 && key !== "all" ? ` ${count}` : ""}
            </button>
          );
        })}
      </div>

      {notificationsOpen ? (
        <div className="mx-3 mb-2 shrink-0 rounded-xl border border-[#E9EDEF] bg-white p-2 shadow-sm">
          <PushNotificationBox compact />
          <button
            type="button"
            onClick={() => onNotificationsOpen(false)}
            className="mt-2 w-full rounded-lg bg-[#F0F2F5] py-2 text-xs font-semibold text-[#54656F]"
          >
            Close
          </button>
        </div>
      ) : null}

      {loadError ? (
        <div className="mx-3 mb-2 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{loadError}</div>
      ) : null}
      {localNotice ? (
        <div className="mx-3 mb-2 shrink-0 rounded-lg bg-[#E7FCEB] px-3 py-2 text-xs font-medium text-[#008069]">{localNotice}</div>
      ) : null}

      {/* Chat list */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-[#667781]">Loading conversations…</div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex h-32 items-center justify-center px-4 text-center text-sm text-[#667781]">
            No conversations match your search.
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const active = selectedPhone && normalizePhone(selectedPhone) === normalizePhone(contact.phone);
            const unread = Number(contact.unread_count || 0);
            const human = needsHuman(contact);

            return (
              <button
                key={contact.phone}
                type="button"
                onClick={() => onSelectContact(contact)}
                className={cx(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#F5F6F6]",
                  active && "bg-[#F0F2F5]"
                )}
              >
                <ContactAvatar contact={contact} size={49} />
                <div className="min-w-0 flex-1 border-b border-[#F0F2F5] py-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[16px] font-medium text-[#111B21]">{displayName(contact)}</span>
                    <span className={cx("shrink-0 text-[12px]", unread > 0 ? "font-semibold text-[#008069]" : "text-[#667781]")}>
                      {formatListTime(contact.last_message_at || contact.created_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <p className="min-w-0 flex-1 truncate text-[14px] text-[#667781]">
                      {isPinned(contact) ? "📌 " : ""}
                      {isMuted(contact) ? "🔕 " : ""}
                      {isBlocked(contact) ? "🚫 " : ""}
                      {contact.last_message || "No messages yet"}
                    </p>
                    {human ? (
                      <span className="shrink-0 rounded-full bg-[#FFECDC] px-2 py-0.5 text-[10px] font-bold text-[#C76A00]">
                        Human
                      </span>
                    ) : null}
                    {unread > 0 ? (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[11px] font-bold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
