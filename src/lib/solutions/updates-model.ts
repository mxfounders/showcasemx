import { isSolutionId, safeSolutionUrl } from './model';

/**
 * Pure side of SHCWS-24 (dated updates on a listing): kinds, limits and validation, shared
 * by the API route, the server queries and the founder's form.
 */
export const solutionUpdateKinds = ['feature', 'pricing', 'integration', 'case', 'other'] as const;
export type SolutionUpdateKind = (typeof solutionUpdateKinds)[number];

/** At most this many updates per listing in any seven days, so following stays worth it. */
export const updatesPerWeek = 4;

export type SolutionUpdate = {
  id: string;
  kind: SolutionUpdateKind;
  body: string;
  link: string | null;
  createdAt: string;
  /** Only in the founder's own list: why ops hid it. Hidden updates never reach anyone else. */
  hiddenReason?: string;
};

export type UpdateInput = {
  id: string;
  kind: SolutionUpdateKind;
  body: string;
  link: string | null;
};

/** Validates a founder's update. Null when anything is off; the route answers one message. */
export function readUpdateInput(value: unknown): UpdateInput | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (typeof input.id !== 'string' || !isSolutionId(input.id)) return null;
  if (!solutionUpdateKinds.includes(input.kind as SolutionUpdateKind)) return null;
  if (typeof input.body !== 'string') return null;
  const body = input.body.trim().replace(/\s+\n/g, '\n');
  if (body.length < 10 || body.length > 500) return null;
  let link: string | null = null;
  if (typeof input.link === 'string' && input.link.trim()) {
    const candidate = input.link.trim();
    link = candidate.length <= 500 ? safeSolutionUrl(candidate) : null;
    if (!link || link.length > 500) return null;
  }
  return { id: input.id, kind: input.kind as SolutionUpdateKind, body, link };
}
