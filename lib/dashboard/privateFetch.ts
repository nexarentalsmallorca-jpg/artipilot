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
  let message = "";

  try {
    const data = await response.clone().json();

    if (data?.error) {
      message = String(data.error);
    } else if (data?.message) {
      message = String(data.message);
    }
  } catch {
    try {
      message = await response.clone().text();
    } catch {
      message = "";
    }
  }

  if (response.status === 401) {
    return `${label} error: Unauthorized. Your private session cookie is missing or rejected. Log out, log in again, then refresh.`;
  }

  if (response.status === 403) {
    return `${label} error: Forbidden.`;
  }

  if (response.status === 404) {
    return `${label} error: API route not found.`;
  }

  if (message) {
    return `${label} error: ${message}`;
  }

  return `${label} error: Request failed with status ${response.status}.`;
}

export function privateApiErrorLabel(label: string, message: string) {
  return `${label} error: ${message}`;
}
