// Mirrors deviceLabel() in the product (src/lib/auth/session.ts) so an account
// sees the same wording for a device in both places.
export function deviceLabel(userAgent: string | null | undefined): string {
  const value = (userAgent ?? '').slice(0, 300);
  if (!value) return 'Dispositivo desconocido';
  const browser = /Edg\//.test(value)
    ? 'Edge'
    : /OPR\/|Opera/.test(value)
      ? 'Opera'
      : /Firefox\//.test(value)
        ? 'Firefox'
        : /Chrome\//.test(value)
          ? 'Chrome'
          : /Safari\//.test(value)
            ? 'Safari'
            : 'Navegador';
  const platform = /iPhone|iPad|iPod/.test(value)
    ? 'iOS'
    : /Android/.test(value)
      ? 'Android'
      : /Mac OS X|Macintosh/.test(value)
        ? 'macOS'
        : /Windows/.test(value)
          ? 'Windows'
          : /Linux/.test(value)
            ? 'Linux'
            : 'sistema desconocido';
  return `${browser} en ${platform}`;
}

export function readUserAgent(headers: Headers): string | null {
  return headers.get('user-agent')?.slice(0, 300) ?? null;
}
