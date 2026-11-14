/**
 * Multi-account and fraud signals on likes, reviews and comments (SHCWS-141).
 *
 * Pure functions over data the product already keeps: when an account was created, its
 * address, the user agent of its sessions and the time of each interaction. No IP (the
 * privacy policy does not cover one, CLAUDE.md §49) and no saved projects (which listing
 * a buyer saved stays private even for ops, §68): saves stop counting when an account is
 * marked, but they never point at one here.
 *
 * A signal is a reason for a person to look, never a verdict: a launch shared in a group
 * chat also brings new accounts in a burst. Only an admin's mark (account_flags) changes
 * the ranking. These detectors and thresholds are ops-only and never shown in the product.
 */

export type InteractionKind =
  'like' | 'comment' | 'review' | 'list_like' | 'list_save' | 'list_comment';
export type TargetType = 'solution' | 'list';

export interface Interaction {
  kind: InteractionKind;
  targetType: TargetType;
  targetId: string;
  accountId: string;
  /** ISO timestamp. */
  at: string;
}

export interface FraudAccount {
  id: string;
  email: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Distinct user agents of its product sessions (auth_sessions.user_agent). */
  userAgents: string[];
}

export interface FraudTarget {
  type: TargetType;
  id: string;
  ownerId: string | null;
}

/** Signals over a group of accounts on one listing or list. */
export type GroupSignal = 'cohort' | 'burst' | 'fresh' | 'shared_ua';
/** Signals about one account on its own. */
export type AccountSignal = 'disposable' | 'automated_ua';
export type SignalCode = GroupSignal | AccountSignal;

export const SIGNAL_CODES: readonly SignalCode[] = [
  'cohort',
  'burst',
  'fresh',
  'shared_ua',
  'disposable',
  'automated_ua',
];

export function isSignalCode(value: unknown): value is SignalCode {
  return typeof value === 'string' && (SIGNAL_CODES as readonly string[]).includes(value);
}

export interface FraudThresholds {
  /** Accounts created within this many minutes of the first of the group… */
  cohortWindowMinutes: number;
  /** …and at least this many of them on the same target. */
  cohortMinAccounts: number;
  /** Distinct accounts interacting with one target inside this window… */
  burstWindowMinutes: number;
  burstMinAccounts: number;
  /** An account is «fresh» on a target if its first interaction came this soon after sign-up. */
  freshHours: number;
  freshMinAccounts: number;
  /** …and fresh accounts are at least this share of the target's accounts. */
  freshMinShare: number;
  /** Accounts sharing one exact user agent string on the same target. */
  sharedUaMinAccounts: number;
}

/**
 * Chosen for a marketplace where a listing gets a handful of interactions a week: three
 * accounts born within two hours of each other on one listing, or five different
 * accounts in one hour, is already rare enough to deserve a look. Exact user agents are
 * shared by everybody on the same browser version, so that signal weighs least.
 */
export const FRAUD_THRESHOLDS: FraudThresholds = {
  cohortWindowMinutes: 120,
  cohortMinAccounts: 3,
  burstWindowMinutes: 60,
  burstMinAccounts: 5,
  freshHours: 48,
  freshMinAccounts: 3,
  freshMinShare: 0.5,
  sharedUaMinAccounts: 3,
};

export const SIGNAL_WEIGHT: Record<SignalCode, number> = {
  cohort: 3,
  automated_ua: 3,
  disposable: 2,
  burst: 2,
  fresh: 2,
  shared_ua: 1,
};

/**
 * Well-known disposable inbox providers. Curated, small and offline on purpose: no
 * external service learns who registers. A subdomain of a listed domain also matches.
 */
export const DISPOSABLE_EMAIL_DOMAINS: readonly string[] = [
  '10minemail.com',
  '10minutemail.com',
  '10minutemail.net',
  '1secmail.com',
  '1secmail.net',
  '1secmail.org',
  'burnermail.io',
  'cool.fr.nf',
  'courriel.fr.nf',
  'discard.email',
  'discardmail.com',
  'dispostable.com',
  'dropmail.me',
  'emailfake.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.info',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'harakirimail.com',
  'inboxkitten.com',
  'jetable.fr.nf',
  'mail.gw',
  'mail.tm',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailinator.net',
  'mailnesia.com',
  'mailpoof.com',
  'mintemail.com',
  'moakt.com',
  'mohmal.com',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'mytemp.email',
  'nada.email',
  'nomail.xl.cx',
  'nospam.ze.tc',
  'pokemail.net',
  'sharklasers.com',
  'spam4.me',
  'spamgourmet.com',
  'speed.1s.fr',
  'temp-mail.io',
  'temp-mail.org',
  'tempail.com',
  'tempinbox.com',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'tempr.email',
  'throwawaymail.com',
  'tmpmail.net',
  'tmpmail.org',
  'trashmail.com',
  'trashmail.de',
  'trashmail.me',
  'trashmail.net',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
];

