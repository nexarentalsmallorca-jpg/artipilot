import Link from "next/link";
import PrivateDashboardShell from "@/components/dashboard/PrivateDashboardShell";

const CARDS = [
  {
    title: "Inbox",
    description: "WhatsApp conversations and AI replies",
    href: "/dashboard/inbox/chats",
  },
  {
    title: "Training",
    description: "Business knowledge for the AI assistant",
    href: "/dashboard/training",
  },
  {
    title: "Settings",
    description: "AI tone, rules, and dashboard preferences",
    href: "/dashboard/settings",
  },
  {
    title: "WhatsApp Status",
    description: "Connection and webhook health",
    href: "/dashboard/settings",
  },
];

export default function DashboardInboxPage() {
  return (
    <PrivateDashboardShell
      title="Artipilot Private WhatsApp Dashboard"
      subtitle="Private AI inbox system"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-2xl border border-white/10 bg-[#111B21] p-6 transition hover:border-[#00A884]/40 hover:bg-[#111B21]/80"
          >
            <h2 className="text-lg font-semibold text-[#E9EDEF]">{card.title}</h2>
            <p className="mt-2 text-sm text-[#8696A0]">{card.description}</p>
          </Link>
        ))}
      </div>
    </PrivateDashboardShell>
  );
}
