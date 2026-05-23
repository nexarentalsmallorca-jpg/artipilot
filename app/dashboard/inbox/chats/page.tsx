import { redirect } from "next/navigation";

export default function LegacyChatsRedirect() {
  redirect("/dashboard/inbox");
}
