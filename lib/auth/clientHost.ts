/** True when running in the password-protected private dashboard (browser). */
export function isPrivateDashboardBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  const configured = (
    process.env.NEXT_PUBLIC_PRIVATE_DASHBOARD_HOST || "private.artipilot.com"
  ).toLowerCase();
  return host === configured;
}
