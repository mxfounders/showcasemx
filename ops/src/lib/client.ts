'use client';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public data?: unknown,
  ) {
    super(message);
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Internal: set on the single retry after a step-up so it can't loop. */
  afterElevation?: boolean;
}

/**
 * Asks the ElevationDialog (mounted once in the panel shell) for a TOTP code.
 * Resolves true once the session is elevated, false if the operator cancelled.
 */
export function requestElevation(reason?: string): Promise<boolean> {
  return new Promise(resolve => {
    window.dispatchEvent(new CustomEvent('ops:elevate', { detail: { resolve, reason } }));
  });
}

/**
 * JSON fetch for panel APIs. A 403 `elevation_required` transparently opens the
 * step-up dialog and retries once; a 401 means the session died, so the whole
 * page goes back to the login.
 */
export async function api<T = Record<string, unknown>>(
  url: string,
  options: ApiOptions = {},
): Promise<T> {
  const method = options.method ?? (options.body !== undefined ? 'POST' : 'GET');
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: options.signal,
      headers:
        method === 'GET'
          ? { Accept: 'application/json' }
          : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('No se pudo conectar. Revisa tu conexión.', 0, 'network');
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (response.status === 401) {
    window.location.assign('/login?reason=expired');
    throw new ApiError('Tu sesión terminó.', 401, 'unauthenticated');
  }
  if (response.status === 403 && data.code === 'elevation_required' && !options.afterElevation) {
    const granted = await requestElevation();
    if (granted) return api<T>(url, { ...options, afterElevation: true });
    throw new ApiError(
      'Necesitas confirmar tu identidad para esta acción.',
      403,
      'elevation_cancelled',
    );
  }
  if (!response.ok || data.ok === false)
    throw new ApiError(
      typeof data.error === 'string' ? data.error : 'Algo salió mal. Intenta de nuevo.',
      response.status,
      typeof data.code === 'string' ? data.code : undefined,
      data,
    );
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Algo salió mal.';
}
