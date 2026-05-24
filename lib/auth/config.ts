import {
  getPrivateDashboardHost,
  isPrivateHostname,
  isPublicHostname,
  isVercelPreviewHostname,
} from "@/lib/auth/host";

export { getPrivateDashboardHost, isPrivateHostname, isPublicHostname };

export function normalizeHost(hostHeader: string | null): string {
  const raw = (hostHeader || "").split(",")[0]?.trim().toLowerCase() || "";
  return raw.split(":")[0] || "";
}

export function isPublicHost(host: string): boolean {
  return isPublicHostname(host);
}

export function isPrivateHost(host: string): boolean {
  return isPrivateHostname(host);
}

export function isVercelPreviewHost(host: string): boolean {
  return isVercelPreviewHostname(host);
}

/** Private + preview hosts use dashboard auth rules in middleware. */
export function isDashboardHost(host: string): boolean {
  return isPrivateHost(host) || isVercelPreviewHost(host);
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  return getAdminEmails().includes(normalized);
}

export const PUBLIC_ONLY_PATHS = new Set(["/"]);

export const PRIVATE_PUBLIC_PATHS = new Set([
  "/login",
  "/access-denied",
  "/auth/callback",
]);

export const BLOCKED_ON_PUBLIC_PATH_PREFIXES = [
  "/dashboard",
  "/signup",
  "/setup",
  "/login",
  "/access-denied",
  "/api/inbox",
  "/api/ai-training",
  "/api/workspace",
  "/api/demo-inbox",
  "/api/notifications",
  "/api/meta",
];
