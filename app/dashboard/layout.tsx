import DashboardLogoutButton from "@/components/dashboard/DashboardLogoutButton";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <DashboardLogoutButton />
    </>
  );
}