export const PUBLIC_HOSTS = new Set(["artipilot.com", "www.artipilot.com"]);

export const PRIVATE_HOST = "private.artipilot.com";

const LOCAL_PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function normalizeHost(hostHeader: string | null): string {
  const raw = (hostHeader || "").split(",")[0]?.trim().toLowerCase() || "";
  return raw.split(":")[0] || "";
}

export function isPublicHost(host: string): boolean {
  return PUBLIC_HOSTS.has(host);
}

export function isPrivateHost(host: string): boolean {
  if (host === PRIVATE_HOST) return true;
  if (process.env.ALLOW_LOCAL_PRIVATE === "true" && LOCAL_PRIVATE_HOSTS.has(host)) {
    return true;
  }
  return false;
}

export function isVercelPreviewHost(host: string): boolean {
  return host.endsWith(".vercel.app");
}

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

export function getExtraPassword(): string | null {
  const value = process.env.SITE_EXTRA_PASSWORD?.trim();
  return value || null;
}

export const PUBLIC_ONLY_PATHS = new Set(["/"]);

export const PRIVATE_PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/access-denied",
  "/auth/callback",
]);

export const BLOCKED_ON_PUBLIC_PATH_PREFIXES = [
  "/dashboard",
  "/signup",
  "/setup",
  "/api/inbox",
  "/api/ai-training",
  "/api/workspace",
  "/api/demo-inbox",
  "/api/notifications",
  "/api/meta",
];