const disposable = new Set(DISPOSABLE_EMAIL_DOMAINS);

export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at < 0
    ? ''
    : email
        .slice(at + 1)
        .trim()
        .toLowerCase()
        .replace(/\.$/, '');
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    if (disposable.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

// Headless browsers, HTTP libraries and self-declared bots. A person signing in from a
// real browser never sends these.
const AUTOMATED_UA =
  /HeadlessChrome|PhantomJS|Puppeteer|Playwright|Selenium|WebDriver|python-requests|python-urllib|aiohttp|httpx|curl\/|wget\/|Go-http-client|okhttp|axios\/|node-fetch|undici|libwww-perl|Java\/|^node$|\bbot\b|crawler|spider/i;

export function isAutomatedUserAgent(userAgent: string): boolean {
  return AUTOMATED_UA.test(userAgent);
}

export interface TargetSignal {
  code: GroupSignal;
  accountIds: string[];
  /** Creation span (cohort) or interaction window (burst), ISO. */
  from?: string;
  to?: string;
  /** The shared string (shared_ua). */
  userAgent?: string;
}

export interface TargetFinding {
  key: string;
  targetType: TargetType;
  targetId: string;
  signals: TargetSignal[];
  /** Accounts in any group signal here, plus those with an account signal of their own. */
  suspectAccountIds: string[];
  /** What each suspect account did on this target in the window. */
  kinds: Record<string, InteractionKind[]>;
  accountCount: number;
  interactionCount: number;
  score: number;
}

export interface AccountFinding {
  accountId: string;
  signals: SignalCode[];
  /** Targets where it appears in a group signal. */
  suspectOn: string[];
  /** Every target it interacted with in the window. */
  targetKeys: string[];
  interactionCount: number;
  score: number;
}

export interface FraudReport {
  targets: TargetFinding[];
  accounts: AccountFinding[];
}

export function targetKey(type: TargetType, id: string): string {
  return `${type}:${id}`;
}

const MINUTE = 60_000;

function time(value: string): number {
  return Date.parse(value);
}

/** Groups of ≥ min accounts created within `windowMs` of the first one, never overlapping. */
export function cohorts(
  accounts: Array<{ id: string; createdAt: number }>,
  windowMs: number,
  min: number,
): Array<{ ids: string[]; from: number; to: number }> {
  const sorted = [...accounts].sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
  const groups: Array<{ ids: string[]; from: number; to: number }> = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].createdAt - sorted[i].createdAt <= windowMs) j++;
    if (j - i + 1 >= min) {
      groups.push({
        ids: sorted.slice(i, j + 1).map(a => a.id),
        from: sorted[i].createdAt,
        to: sorted[j].createdAt,
      });
      i = j + 1;
    } else i++;
  }
  return groups;
}

/** The window of `windowMs` with the most distinct accounts, if it reaches `min`. */
export function densestBurst(
  events: Array<{ accountId: string; at: number }>,
  windowMs: number,
  min: number,
): { ids: string[]; from: number; to: number } | null {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const counts = new Map<string, number>();
  let left = 0;
  let best: { size: number; left: number; right: number } | null = null;
  for (let right = 0; right < sorted.length; right++) {
    counts.set(sorted[right].accountId, (counts.get(sorted[right].accountId) ?? 0) + 1);
    while (sorted[right].at - sorted[left].at > windowMs) {
      const id = sorted[left].accountId;
      const next = (counts.get(id) ?? 0) - 1;
      if (next <= 0) counts.delete(id);
      else counts.set(id, next);
      left++;
    }
    if (!best || counts.size > best.size) best = { size: counts.size, left, right };
  }
  if (!best || best.size < min) return null;
  const ids = [...new Set(sorted.slice(best.left, best.right + 1).map(e => e.accountId))];
  return { ids, from: sorted[best.left].at, to: sorted[best.right].at };
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}

