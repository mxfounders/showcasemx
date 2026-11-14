import { getDb } from '../db';
import { iso, isoRequired } from '../http';
import { deviceLabel } from '../device';
import {
  detectFraud,
  isSignalCode,
  targetKey,
  type FraudReport,
  type Interaction,
  type InteractionKind,
  type SignalCode,
  type TargetType,
} from '../fraud';

/**
 * Data for /panel/fraude (SHCWS-141). Reads likes, comments and reviews on listings and
 * likes, saves and comments on public lists, never buyer_saved_projects (which listing a
 * buyer saved is private, §68) and never notes, list purposes or contact contents (§44).
 */
export const FRAUD_WINDOWS = ['7', '30', '90'] as const;
export type FraudWindow = (typeof FRAUD_WINDOWS)[number];

const MAX_INTERACTIONS = 20000;

export interface FraudAccountInfo {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  verified: boolean;
  suspended: boolean;
  isOps: boolean;
  flaggedAt: string | null;
  devices: string[];
}

export interface FraudTargetInfo {
  key: string;
  type: TargetType;
  id: string;
  name: string;
  href: string;
  live: boolean;
}

export interface FlagRow {
  id: string;
  accountId: string;
  email: string | null;
  reason: string;
  signals: SignalCode[];
  target: { name: string; href: string } | null;
  flaggedAt: string;
  flaggedBy: string | null;
  clearedAt: string | null;
  clearedBy: string | null;
  clearedReason: string | null;
}

export interface FraudBoard {
  available: boolean;
  days: number;
  truncated: boolean;
  totals: { interactions: number; accounts: number; targets: number };
  report: FraudReport;
  accounts: Record<string, FraudAccountInfo>;
  targets: Record<string, FraudTargetInfo>;
  flags: FlagRow[];
  history: FlagRow[];
}

function flagRow(row: Record<string, unknown>): FlagRow {
  const name = row.target_name ? String(row.target_name) : null;
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    email: row.email ? String(row.email) : null,
    reason: String(row.reason),
    signals: Array.isArray(row.signals) ? row.signals.filter(isSignalCode) : [],
    target:
      row.target_type && row.target_id
        ? {
            name: name ?? '(eliminada)',
            href:
              row.target_type === 'solution'
                ? `/panel/postulaciones/${String(row.target_id)}`
                : `/panel/comunidad?q=${encodeURIComponent(name ?? '')}`,
          }
        : null,
    flaggedAt: isoRequired(row.flagged_at),
    flaggedBy: row.flagged_by_email ? String(row.flagged_by_email) : null,
    clearedAt: iso(row.cleared_at),
    clearedBy: row.cleared_by_email ? String(row.cleared_by_email) : null,
    clearedReason: row.cleared_reason ? String(row.cleared_reason) : null,
  };
}

const FLAG_SELECT = `SELECT f.id, f.account_id, a.email, f.reason, f.signals, f.target_type, f.target_id,
    CASE f.target_type WHEN 'solution' THEN (SELECT COALESCE(s.published_data->>'name', s.data->>'name')
      FROM founder_solutions s WHERE s.id = f.target_id)
    WHEN 'list' THEN (SELECT l.name FROM buyer_lists l WHERE l.id = f.target_id) END AS target_name,
    f.flagged_at, fb.email AS flagged_by_email, f.cleared_at, cb.email AS cleared_by_email, f.cleared_reason
  FROM account_flags f
  LEFT JOIN auth_accounts a ON a.id = f.account_id
  LEFT JOIN auth_accounts fb ON fb.id = f.flagged_by
  LEFT JOIN auth_accounts cb ON cb.id = f.cleared_by`;

