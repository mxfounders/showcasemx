import {
  companySizes,
  isSolutionId,
  solutionCapabilities,
  solutionCategories,
  solutionIndustries,
} from '@/lib/solutions/model';
import { timelines } from '@/lib/contacts/model';
import { isCountryCode } from '@/lib/countries';
import { matchCapability } from '@/lib/search/facets';

/**
 * «Publica tu necesidad» (SHCWS-58). A buyer describes a need; founders whose published
 * listings fit it see it and may send one proposal each; the buyer compares them and
 * chooses whom to talk to, which opens an ordinary contact request. Pure rules here; the
 * database side is server.ts. Contract: docs/briefs.md.
 */

/** What the buyer agrees to: who sees the brief, before and after choosing, and ops. */
export const briefConsentVersion = 'brief-v1';
/** New briefs per account in any 24 hours. */
export const maxBriefsPerDay = 3;
/** Briefs still receiving proposals at the same time, per account. */
export const maxOpenBriefs = 10;
/** Proposals a brief accepts in total. */
export const maxProposalsPerBrief = 10;
/** Listings a brief is shown to. The best fits first. */
export const maxMatchesPerBrief = 25;
export const briefLifetimeDays = 30;
export const maxBriefCategories = 3;
export const maxBriefCapabilities = 8;

export type BriefInput = {
  problem: string;
  budget: string;
  /** One of the contact timelines, stored verbatim (contact_requests.details.timeline). */
  timeline: string;
  companySize: string;
  industry: string | null;
  country: string | null;
  categories: string[];
  capabilities: string[];
};

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length <= max ? value.trim() : null;

function uniqueList(value: unknown, allowed: readonly string[], max: number) {
  if (!Array.isArray(value) || value.length > max) return null;
  const items = value.filter((item): item is string => typeof item === 'string');
  if (items.length !== value.length || new Set(items).size !== items.length) return null;
  return items.every(item => allowed.includes(item)) ? items : null;
}

/** Reads a brief sent by the form. Returns null if anything is missing or out of range. */
export function readBrief(value: Record<string, unknown>): BriefInput | null {
  const problem = text(value.problem, 2000),
    budget = text(value.budget ?? '', 200),
    timeline = text(value.timeline, 40),
    companySize = text(value.companySize, 20);
  if (problem === null || problem.length < 20 || budget === null) return null;
  if (!timeline || !timelines.some(item => item === timeline)) return null;
  if (!companySize || !(companySizes as readonly string[]).includes(companySize)) return null;
  const industry =
    value.industry === null || value.industry === undefined || value.industry === ''
      ? null
      : text(value.industry, 60);
  if (industry !== null && !(solutionIndustries as readonly string[]).includes(industry))
    return null;
  const country =
    value.country === null || value.country === undefined || value.country === ''
      ? null
      : text(value.country, 2);
  if (country !== null && !isCountryCode(country)) return null;
  const categories = uniqueList(value.categories, solutionCategories, maxBriefCategories);
  if (!categories?.length) return null;
  const capabilities = uniqueList(
    value.capabilities ?? [],
    solutionCapabilities.map(item => item.id),
    maxBriefCapabilities,
  );
  // A capability belongs to one category: only those under a chosen category count.
  if (
    !capabilities ||
    !capabilities.every(id =>
      categories.includes(solutionCapabilities.find(item => item.id === id)?.category ?? ''),
    )
  )
    return null;
  return { problem, budget, timeline, companySize, industry, country, categories, capabilities };
}

export type ProposalInput = {
  solutionId: string;
  message: string;
  price: string;
  timeline: string;
};

/** A founder's proposal: the listing it comes from, a message, an estimate and a timeline. */
export function readProposal(value: Record<string, unknown>): ProposalInput | null {
  const message = text(value.message, 2000),
    price = text(value.price, 200),
    timeline = text(value.timeline, 200);
  if (typeof value.solutionId !== 'string' || !isSolutionId(value.solutionId)) return null;
  if (!message || message.length < 20 || !price || !timeline) return null;
  return { solutionId: value.solutionId, message, price, timeline };
}

/** A published listing as matching reads it: only what it declared publicly. */
export type MatchListing = {
  id: string;
  ownerId: string;
  name: string;
  problem?: string;
  categories: string[];
  capabilities?: string[];
  industries?: string[];
  companySizes?: string[];
};

/**
 * How well a published listing fits a brief, or null when it does not. Category is
 * required. What the listing declared decides (§54): a declared industry, size or set of
 * capabilities that leaves the brief out closes the question; a listing that never
 * answered is not excluded for it, only ranked lower. Higher is better.
 */
export function briefFit(
  brief: Pick<BriefInput, 'categories' | 'capabilities' | 'industry' | 'companySize'>,
  listing: MatchListing,
): number | null {
  const categories = listing.categories.filter(category => brief.categories.includes(category));
  if (!categories.length) return null;
  let score = categories.length * 2;
  if (brief.capabilities.length) {
    const subject = {
      name: listing.name,
      description: listing.problem,
      capabilities: listing.capabilities,
    };
    const levels = brief.capabilities.map(id => matchCapability(subject, id));
    const declared = levels.filter(level => level === 'declared').length;
    // Declared capabilities, none of them asked for: not this listing.
    if (listing.capabilities !== undefined && declared === 0) return null;
    score += declared * 3 + levels.filter(level => level === 'inferred').length;
  }
  if (brief.industry && listing.industries !== undefined) {
    if (listing.industries.length === 0) score += 1;
    else if (listing.industries.includes(brief.industry)) score += 2;
    else return null;
  }
  if (listing.companySizes !== undefined) {
    if (listing.companySizes.length === 0) score += 1;
    else if (listing.companySizes.includes(brief.companySize)) score += 2;
    else return null;
  }
  return score;
}

/**
 * The listings a brief goes to: never the buyer's own, the best fits first, at most
 * `limit`. Ties keep a stable order by id.
 */
export function pickMatches(
  brief: Pick<BriefInput, 'categories' | 'capabilities' | 'industry' | 'companySize'>,
  buyerId: string,
  listings: readonly MatchListing[],
  limit = maxMatchesPerBrief,
) {
  return listings
    .filter(listing => listing.ownerId !== buyerId)
    .map(listing => ({ listing, score: briefFit(brief, listing) }))
    .filter((item): item is { listing: MatchListing; score: number } => item.score !== null)
    .sort((a, b) => b.score - a.score || a.listing.id.localeCompare(b.listing.id))
    .slice(0, Math.max(0, limit))
    .map(item => item.listing);
}

export type BriefState = 'open' | 'closed' | 'expired' | 'hidden';

/** Where a brief stands. Hidden by ops wins over everything; then closed, then expired. */
export function briefState(
  brief: { hidden_at: string | null; closed_at: string | null; expires_at: string },
  now = new Date(),
): BriefState {
  if (brief.hidden_at) return 'hidden';
  if (brief.closed_at) return 'closed';
  return new Date(brief.expires_at) <= now ? 'expired' : 'open';
}

export type BriefErrorCode =
  | 'invalid'
  | 'limit'
  | 'notFound'
  | 'closed'
  | 'full'
  | 'alreadyProposed'
  | 'verifyEmail'
  | 'conflict';
export class BriefError extends Error {
  constructor(
    public status: number,
    public code: BriefErrorCode,
  ) {
    super(code);
    this.name = 'BriefError';
  }
}