export function detectFraud(
  input: { interactions: Interaction[]; accounts: FraudAccount[]; targets: FraudTarget[] },
  t: FraudThresholds = FRAUD_THRESHOLDS,
): FraudReport {
  const accounts = new Map(input.accounts.map(a => [a.id, a]));
  const owners = new Map(input.targets.map(target => [targetKey(target.type, target.id), target]));

  // The owner's own activity never counts in any ranking (§55), so it is no signal either.
  const byTarget = new Map<
    string,
    Array<{ accountId: string; at: number; kind: InteractionKind }>
  >();
  const touched = new Map<string, { keys: Set<string>; count: number }>();
  for (const interaction of input.interactions) {
    const at = time(interaction.at);
    const key = targetKey(interaction.targetType, interaction.targetId);
    if (!accounts.has(interaction.accountId) || Number.isNaN(at)) continue;
    if (owners.get(key)?.ownerId === interaction.accountId) continue;
    const list = byTarget.get(key) ?? [];
    list.push({ accountId: interaction.accountId, at, kind: interaction.kind });
    byTarget.set(key, list);
    const entry = touched.get(interaction.accountId) ?? { keys: new Set<string>(), count: 0 };
    entry.keys.add(key);
    entry.count++;
    touched.set(interaction.accountId, entry);
  }

  const own = new Map<string, AccountSignal[]>();
  for (const id of touched.keys()) {
    const account = accounts.get(id) as FraudAccount;
    const signals: AccountSignal[] = [];
    if (isDisposableEmail(account.email)) signals.push('disposable');
    if (account.userAgents.some(isAutomatedUserAgent)) signals.push('automated_ua');
    if (signals.length) own.set(id, signals);
  }

  const groupCodes = new Map<string, Set<GroupSignal>>();
  const suspectOn = new Map<string, Set<string>>();
  const targets: TargetFinding[] = [];

  for (const [key, events] of byTarget) {
    const [type, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    const first = new Map<string, number>();
    for (const event of events)
      first.set(event.accountId, Math.min(first.get(event.accountId) ?? Infinity, event.at));
    const members = [...first.keys()].map(accountId => {
      const account = accounts.get(accountId) as FraudAccount;
      return { id: accountId, createdAt: time(account.createdAt), userAgents: account.userAgents };
    });
    const signals: TargetSignal[] = [];

    for (const group of cohorts(
      members.filter(m => !Number.isNaN(m.createdAt)),
      t.cohortWindowMinutes * MINUTE,
      t.cohortMinAccounts,
    ))
      signals.push({
        code: 'cohort',
        accountIds: group.ids,
        from: iso(group.from),
        to: iso(group.to),
      });

    const burst = densestBurst(events, t.burstWindowMinutes * MINUTE, t.burstMinAccounts);
    if (burst)
      signals.push({
        code: 'burst',
        accountIds: burst.ids,
        from: iso(burst.from),
        to: iso(burst.to),
      });

    const fresh = members.filter(m => {
      const gap = (first.get(m.id) as number) - m.createdAt;
      return gap >= 0 && gap <= t.freshHours * 60 * MINUTE;
    });
    if (fresh.length >= t.freshMinAccounts && fresh.length / members.length >= t.freshMinShare)
      signals.push({ code: 'fresh', accountIds: fresh.map(m => m.id).sort() });

    const byAgent = new Map<string, string[]>();
    for (const member of members)
      for (const agent of new Set(member.userAgents)) {
        if (!agent) continue;
        byAgent.set(agent, [...(byAgent.get(agent) ?? []), member.id]);
      }
    for (const [agent, ids] of [...byAgent].sort((a, b) => b[1].length - a[1].length))
      if (ids.length >= t.sharedUaMinAccounts)
        signals.push({ code: 'shared_ua', accountIds: [...ids].sort(), userAgent: agent });

    if (!signals.length) continue;
    const suspects = new Set<string>();
    for (const signal of signals)
      for (const accountId of signal.accountIds) {
        suspects.add(accountId);
        const codes = groupCodes.get(accountId) ?? new Set<GroupSignal>();
        codes.add(signal.code);
        groupCodes.set(accountId, codes);
        const on = suspectOn.get(accountId) ?? new Set<string>();
        on.add(key);
        suspectOn.set(accountId, on);
      }
    for (const member of members) if (own.has(member.id)) suspects.add(member.id);

    const kinds: Record<string, InteractionKind[]> = {};
    for (const event of events)
      if (suspects.has(event.accountId)) {
        const list = (kinds[event.accountId] ??= []);
        if (!list.includes(event.kind)) list.push(event.kind);
      }
    targets.push({
      key,
      targetType: type as TargetType,
      targetId: id,
      signals,
      suspectAccountIds: [...suspects].sort(),
      kinds,
      accountCount: members.length,
      interactionCount: events.length,
      score: signals.reduce((sum, s) => sum + SIGNAL_WEIGHT[s.code] * s.accountIds.length, 0),
    });
  }

  const accountFindings: AccountFinding[] = [];
  for (const [accountId, entry] of touched) {
    const group = groupCodes.get(accountId);
    const self = own.get(accountId) ?? [];
    const codes = SIGNAL_CODES.filter(
      code => group?.has(code as GroupSignal) || self.includes(code as AccountSignal),
    );
    if (!codes.length) continue;
    accountFindings.push({
      accountId,
      signals: codes,
      suspectOn: [...(suspectOn.get(accountId) ?? [])].sort(),
      targetKeys: [...entry.keys].sort(),
      interactionCount: entry.count,
      score: codes.reduce((sum, code) => sum + SIGNAL_WEIGHT[code], 0),
    });
  }

  targets.sort(
    (a, b) =>
      b.score - a.score || b.interactionCount - a.interactionCount || (a.key < b.key ? -1 : 1),
  );
  accountFindings.sort(
    (a, b) =>
      b.score - a.score ||
      b.interactionCount - a.interactionCount ||
      (a.accountId < b.accountId ? -1 : 1),
  );
  return { targets, accounts: accountFindings };
}
