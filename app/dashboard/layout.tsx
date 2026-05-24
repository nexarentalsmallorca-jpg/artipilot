import ClearLegacyServiceWorker from "@/components/dashboard/ClearLegacyServiceWorker";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <ClearLegacyServiceWorker />
      {children}
    </DashboardShell>
  );
}
