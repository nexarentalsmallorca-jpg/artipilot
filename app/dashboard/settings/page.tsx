import PrivateDashboardShell from "@/components/dashboard/PrivateDashboardShell";

export default function SettingsPage() {
  return (
    <PrivateDashboardShell title="Settings">
      <div className="rounded-2xl border border-white/10 bg-[#111B21] p-6">
        <p className="text-[#8696A0]">Private dashboard settings.</p>
      </div>
    </PrivateDashboardShell>
  );
}
