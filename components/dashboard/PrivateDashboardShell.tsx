"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/inbox/helpers";

const NAV = [
  { href: "/dashboard/inbox", label: "Inbox" },
  { href: "/dashboard/training", label: "Training" },
  { href: "/dashboard/quick-replies", label: "Quick replies" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function PrivateDashboardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0B141A] text-[#E9EDEF]">
      <header className="border-b border-white/10 bg-[#111B21]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#00A884]">Private</p>
            <h1 className="text-lg font-semibold sm:text-xl">{title}</h1>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "rounded-lg px-3 py-2 text-sm transition",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-[#00A884]/15 text-[#00A884]"
                    : "text-[#8696A0] hover:bg-white/5 hover:text-[#E9EDEF]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
