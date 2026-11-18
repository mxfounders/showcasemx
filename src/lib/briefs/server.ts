import { solutionsSql } from '@/lib/solutions/server';
import { getSolutionCategories } from '@/lib/solutions/model';
import {
  BriefError,
  briefConsentVersion,
  maxBriefsPerDay,
  maxMatchesPerBrief,
  maxOpenBriefs,
  maxProposalsPerBrief,
  pickMatches,
  type BriefInput,
  type MatchListing,
  type ProposalInput,
} from './model';

/**
 * Database side of «Publica tu necesidad» (SHCWS-58). Every read is scoped to the
 * account that may see it: the buyer reads their own briefs and the proposals sent to
 * them; a founder reads only briefs one of their published listings matched, and never
 * who the buyer is. Contract: docs/briefs.md.
 */

/** The brief as anyone allowed to read it sees it: never the buyer's account or email. */
export type BriefRow = {
  id: string;
  problem: string;
  budget: string;
  timeline: string;
  company_size: string;
  industry: string | null;
  country: string | null;
  categories: string[];
  capabilities: string[];
  created_at: string;
  expires_at: string;
  closed_at: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
};
const briefColumns = `b.id::text,b.problem,b.budget,b.timeline,b.company_size,b.industry,b.country,b.categories,b.capabilities,
  b.created_at::text,b.expires_at::text,b.closed_at::text,b.hidden_at::text,b.hidden_reason`;
const openSql = `b.hidden_at IS NULL AND b.closed_at IS NULL AND b.expires_at>now()`;

const list = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const optionalList = (value: unknown) => (Array.isArray(value) ? list(value) : undefined);

/** Creates a brief, once per browser-generated id, within the account's quotas. */
export async function createBrief(id: string, input: BriefInput, buyer: string) {
  const sql = solutionsSql();
  // Lock the buyer so two submits at once cannot both slip under the daily quota.
  const [, inserted, existing] = await sql.transaction([
    sql`SELECT id FROM auth_accounts WHERE id=${buyer} FOR UPDATE`,
    sql`INSERT INTO buyer_briefs(id,buyer_id,problem,budget,timeline,company_size,industry,country,categories,capabilities,consent_version)
      SELECT ${id},${buyer},${input.problem},${input.budget},${input.timeline},${input.companySize},${input.industry},${input.country},
        ${input.categories}::text[],${input.capabilities}::text[],${briefConsentVersion}
      WHERE (SELECT count(*) FROM buyer_briefs WHERE buyer_id=${buyer} AND created_at>now()-interval '24 hours')<${maxBriefsPerDay}
        AND (SELECT count(*) FROM buyer_briefs b WHERE b.buyer_id=${buyer} AND ${sql.unsafe(openSql)})<${maxOpenBriefs}
      ON CONFLICT (id) DO NOTHING RETURNING id`,
    sql`SELECT buyer_id::text FROM buyer_briefs WHERE id=${id}`,
  ]);
  if (inserted.length) return 'created' as const;
  if (!existing.length) throw new BriefError(429, 'limit');
  if (existing[0].buyer_id !== buyer) throw new BriefError(409, 'conflict');
  return 'existing' as const;
}

/** Published listings as matching reads them; suspended owners never receive briefs. */
async function publishedListings(): Promise<MatchListing[]> {
  const sql = solutionsSql();
  const rows =
    await sql`SELECT s.id::text,s.owner_id::text,s.published_data FROM founder_solutions s JOIN auth_accounts a ON a.id=s.owner_id AND a.suspended_at IS NULL WHERE s.published_data IS NOT NULL`;
  return rows.map(row => {
    const data = (row.published_data ?? {}) as Record<string, unknown>;
    return {
      id: String(row.id),
      ownerId: String(row.owner_id),
      name: typeof data.name === 'string' ? data.name : '',
      problem: typeof data.problem === 'string' ? data.problem : undefined,
      categories: getSolutionCategories(data as { category?: string; categories?: string[] }),
      capabilities: optionalList(data.capabilities),
      industries: optionalList(data.industries),
      companySizes: optionalList(data.companySizes),
    };
  });
}

