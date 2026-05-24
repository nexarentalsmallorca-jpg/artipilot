import { redirect } from "next/navigation";
import { hasPrivateSessionServer } from "@/lib/auth/server-session";
import { listContacts } from "@/lib/db/private-inbox";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import InboxClient from "./InboxClient";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  if (!(await hasPrivateSessionServer())) {
    redirect("/login");
  }

  let initialContacts: Awaited<ReturnType<typeof listContacts>> = [];

  if (isSupabaseConfigured()) {
    try {
      initialContacts = await listContacts();
    } catch {
      initialContacts = [];
    }
  }

  return <InboxClient initialContacts={initialContacts} />;
}
