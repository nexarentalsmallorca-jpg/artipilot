"use client";

import Link from "next/link";
import { cx } from "@/lib/inbox/helpers";
import InboxIcon from "./InboxIcon";
import type { IconName } from "@/lib/inbox/types";

const TABS: { label: string; icon: IconName; href: string; active?: boolean }[] = [
  { label: "Chats", icon: "inbox", href: "/dashboard/inbox/chats", active: true },
  { label: "Training", icon: "training", href: "/dashboard/training" },
  { label: "Replies", icon: "whatsapp", href: "/dashboard/quick-replies" },
  { label: "Settings", icon: "settings", href: "/dashboard/settings" },
];

export default function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid h-[calc(64px+env(safe-area-inset-bottom))] grid-cols-4 border-t border-[#E9EDEF] bg-white px-1 pb-[env(safe-area-inset-bottom)] pt-1 md:hidden">
      {TABS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#54656F]"
        >
          <span
            className={cx(
              "flex items-center justify-center rounded-full px-4 py-1.5",
              item.active ? "bg-[#E7FCEB] text-[#008069]" : "text-[#111B21]"
            )}
          >
            <InboxIcon name={item.icon} className="h-6 w-6" />
          </span>
          <span className={item.active ? "text-[#008069]" : ""}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
