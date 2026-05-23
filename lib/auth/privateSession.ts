export {
  PRIVATE_SESSION_COOKIE,
  PRIVATE_SESSION_VALUE,
  hasPrivateSessionFromRequest,
  hasPrivateSessionFromServerCookies,
  unauthorizedJson,
} from "@/lib/auth/private-session";

import { PRIVATE_SESSION_VALUE } from "@/lib/auth/private-session";

export function isPrivateSessionCookie(value: string | undefined): boolean {
  return value === PRIVATE_SESSION_VALUE;
}
