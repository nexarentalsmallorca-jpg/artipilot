"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard/inbox", label: "Inbox" },
  { href: "/dashboard/training", label: "Training" },
  { href: "/dashboard/quick-replies", label: "Quick Replies" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/status", label: "Status" },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#0B141A] text-[#E9EDEF]">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-[#111B21] md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <span className="inline-block rounded-full bg-[#00A884]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00A884]">
            Private
          </span>
          <p className="mt-2 text-lg font-semibold">Artipilot</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#00A884]/15 text-[#00A884]"
                    : "text-[#8696A0] hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Link
            href="/logout"
            className="block rounded-lg px-3 py-2.5 text-sm text-[#8696A0] hover:bg-red-500/10 hover:text-red-300"
          >
            Log out
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#111B21] px-4 py-3 md:hidden">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#00A884]">
              Private
            </span>
            <p className="text-sm font-semibold">Artipilot</p>
          </div>
          <Link href="/logout" className="text-sm text-[#8696A0]">
            Log out
          </Link>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-white/10 bg-[#111B21] px-2 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs ${
                pathname === item.href
                  ? "bg-[#00A884]/15 text-[#00A884]"
                  : "text-[#8696A0]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
