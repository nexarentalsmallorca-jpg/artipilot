export {
  PRIVATE_SESSION_COOKIE,
  PRIVATE_SESSION_VALUE,
  hasPrivateSessionFromCookies,
  hasPrivateSessionFromRequest,
  privateUnauthorizedResponse,
} from "@/lib/auth/private-session";

import { PRIVATE_SESSION_VALUE } from "@/lib/auth/private-session";

/** @deprecated Use hasPrivateSessionFromRequest */
export function isPrivateSessionCookie(value: string | undefined): boolean {
  return value === PRIVATE_SESSION_VALUE;
}
