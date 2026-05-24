"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard/inbox", label: "Inbox", shortLabel: "Inbox" },
  { href: "/dashboard/training", label: "AI Training", shortLabel: "Training" },
  {
    href: "/dashboard/quick-replies",
    label: "Quick Replies",
    shortLabel: "Replies",
  },
  { href: "/dashboard/settings", label: "Settings", shortLabel: "Settings" },
  { href: "/dashboard/status", label: "System Status", shortLabel: "Status" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#0b141a] text-[#e9edef]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-[#111b21] md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884]/15 text-base font-black text-[#00a884]">
              A
            </div>

            <div className="min-w-0">
              <p className="text-base font-black tracking-tight">Artipilot</p>
              <p className="text-xs text-[#8696a0]">Private WhatsApp AI</p>
            </div>
          </div>

          <span className="inline-flex rounded-full bg-[#00a884]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#00a884]">
            Private system
          </span>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-xl px-3 py-3 text-sm font-bold transition",
                  active
                    ? "bg-[#00a884]/15 text-[#00a884]"
                    : "text-[#8696a0] hover:bg-white/[0.06] hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/logout"
            prefetch={false}
            className="block rounded-xl px-3 py-3 text-sm font-bold text-[#8696a0] transition hover:bg-red-500/10 hover:text-red-300"
          >
            Log out
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#111b21] px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884]/15 text-sm font-black text-[#00a884]">
              A
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black">Artipilot</p>
              <p className="truncate text-[11px] text-[#8696a0]">
                Private WhatsApp AI
              </p>
            </div>
          </div>

          <Link
            href="/logout"
            prefetch={false}
            className="shrink-0 rounded-full bg-white/[0.06] px-3 py-2 text-xs font-bold text-[#8696a0] hover:bg-red-500/10 hover:text-red-300"
          >
            Log out
          </Link>
        </header>

        <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-[#111b21] px-2 py-2 md:hidden">
          {NAV.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "shrink-0 rounded-full px-3 py-2 text-xs font-black transition",
                  active
                    ? "bg-[#00a884]/15 text-[#00a884]"
                    : "bg-white/[0.04] text-[#8696a0] hover:bg-white/[0.08] hover:text-white",
                ].join(" ")}
              >
                {item.shortLabel}
              </Link>
            );
          })}
        </nav>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}