import type { NextRequest } from "next/server";

/** Canonical private dashboard hostname (no port). */
export function getPrivateDashboardHost(): string {
  return (
    process.env.PRIVATE_DASHBOARD_HOST?.trim().toLowerCase() ||
    "private.artipilot.com"
  );
}

export const PUBLIC_HOSTNAMES = ["artipilot.com", "www.artipilot.com"] as const;

/**
 * Resolve the request hostname from Vercel/proxy headers.
 * `x-forwarded-host` is preferred; falls back to `host`.
 */
export function resolveHostname(
  hostHeader: string | null,
  forwardedHostHeader?: string | null
): string {
  const raw =
    forwardedHostHeader?.split(",")[0]?.trim() ||
    hostHeader?.split(",")[0]?.trim() ||
    "";
  return raw.split(":")[0].toLowerCase();
}

export function resolveHostnameFromRequest(request: NextRequest): string {
  return resolveHostname(
    request.headers.get("host"),
    request.headers.get("x-forwarded-host") ||
      request.headers.get("x-vercel-forwarded-host")
  );
}

export function resolveHostnameFromHeaders(headers: Headers): string {
  return resolveHostname(
    headers.get("host"),
    headers.get("x-forwarded-host") || headers.get("x-vercel-forwarded-host")
  );
}

export function isPublicHostname(hostname: string): boolean {
  return (PUBLIC_HOSTNAMES as readonly string[]).includes(hostname);
}

export function isPrivateHostname(hostname: string): boolean {
  const privateHost = getPrivateDashboardHost();
  if (hostname === privateHost) return true;

  if (process.env.ALLOW_LOCAL_PRIVATE === "true") {
    return hostname === "localhost" || hostname === "127.0.0.1";
  }

  return false;
}

export function isVercelPreviewHostname(hostname: string): boolean {
  return hostname.endsWith(".vercel.app");
}
