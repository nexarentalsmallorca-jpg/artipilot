export async function fetchPrivateApi(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});

  return fetch(input, {
    ...init,
    credentials: "include",
    cache: init.cache || "no-store",
    headers,
  });
}

export async function parsePrivateApiError(
  label: string,
  response: Response
): Promise<string> {
  try {
    const data = await response.json();

    if (data?.error) {
      return `${label} error: ${String(data.error)}`;
    }

    if (data?.message) {
      return `${label} error: ${String(data.message)}`;
    }
  } catch {
    // ignore JSON parse errors
  }

  if (response.status === 401) {
    return `${label} error: Unauthorized. Please refresh and log in again.`;
  }

  if (response.status === 403) {
    return `${label} error: Forbidden. Your private session is not accepted.`;
  }

  if (response.status === 404) {
    return `${label} error: API route not found.`;
  }

  if (response.status >= 500) {
    return `${label} error: Server error ${response.status}.`;
  }

  return `${label} error: Request failed with status ${response.status}.`;
}

export function privateApiErrorLabel(label: string, message: string) {
  return `${label} error: ${message}`;
}