/**
 * Shows open briefs to the listings that fit them and tells each founder once per brief.
 * Runs when a brief is created (for that brief) and when a listing is published (for all
 * open briefs), so demand that arrived first reaches the founders who join later.
 * Idempotent: a listing already matched is never matched or announced again, and a
 * brief never goes past `maxMatchesPerBrief` listings. Returns the notices written.
 */
export async function matchBriefs(briefIds: string[] = []) {
  const sql = solutionsSql();
  const briefs =
    await sql`SELECT b.id::text,b.buyer_id::text,b.categories,b.capabilities,b.industry,b.company_size,
      COALESCE((SELECT array_agg(m.solution_id::text) FROM buyer_brief_matches m WHERE m.brief_id=b.id),'{}') AS matched
    FROM buyer_briefs b WHERE ${sql.unsafe(openSql)}
      AND (cardinality(${briefIds}::uuid[])=0 OR b.id=ANY(${briefIds}::uuid[]))`;
  if (!briefs.length) return [];
  const listings = await publishedListings();
  const notices: string[] = [];
  for (const brief of briefs) {
    const matched = new Set(list(brief.matched));
    const picked = pickMatches(
      {
        categories: list(brief.categories),
        capabilities: list(brief.capabilities),
        industry: brief.industry ? String(brief.industry) : null,
        companySize: String(brief.company_size),
      },
      String(brief.buyer_id),
      listings.filter(listing => !matched.has(listing.id)),
      maxMatchesPerBrief - matched.size,
    );
    if (!picked.length) continue;
    // The brief's state and the listing's publication are checked again in the insert.
    const rows = await sql`WITH inserted AS (
        INSERT INTO buyer_brief_matches(brief_id,solution_id,founder_id)
        SELECT b.id,s.id,s.owner_id FROM unnest(${picked.map(item => item.id)}::uuid[]) AS c(solution_id)
        JOIN founder_solutions s ON s.id=c.solution_id AND s.published_data IS NOT NULL
        JOIN buyer_briefs b ON b.id=${brief.id}::uuid AND ${sql.unsafe(openSql)} AND b.buyer_id<>s.owner_id
        ON CONFLICT DO NOTHING RETURNING solution_id,founder_id
      ), founders AS (
        SELECT DISTINCT ON (i.founder_id) i.founder_id,s.published_data->>'name' AS name
        FROM inserted i JOIN founder_solutions s ON s.id=i.solution_id
        ORDER BY i.founder_id,s.published_data->>'name'
      )
      INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state)
      SELECT f.founder_id,'brief','brief-match:'||${brief.id}::text||':'||f.founder_id::text,
        left('Una empresa busca algo que encaja con '||f.name,180),'/account/needs/'||${brief.id}::text,
        CASE WHEN a.email_verified_at IS NOT NULL AND COALESCE(p.brief_email,true) THEN 'pending' ELSE 'disabled' END
      FROM founders f JOIN auth_accounts a ON a.id=f.founder_id
      LEFT JOIN notification_preferences p ON p.owner_id=f.founder_id
      ON CONFLICT (source_key) DO NOTHING RETURNING id::text`;
    notices.push(...rows.map(row => String(row.id)));
  }
  return notices;
}

export type BuyerBriefSummary = BriefRow & {
  matches: number;
  proposals: number;
  shortlisted: boolean;
};
export async function listBuyerBriefs(buyer: string) {
  const sql = solutionsSql();
  return (await sql.query(
    `SELECT ${briefColumns},
      (SELECT count(*)::int FROM buyer_brief_matches m WHERE m.brief_id=b.id) AS matches,
      (SELECT count(*)::int FROM buyer_brief_proposals p WHERE p.brief_id=b.id) AS proposals,
      EXISTS(SELECT 1 FROM buyer_brief_shortlists l WHERE l.brief_id=b.id) AS shortlisted
    FROM buyer_briefs b WHERE b.buyer_id=$1 ORDER BY b.created_at DESC LIMIT 50`,
    [buyer],
  )) as BuyerBriefSummary[];
}

