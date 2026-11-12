/**
 * What a founder types as their website ("tuproyecto.com") as a full URL
 * ("https://tuproyecto.com/"), or null when it cannot be a public website.
 * Client-safe: the server still validates with safeSolutionUrl and the SSRF checks.
 */
export function normalizeWebsite(raw: string) {
  const value = raw.trim();
  if (!value || value.length > 480) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!url.hostname.includes('.') || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}
