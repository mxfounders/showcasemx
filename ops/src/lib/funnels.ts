// Channels and funnels (SHCWS-109/111, docs/attribution.md). Pure helpers: labels, the
// weeks a board shows and how a step converts. No '@/' imports: root tests import this.

/** The product's channels (src/lib/attribution/conventions.ts) plus accounts without one. */
export const CHANNEL_LABEL = {
  direct: 'Directo',
  organic: 'Buscadores',
  ai: 'Asistentes de IA',
  social: 'Redes sociales',
  newsletter: 'Newsletter',
  email: 'Correos de shwcs',
  badge: 'Insignia',
  share: 'Compartido',
  invitation: 'Invitación',
  referral: 'Otros sitios',
  paid: 'Pago',
  campaign: 'Otras campañas',
  unknown: 'Sin dato',
} as const;
export type ChannelKey = keyof typeof CHANNEL_LABEL;
export const CHANNEL_KEYS = Object.keys(CHANNEL_LABEL) as ChannelKey[];

export const LANDING_LABEL: Record<string, string> = {
  home: 'Inicio',
  catalog: 'Catálogo o búsqueda',
  listing: 'Ficha',
  community: 'Comunidad',
  blog: 'Blog',
  apply: 'Aplicar',
  review: 'Reseña por invitación',
  account: 'Cuenta',
  auth: 'Acceso',
  info: 'Páginas informativas',
  other: 'Otra',
  '': '—',
};

export function channelLabel(value: string): string {
  return (CHANNEL_LABEL as Record<string, string>)[value] ?? value;
}

/** A channel from the URL, or null for «todos». */
export function readChannel(value: unknown): ChannelKey | null {
  return typeof value === 'string' && value in CHANNEL_LABEL ? (value as ChannelKey) : null;
}

/** The Monday (YYYY-MM-DD) of the week a calendar day belongs to. */
export function weekOf(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  const back = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - back * 86_400_000).toISOString().slice(0, 10);
}

/** The last `count` weeks up to the one holding `today`, oldest first. */
export function recentWeeks(today: string, count: number): string[] {
  const last = Date.parse(`${weekOf(today)}T12:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(last - (count - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10),
  );
}

export interface FunnelStepDef<K extends string> {
  key: K;
  label: string;
  /** Who is counted: visits (aggregates) or accounts of the week's sign-up cohort. */
  unit: 'visits' | 'accounts';
}

export const BUYER_STEPS = [
  { key: 'visit', label: 'Visitas', unit: 'visits' },
  { key: 'browse', label: 'Búsqueda, categoría o ficha', unit: 'visits' },
  { key: 'listing', label: 'Ficha', unit: 'visits' },
  { key: 'registered', label: 'Registro', unit: 'accounts' },
  { key: 'saved', label: 'Guardar o comparar', unit: 'accounts' },
  { key: 'requested', label: 'Solicitud o brief', unit: 'accounts' },
  { key: 'answered', label: 'Respuesta recibida', unit: 'accounts' },
] as const satisfies readonly FunnelStepDef<string>[];

export const FOUNDER_STEPS = [
  { key: 'apply', label: 'Visita a /aplicar', unit: 'visits' },
  { key: 'registered', label: 'Registro', unit: 'accounts' },
  { key: 'onboarded', label: 'Onboarding', unit: 'accounts' },
  { key: 'drafted', label: 'Borrador', unit: 'accounts' },
  { key: 'submitted', label: 'Enviado', unit: 'accounts' },
  { key: 'published', label: 'Publicado', unit: 'accounts' },
  { key: 'firstRequest', label: 'Primera solicitud', unit: 'accounts' },
  { key: 'firstReply', label: 'Primera respuesta', unit: 'accounts' },
] as const satisfies readonly FunnelStepDef<string>[];

export type BuyerKey = (typeof BUYER_STEPS)[number]['key'];
export type FounderKey = (typeof FOUNDER_STEPS)[number]['key'];

/**
 * Each step's count and its conversion from the step before, as a whole percentage. A
 * step with nothing before it has no conversion (null), never a made-up 0 %.
 */
export function conversions<K extends string>(
  steps: readonly { key: K }[],
  counts: Record<K, number>,
): { key: K; value: number; rate: number | null }[] {
  return steps.map((step, index) => {
    const value = counts[step.key] ?? 0;
    const before = index === 0 ? null : (counts[steps[index - 1].key] ?? 0);
    return {
      key: step.key,
      value,
      rate: before === null || before <= 0 ? null : Math.round((value / before) * 100),
    };
  });
}

/** One account of a sign-up cohort and the funnel steps it has reached so far. */
export interface CohortAccount {
  week: string;
  channel: string;
  intent: string;
  profile: string | null;
  onboarded: boolean;
  saved: boolean;
  requested: boolean;
  answered: boolean;
  drafted: boolean;
  submitted: boolean;
  published: boolean;
  firstRequest: boolean;
  firstReply: boolean;
}

/**
 * Which funnel an account belongs to. Founder: came to publish (its sign-up went through
 * /aplicar or leads to publishing), says so in onboarding, or owns a listing. Buyer:
 * everyone else, plus those who said «both», «buyer» or «exploring». «Both» is in both.
 */
export function sides(account: Pick<CohortAccount, 'intent' | 'profile' | 'drafted'>) {
  const profile = account.profile ?? '';
  const founder =
    account.intent === 'founder' || ['founder', 'both'].includes(profile) || account.drafted;
  const buyer =
    account.intent === 'buyer' || ['buyer', 'both', 'exploring'].includes(profile) || !founder;
  return { founder, buyer };
}

export function emptyCounts<K extends string>(steps: readonly { key: K }[]): Record<K, number> {
  return Object.fromEntries(steps.map(step => [step.key, 0])) as Record<K, number>;
}

/**
 * Adds one cohort account to the week's buyer and founder counts. Steps are cumulative:
 * an account counts in every step up to the furthest one it reached, so a buyer who sent
 * a request without saving anything still passed «guardar o comparar», and the funnel
 * never shows more people at a step than at the one before.
 */
export function countAccount(
  account: CohortAccount,
  buyer: Record<BuyerKey, number>,
  founder: Record<FounderKey, number>,
) {
  const side = sides(account);
  if (side.buyer) {
    const reached = furthest([account.saved, account.requested, account.answered]);
    buyer.registered++;
    if (reached >= 1) buyer.saved++;
    if (reached >= 2) buyer.requested++;
    if (reached >= 3) buyer.answered++;
  }
  if (side.founder) {
    const reached = furthest([
      account.onboarded,
      account.drafted,
      account.submitted,
      account.published,
      account.firstRequest,
      account.firstReply,
    ]);
    const keys = [
      'onboarded',
      'drafted',
      'submitted',
      'published',
      'firstRequest',
      'firstReply',
    ] as const;
    founder.registered++;
    keys.forEach((key, index) => {
      if (reached >= index + 1) founder[key]++;
    });
  }
}

/** How far along a list of steps an account got: the 1-based index of the last one true. */
export function furthest(steps: boolean[]): number {
  for (let index = steps.length - 1; index >= 0; index--) if (steps[index]) return index + 1;
  return 0;
}
