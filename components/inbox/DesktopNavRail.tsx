"use client";

import Image from "next/image";
import Link from "next/link";
import { NAV_ITEMS, cx } from "@/lib/inbox/helpers";
import InboxIcon from "./InboxIcon";

type DesktopNavRailProps = {
  unreadCount: number;
  isDark: boolean;
  userAvatarUrl: string | null;
  onToggleTheme: () => void;
  onOpenNotifications: () => void;
};

export default function DesktopNavRail({
  unreadCount,
  isDark,
  userAvatarUrl,
  onToggleTheme,
  onOpenNotifications,
}: DesktopNavRailProps) {
  return (
    <nav className="flex w-[68px] shrink-0 flex-col items-center justify-between bg-[#F0F2F5] py-3 text-[#54656F]">
      <div className="flex flex-col items-center gap-1">
        <button type="button" className="mb-2 rounded-full p-2.5 transition hover:bg-black/5" aria-label="Menu">
          <InboxIcon name="menu" />
        </button>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cx(
              "relative rounded-full p-2.5 transition hover:bg-black/5",
              item.icon === "inbox" && "bg-[#D9FDD3] text-[#008069]"
            )}
          >
            <InboxIcon name={item.icon} />
            {item.icon === "inbox" && unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#25D366] px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onOpenNotifications}
          title="Notifications"
          className="rounded-full p-2.5 transition hover:bg-black/5"
        >
          <InboxIcon name="bell" />
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          title="Theme"
          className="rounded-full p-2.5 transition hover:bg-black/5"
        >
          <InboxIcon name={isDark ? "sun" : "moon"} />
        </button>
        <div className="mt-1 overflow-hidden rounded-full ring-2 ring-white">
          {userAvatarUrl ? (
            <Image src={userAvatarUrl} alt="Account" width={36} height={36} className="h-9 w-9 object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center bg-[#008069] text-[10px] font-bold text-white">AP</div>
          )}
        </div>
      </div>
    </nav>
  );
}