export type BuyerProposal = {
  id: string;
  solution_id: string;
  message: string;
  price: string;
  timeline: string;
  created_at: string;
  chosen_at: string | null;
  /** Null once the listing is no longer published: never read from its draft (§8). */
  name: string | null;
  slug: string | null;
  company_sizes: unknown;
  industries: unknown;
  /** The buyer's conversation with this listing, whichever way it started. */
  contact_id: string | null;
};
export type Shortlist = {
  id: string;
  note: string;
  created_at: string;
  listings: { id: string; slug: string | null; name: string; problem: string }[];
};

/** A buyer's own brief with the proposals sent to it and the team's short list. */
export async function getBuyerBrief(id: string, buyer: string) {
  const sql = solutionsSql();
  const [brief] = (await sql.query(
    `SELECT ${briefColumns},(SELECT count(*)::int FROM buyer_brief_matches m WHERE m.brief_id=b.id) AS matches
     FROM buyer_briefs b WHERE b.id=$1 AND b.buyer_id=$2`,
    [id, buyer],
  )) as (BriefRow & { matches: number })[];
  if (!brief) return undefined;
  const [proposals, shortlists] = await Promise.all([
    sql`SELECT p.id::text,p.solution_id::text,p.message,p.price,p.timeline,p.created_at::text,p.chosen_at::text,
        s.published_data->>'name' AS name,CASE WHEN s.published_data IS NOT NULL THEN s.slug END AS slug,
        s.published_data->'companySizes' AS company_sizes,s.published_data->'industries' AS industries,
        (SELECT r.id::text FROM contact_requests r WHERE r.buyer_id=${buyer} AND r.solution_id=p.solution_id) AS contact_id
      FROM buyer_brief_proposals p LEFT JOIN founder_solutions s ON s.id=p.solution_id
      WHERE p.brief_id=${id} ORDER BY p.created_at`,
    sql`SELECT id::text,note,created_at::text,solution_ids::text[] AS solution_ids FROM buyer_brief_shortlists WHERE brief_id=${id}`,
  ]);
  let shortlist: Shortlist | null = null;
  if (shortlists[0]) {
    const ids = list(shortlists[0].solution_ids);
    const listings =
      await sql`SELECT id::text,slug,published_data->>'name' AS name,COALESCE(published_data->>'problem','') AS problem
        FROM founder_solutions WHERE id=ANY(${ids}::uuid[]) AND published_data IS NOT NULL`;
    shortlist = {
      id: String(shortlists[0].id),
      note: String(shortlists[0].note),
      created_at: String(shortlists[0].created_at),
      // The order ops chose; a listing withdrawn since then drops out.
      listings: ids
        .map(item => listings.find(row => row.id === item))
        .filter(row => row !== undefined)
        .map(row => ({
          id: String(row.id),
          slug: row.slug ? String(row.slug) : null,
          name: String(row.name),
          problem: String(row.problem),
        })),
    };
  }
  return { brief, proposals: proposals as BuyerProposal[], shortlist };
}

export async function closeBrief(id: string, buyer: string) {
  const sql = solutionsSql();
  const rows =
    await sql`UPDATE buyer_briefs SET closed_at=now() WHERE id=${id} AND buyer_id=${buyer} AND closed_at IS NULL AND hidden_at IS NULL RETURNING id`;
  if (!rows.length) throw new BriefError(409, 'closed');
}

export type FounderNeedSummary = Pick<
  BriefRow,
  | 'id'
  | 'problem'
  | 'budget'
  | 'timeline'
  | 'company_size'
  | 'industry'
  | 'country'
  | 'categories'
  | 'created_at'
  | 'expires_at'
  | 'closed_at'
> & { listings: string[]; proposed_at: string | null; chosen_at: string | null };

/**
 * Briefs one of the founder's own published listings matched. Hidden briefs disappear;
 * the buyer is never part of the row. The founder's own proposal, if any, and whether
 * the buyer chose it.
 */
