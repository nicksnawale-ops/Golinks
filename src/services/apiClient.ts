/** Fired when the session has expired, so the app can show the sign-in screen. */
export const UNAUTHORIZED_EVENT = 'golinks:unauthorized';

/** Same-origin by default; override with VITE_API_BASE_URL if the API lives elsewhere. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export function buildQuery(params?: QueryParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * fetch() wrapper: sends the session cookie, parses JSON, and throws ApiError with the
 * server's error message on non-2xx responses (unless the status is listed in allowStatus).
 * A 401 also fires UNAUTHORIZED_EVENT (unless silentAuth), which sends the user to sign-in.
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; allowStatus?: number[]; raw?: boolean; silentAuth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}/api${path}`, {
    method: options.method || 'GET',
    headers,
    credentials: API_BASE ? 'include' : 'same-origin',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && !options.silentAuth) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (options.raw && res.ok) return (await res.text()) as T;

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok && !options.allowStatus?.includes(res.status)) {
    const serverError =
      data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : '';
    const message = serverError || `Request failed (${res.status} ${res.statusText})`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}
