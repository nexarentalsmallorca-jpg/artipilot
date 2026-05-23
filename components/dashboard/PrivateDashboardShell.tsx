import Link from "next/link";

const NAV = [
  { href: "/dashboard/inbox", label: "Home" },
  { href: "/dashboard/inbox/chats", label: "Inbox" },
  { href: "/dashboard/training", label: "Training" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function PrivateDashboardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0B141A] text-[#E9EDEF]">
      <header className="border-b border-white/10 bg-[#111B21]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#00A884]">
              Private
            </p>
            <h1 className="text-lg font-semibold sm:text-xl">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-[#8696A0]">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm text-[#8696A0] transition hover:bg-white/5 hover:text-[#E9EDEF]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/logout"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#8696A0] transition hover:border-red-500/30 hover:text-red-300"
            >
              Log out
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