export async function listFounderNeeds(founder: string) {
  const sql = solutionsSql();
  return (await sql`SELECT b.id::text,left(b.problem,400) AS problem,b.budget,b.timeline,b.company_size,b.industry,b.country,b.categories,
      b.created_at::text,b.expires_at::text,b.closed_at::text,
      array_agg(DISTINCT s.published_data->>'name') AS listings,
      (SELECT p.created_at::text FROM buyer_brief_proposals p WHERE p.brief_id=b.id AND p.founder_id=${founder}) AS proposed_at,
      (SELECT p.chosen_at::text FROM buyer_brief_proposals p WHERE p.brief_id=b.id AND p.founder_id=${founder}) AS chosen_at
    FROM buyer_brief_matches m
    JOIN founder_solutions s ON s.id=m.solution_id AND s.owner_id=${founder} AND s.published_data IS NOT NULL
    JOIN buyer_briefs b ON b.id=m.brief_id AND b.hidden_at IS NULL
    WHERE m.founder_id=${founder}
    GROUP BY b.id ORDER BY b.created_at DESC LIMIT 50`) as FounderNeedSummary[];
}

export type FounderProposal = {
  id: string;
  solution_id: string;
  name: string | null;
  message: string;
  price: string;
  timeline: string;
  created_at: string;
  chosen_at: string | null;
  /** Only once the buyer chose this proposal: the opportunity it opened. */
  contact_request_id: string | null;
};

/**
 * One matched brief for the founder: what the buyer described (never who they are), the
 * founder's listings that matched it, their proposal and whether the brief still has
 * room. Undefined when none of the founder's current published listings matched it.
 */
export async function getFounderNeed(id: string, founder: string) {
  const sql = solutionsSql();
  const listings =
    await sql`SELECT s.id::text,s.published_data->>'name' AS name FROM buyer_brief_matches m
      JOIN founder_solutions s ON s.id=m.solution_id AND s.owner_id=${founder} AND s.published_data IS NOT NULL
      WHERE m.brief_id=${id} AND m.founder_id=${founder} ORDER BY 2`;
  if (!listings.length) return undefined;
  const [briefs, proposals] = await Promise.all([
    sql.query(
      `SELECT ${briefColumns},(SELECT count(*)::int FROM buyer_brief_proposals p WHERE p.brief_id=b.id) AS proposals
       FROM buyer_briefs b WHERE b.id=$1 AND b.hidden_at IS NULL`,
      [id],
    ),
    sql`SELECT p.id::text,p.solution_id::text,s.published_data->>'name' AS name,p.message,p.price,p.timeline,p.created_at::text,p.chosen_at::text,
        CASE WHEN p.chosen_at IS NOT NULL THEN p.contact_request_id::text END AS contact_request_id
      FROM buyer_brief_proposals p LEFT JOIN founder_solutions s ON s.id=p.solution_id
      WHERE p.brief_id=${id} AND p.founder_id=${founder}`,
  ]);
  const brief = briefs[0] as (BriefRow & { proposals: number }) | undefined;
  if (!brief) return undefined;
  // hidden_reason is ops' note to the buyer; a founder never reads it.
  return {
    brief: { ...brief, hidden_reason: null },
    listings: listings.map(row => ({ id: String(row.id), name: String(row.name) })),
    proposal: (proposals[0] as FounderProposal | undefined) ?? null,
  };
}

/**
 * Sends the founder's one proposal to a brief, from one of their listings that matched
 * it. The brief row is locked so the proposal limit holds under concurrent sends; the
 * buyer's notice is written in the same statement. Retrying the same id is a no-op.
 */
