import { cookies } from "next/headers";
import {
  PRIVATE_SESSION_COOKIE,
  PRIVATE_SESSION_VALUE,
} from "@/lib/auth/private-session";

export async function hasPrivateSessionServer() {
  const cookieStore = await cookies();
  return (
    cookieStore.get(PRIVATE_SESSION_COOKIE)?.value === PRIVATE_SESSION_VALUE
  );
}

export async function assertPrivateSessionServer() {
  if (!(await hasPrivateSessionServer())) {
    throw new Error("Unauthorized");
  }
}
