import { cookies } from "next/headers";
import {
  PRIVATE_SESSION_COOKIE,
  PRIVATE_SESSION_VALUE,
} from "@/lib/auth/private-session";

export async function hasPrivateSessionServer() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(PRIVATE_SESSION_COOKIE)?.value;

  return sessionValue === PRIVATE_SESSION_VALUE;
}

export async function assertPrivateSessionServer() {
  const isValid = await hasPrivateSessionServer();

  if (!isValid) {
    throw new Error("Unauthorized. Please log in again to Artipilot private inbox.");
  }

  return true;
}