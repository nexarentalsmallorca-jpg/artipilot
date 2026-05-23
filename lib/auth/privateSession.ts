export const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
export const PRIVATE_SESSION_VALUE = "authenticated";

export function isPrivateSessionCookie(value: string | undefined): boolean {
  return value === PRIVATE_SESSION_VALUE;
}
