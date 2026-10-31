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

/** Shown when /api isn't answered by the GoLinks server (e.g. a static-only host, or the server is down). */
export const SERVER_UNREACHABLE_MESSAGE =
  "Can't reach the GoLinks server. This address only serves the web pages, so signing in and saving links won't work here.";

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

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method: options.method || 'GET',
      headers,
      credentials: API_BASE ? 'include' : 'same-origin',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, SERVER_UNREACHABLE_MESSAGE);
  }

  // The GoLinks server always answers /api with JSON (or an empty 204). Anything else, such as an
  // HTML page or a hosting provider's own error, means the request never reached it.
  const isJson = (res.headers.get('content-type') || '').includes('application/json');

  if (res.status === 401 && !options.silentAuth) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (options.raw && res.ok) return (await res.text()) as T;
  if (res.ok && res.status !== 204 && !isJson) throw new ApiError(0, SERVER_UNREACHABLE_MESSAGE);

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  const serverError =
    isJson && data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
      ? (data as { error: string }).error
      : '';

  if (!res.ok && !options.allowStatus?.includes(res.status)) {
    if (!serverError) {
      // Not our error format: a proxy or host answered instead of the GoLinks server.
      throw new ApiError(0, SERVER_UNREACHABLE_MESSAGE, data);
    }
    throw new ApiError(res.status, serverError, data);
  }

  return data as T;
}
