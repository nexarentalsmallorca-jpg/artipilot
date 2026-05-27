import { listContacts, type ApiContact } from "@/lib/db/private-inbox";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import InboxClient from "./InboxClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InboxPage() {
  let initialContacts: ApiContact[] = [];

  if (isSupabaseConfigured()) {
    try {
      initialContacts = await listContacts();
    } catch (error) {
      console.error("[ARTIPILOT_INBOX_PAGE] Failed to load contacts:", error);
      initialContacts = [];
    }
  }

  return <InboxClient initialContacts={initialContacts} />;
}