export async function fraudBoard(window: FraudWindow): Promise<FraudBoard> {
  const sql = getDb();
  const days = Number(window);
  const [[table], rows] = await sql.transaction(
    [
      sql`SELECT to_regclass('account_flags') IS NOT NULL AS ok`,
      sql`
        SELECT kind, target_type, target_id, account_id, at FROM (
          SELECT 'like' AS kind, 'solution' AS target_type, solution_id AS target_id, owner_id AS account_id, created_at AS at
            FROM solution_likes WHERE created_at > now() - make_interval(days => ${days}::int)
          UNION ALL
          SELECT 'comment', 'solution', solution_id, author_id, created_at
            FROM solution_comments WHERE created_at > now() - make_interval(days => ${days}::int)
          UNION ALL
          SELECT 'review', 'solution', solution_id, author_id, created_at
            FROM solution_reviews WHERE created_at > now() - make_interval(days => ${days}::int)
          UNION ALL
          SELECT 'list_like', 'list', list_id, owner_id, created_at
            FROM community_list_likes WHERE created_at > now() - make_interval(days => ${days}::int)
          UNION ALL
          SELECT 'list_save', 'list', list_id, owner_id, created_at
            FROM community_saved_lists WHERE created_at > now() - make_interval(days => ${days}::int)
          UNION ALL
          SELECT 'list_comment', 'list', list_id, author_id, created_at
            FROM community_list_comments WHERE created_at > now() - make_interval(days => ${days}::int)
        ) i ORDER BY at DESC LIMIT ${MAX_INTERACTIONS + 1}
      `,
    ],
    { readOnly: true },
  );
  const available = Boolean(table?.ok);
  const truncated = rows.length > MAX_INTERACTIONS;
  const interactions: Interaction[] = rows.slice(0, MAX_INTERACTIONS).map(row => ({
    kind: String(row.kind) as InteractionKind,
    targetType: String(row.target_type) as TargetType,
    targetId: String(row.target_id),
    accountId: String(row.account_id),
    at: isoRequired(row.at),
  }));
  const accountIds = [...new Set(interactions.map(i => i.accountId))];
  const solutionIds = [
    ...new Set(interactions.filter(i => i.targetType === 'solution').map(i => i.targetId)),
  ];
  const listIds = [
    ...new Set(interactions.filter(i => i.targetType === 'list').map(i => i.targetId)),
  ];

  const [accountRows, agentRows, solutionRows, listRows, flagRows, historyRows] =
    await sql.transaction(
      [
        sql`
          SELECT a.id, a.email, a.name, a.created_at, a.email_verified_at IS NOT NULL AS verified,
            a.suspended_at IS NOT NULL AS suspended,
            EXISTS (SELECT 1 FROM solution_reviewers r WHERE r.account_id = a.id AND r.disabled_at IS NULL) AS is_ops
          FROM auth_accounts a WHERE a.id = ANY(${accountIds}::uuid[])
        `,
        // Sessions are the only place a user agent is kept (no IP, §49). Expired ones still
        // count: the browser that created an account is what matters here.
        sql`
          SELECT account_id, array_agg(DISTINCT user_agent) AS agents FROM auth_sessions
          WHERE account_id = ANY(${accountIds}::uuid[]) AND user_agent IS NOT NULL AND user_agent <> ''
          GROUP BY account_id
        `,
        sql`
          SELECT id, owner_id, COALESCE(NULLIF(published_data->>'name', ''), NULLIF(data->>'name', ''), '(sin nombre)') AS name,
            published_data IS NOT NULL AS live
          FROM founder_solutions WHERE id = ANY(${solutionIds}::uuid[])
        `,
        sql`
          SELECT id, owner_id, name, visibility = 'public' AS live
          FROM buyer_lists WHERE id = ANY(${listIds}::uuid[])
        `,
        available
          ? sql(`${FLAG_SELECT} WHERE f.cleared_at IS NULL ORDER BY f.flagged_at DESC LIMIT 500`)
          : sql`SELECT NULL WHERE false`,
        available
          ? sql(`${FLAG_SELECT} WHERE f.cleared_at IS NOT NULL ORDER BY f.cleared_at DESC LIMIT 50`)
          : sql`SELECT NULL WHERE false`,
      ],
      { readOnly: true },
    );

  const agents = new Map(
    agentRows.map(row => [
      String(row.account_id),
      Array.isArray(row.agents) ? row.agents.map(String) : [],
    ]),
  );
  const flags = flagRows.map(flagRow);
  const flaggedAt = new Map(flags.map(flag => [flag.accountId, flag.flaggedAt]));

  const report = detectFraud({
    interactions,
    accounts: accountRows.map(row => ({
      id: String(row.id),
      email: String(row.email),
      createdAt: isoRequired(row.created_at),
      userAgents: agents.get(String(row.id)) ?? [],
    })),
    targets: [
      ...solutionRows.map(row => ({
        type: 'solution' as const,
        id: String(row.id),
        ownerId: row.owner_id ? String(row.owner_id) : null,
      })),
      ...listRows.map(row => ({
        type: 'list' as const,
        id: String(row.id),
        ownerId: row.owner_id ? String(row.owner_id) : null,
      })),
    ],
  });

  const accounts: Record<string, FraudAccountInfo> = {};
  for (const row of accountRows) {
    const id = String(row.id);
    accounts[id] = {
      id,
      email: String(row.email),
      name: row.name ? String(row.name) : null,
      createdAt: isoRequired(row.created_at),
      verified: Boolean(row.verified),
      suspended: Boolean(row.suspended),
      isOps: Boolean(row.is_ops),
      flaggedAt: flaggedAt.get(id) ?? null,
      devices: [...new Set((agents.get(id) ?? []).map(deviceLabel))],
    };
  }
  const targets: Record<string, FraudTargetInfo> = {};
  for (const row of solutionRows) {
    const key = targetKey('solution', String(row.id));
    targets[key] = {
      key,
      type: 'solution',
      id: String(row.id),
      name: String(row.name),
      href: `/panel/postulaciones/${String(row.id)}`,
      live: Boolean(row.live),
    };
  }
  for (const row of listRows) {
    const key = targetKey('list', String(row.id));
    targets[key] = {
      key,
      type: 'list',
      id: String(row.id),
      name: String(row.name),
      href: `/panel/comunidad?q=${encodeURIComponent(String(row.name))}`,
      live: Boolean(row.live),
    };
  }

  return {
    available,
    days,
    truncated,
    totals: {
      interactions: interactions.length,
      accounts: accountIds.length,
      targets: solutionIds.length + listIds.length,
    },
    report,
    accounts,
    targets,
    flags,
    history: historyRows.map(flagRow),
  };
}

/** The active mark and past marks of one account, for its page in Cuentas. */
export async function accountFlags(accountId: string) {
  const sql = getDb();
  const [table] = await sql`SELECT to_regclass('account_flags') IS NOT NULL AS ok`;
  if (!table?.ok) return { available: false as const, active: null, history: [] as FlagRow[] };
  const rows = await sql(
    `${FLAG_SELECT} WHERE f.account_id = $1 ORDER BY f.flagged_at DESC LIMIT 20`,
    [accountId],
  );
  const all = rows.map(flagRow);
  return {
    available: true as const,
    active: all.find(flag => !flag.clearedAt) ?? null,
    history: all.filter(flag => flag.clearedAt),
  };
}