export async function createProposal(
  id: string,
  briefId: string,
  input: ProposalInput,
  founder: string,
) {
  const sql = solutionsSql();
  const [, notices, mine, state] = await sql.transaction([
    sql`SELECT id FROM buyer_briefs WHERE id=${briefId} FOR UPDATE`,
    sql`WITH inserted AS (
        INSERT INTO buyer_brief_proposals(id,brief_id,solution_id,founder_id,message,price,timeline)
        SELECT ${id},m.brief_id,m.solution_id,m.founder_id,${input.message},${input.price},${input.timeline}
        FROM buyer_brief_matches m
        JOIN founder_solutions s ON s.id=m.solution_id AND s.owner_id=${founder} AND s.published_data IS NOT NULL
        JOIN buyer_briefs b ON b.id=m.brief_id AND ${sql.unsafe(openSql)} AND b.buyer_id<>${founder}
        WHERE m.brief_id=${briefId} AND m.solution_id=${input.solutionId} AND m.founder_id=${founder}
          AND (SELECT count(*) FROM buyer_brief_proposals WHERE brief_id=${briefId})<${maxProposalsPerBrief}
        ON CONFLICT DO NOTHING RETURNING id,brief_id,solution_id
      )
      INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state)
      SELECT b.buyer_id,'brief','brief-proposal:'||i.id::text,left((s.published_data->>'name')||' te envió una propuesta',180),
        '/account/briefs/'||b.id::text,
        CASE WHEN a.email_verified_at IS NOT NULL AND COALESCE(pr.brief_email,true) THEN 'pending' ELSE 'disabled' END
      FROM inserted i JOIN buyer_briefs b ON b.id=i.brief_id JOIN founder_solutions s ON s.id=i.solution_id
      JOIN auth_accounts a ON a.id=b.buyer_id LEFT JOIN notification_preferences pr ON pr.owner_id=b.buyer_id
      ON CONFLICT (source_key) DO NOTHING RETURNING id::text`,
    sql`SELECT id::text FROM buyer_brief_proposals WHERE brief_id=${briefId} AND founder_id=${founder}`,
    sql`SELECT hidden_at IS NOT NULL AS hidden,(closed_at IS NOT NULL OR expires_at<=now()) AS closed,
        (SELECT count(*)::int FROM buyer_brief_proposals WHERE brief_id=${briefId}) AS proposals
      FROM buyer_briefs WHERE id=${briefId}`,
  ]);
  const own = mine[0]?.id;
  if (own === id) return notices.map(row => String(row.id));
  if (own) throw new BriefError(409, 'alreadyProposed');
  const brief = state[0];
  if (!brief || brief.hidden) throw new BriefError(404, 'notFound');
  if (brief.closed) throw new BriefError(409, 'closed');
  if (Number(brief.proposals) >= maxProposalsPerBrief) throw new BriefError(409, 'full');
  throw new BriefError(404, 'notFound');
}

/** A proposal of the buyer's own brief, to open the contact form prefilled from it. */
export async function proposalForChoice(briefId: string, proposalId: string, buyer: string) {
  const sql = solutionsSql();
  const [row] = await sql.query(
    `SELECT ${briefColumns},p.id::text AS proposal_id,p.solution_id::text,
      (SELECT r.id::text FROM contact_requests r WHERE r.buyer_id=$3 AND r.solution_id=p.solution_id) AS contact_id
     FROM buyer_brief_proposals p JOIN buyer_briefs b ON b.id=p.brief_id AND b.buyer_id=$3
     WHERE p.id=$2 AND p.brief_id=$1`,
    [briefId, proposalId, buyer],
  );
  return row as
    | (BriefRow & { proposal_id: string; solution_id: string; contact_id: string | null })
    | undefined;
}

/**
 * Records that the buyer chose this proposal and which conversation it opened. Only the
 * brief's buyer, and only with their own contact request for that same listing.
 */
export async function chooseProposal(
  briefId: string,
  solutionId: string,
  buyer: string,
  contactId: string,
) {
  const sql = solutionsSql();
  const rows =
    await sql`UPDATE buyer_brief_proposals p SET chosen_at=COALESCE(p.chosen_at,now()),contact_request_id=${contactId}
    FROM buyer_briefs b WHERE b.id=p.brief_id AND b.buyer_id=${buyer} AND p.brief_id=${briefId} AND p.solution_id=${solutionId}
      AND EXISTS(SELECT 1 FROM contact_requests r WHERE r.id=${contactId} AND r.buyer_id=${buyer} AND r.solution_id=${solutionId})
    RETURNING p.id::text`;
  return rows.length > 0;
}

/**
 * Choosing a founder the buyer already talks to: no second request (one per buyer and
 * listing, §9), the proposal points to the existing conversation.
 */
export async function chooseExisting(briefId: string, proposalId: string, buyer: string) {
  const proposal = await proposalForChoice(briefId, proposalId, buyer);
  if (!proposal) throw new BriefError(404, 'notFound');
  if (!proposal.contact_id) throw new BriefError(409, 'conflict');
  await chooseProposal(briefId, proposal.solution_id, buyer, proposal.contact_id);
  return proposal.contact_id;
}
