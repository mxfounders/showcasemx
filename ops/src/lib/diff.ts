// Field-level and word-level diff between the published snapshot and the draft,
// so a reviewer reads exactly what an update changes.

export type DiffToken = { text: string; kind: 'same' | 'added' | 'removed' };

function tokens(text: string): string[] {
  return text.split(/(\s+)/).filter(part => part.length > 0);
}

/** Word diff via LCS; falls back to whole-block replace for very long texts. */
export function wordDiff(before: string, after: string): DiffToken[] {
  const a = tokens(before);
  const b = tokens(after);
  if (a.length * b.length > 250_000) {
    return [
      ...(before ? [{ text: before, kind: 'removed' as const }] : []),
      ...(after ? [{ text: after, kind: 'added' as const }] : []),
    ];
  }
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffToken[] = [];
  const push = (text: string, kind: DiffToken['kind']) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(a[i], 'same');
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push(a[i++], 'removed');
    else push(b[j++], 'added');
  }
  while (i < a.length) push(a[i++], 'removed');
  while (j < b.length) push(b[j++], 'added');
  return out;
}

export interface FieldChange {
  key: string;
  label: string;
  kind: 'text' | 'list' | 'other';
  before: unknown;
  after: unknown;
  added?: string[];
  removed?: string[];
}

function stable(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value) && value.length === 0) return '[]';
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)))
      : v,
  );
}

export function fieldChanges(
  published: Record<string, unknown> | null,
  draft: Record<string, unknown>,
  labels: Record<string, string>,
): FieldChange[] {
  if (!published) return [];
  const keys = Array.from(new Set([...Object.keys(published), ...Object.keys(draft)]));
  const changes: FieldChange[] = [];
  for (const key of keys) {
    const before = published[key];
    const after = draft[key];
    if (stable(before) === stable(after)) continue;
    const label = labels[key] ?? key;
    const isStringList = (v: unknown) =>
      Array.isArray(v) && v.every(item => typeof item === 'string');
    if (
      (typeof before === 'string' || before === undefined) &&
      (typeof after === 'string' || after === undefined)
    ) {
      changes.push({ key, label, kind: 'text', before: before ?? '', after: after ?? '' });
    } else if (
      (isStringList(before) || before === undefined) &&
      (isStringList(after) || after === undefined)
    ) {
      const b = (before as string[] | undefined) ?? [];
      const a = (after as string[] | undefined) ?? [];
      changes.push({
        key,
        label,
        kind: 'list',
        before,
        after,
        added: a.filter(item => !b.includes(item)),
        removed: b.filter(item => !a.includes(item)),
      });
    } else changes.push({ key, label, kind: 'other', before, after });
  }
  return changes;
}
