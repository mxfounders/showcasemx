export type Application = { name: string; website: string; email: string; kind: string; problem: string };
export function validateApplication(value: unknown): Application | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const limits = { name: 100, website: 500, email: 254, kind: 20, problem: 1500 };
  const result: Record<string, string> = {};
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof input[key] !== "string") return null;
    const text = input[key].trim();
    if (!text || text.length > limit) return null;
    result[key] = text;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || !["Software", "Agencia", "Servicio"].includes(result.kind) || result.problem.length < 20) return null;
  try {
    const url = new URL(result.website);
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) return null;
    result.website = url.href;
  } catch { return null; }
  return result as Application;
}
