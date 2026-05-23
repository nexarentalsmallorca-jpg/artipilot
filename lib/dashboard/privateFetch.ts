/** Relative private-dashboard API fetch (cookie session only). */
export function fetchPrivateApi(
  path: string,
  init: RequestInit & { method?: string } = {}
): Promise<Response> {
  if (!path.startsWith("/")) {
    throw new Error(`Private API path must be relative: ${path}`);
  }
  if (/^https?:\/\//i.test(path)) {
    throw new Error("Private API calls must not use absolute URLs");
  }

  const method = (init.method || "GET").toUpperCase();

  return fetch(path, {
    ...init,
    method,
    credentials: "include",
    cache: method === "GET" ? "no-store" : init.cache,
  });
}

export function privateApiErrorLabel(
  source: string,
  message?: string | null,
  status?: number
): string {
  const detail =
    (message && String(message).trim()) ||
    (status === 401 ? "Unauthorized" : status ? `HTTP ${status}` : "Request failed");

  const prefix = `${source} error:`;
  if (detail.toLowerCase().startsWith(prefix.toLowerCase())) {
    return detail;
  }
  return `${prefix} ${detail}`;
}

export async function parsePrivateApiError(
  source: string,
  res: Response
): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return privateApiErrorLabel(source, data.error, res.status);
}
