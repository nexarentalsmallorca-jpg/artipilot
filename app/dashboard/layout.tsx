import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#071116] text-white">
      <header className="border-b border-white/10 bg-[#0b171d]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Private
            </p>
            <h1 className="text-xl font-bold">Artipilot Private WhatsApp Dashboard</h1>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
            <Link href="/dashboard/inbox" className="hover:text-white">
              Inbox
            </Link>
            <Link href="/dashboard/training" className="hover:text-white">
              Training
            </Link>
            <Link href="/dashboard/quick-replies" className="hover:text-white">
              Quick Replies
            </Link>
            <Link href="/dashboard/settings" className="hover:text-white">
              Settings
            </Link>
            <Link href="/dashboard/status" className="hover:text-white">
              Status
            </Link>
            <Link
              href="/logout"
              className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10"
            >
              Log out
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}
