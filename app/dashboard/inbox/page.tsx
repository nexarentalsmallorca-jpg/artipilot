import { redirect } from "next/navigation";
import { hasPrivateSessionServer } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const hasSession = await hasPrivateSessionServer();

  if (!hasSession) {
    redirect("/login");
  }

  redirect("/dashboard/inbox");
}