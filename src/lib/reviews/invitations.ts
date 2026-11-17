import { randomBytes } from 'node:crypto';
import { solutionsSql } from '@/lib/solutions/server';
import { isReviewInviteToken } from './model';

/**
 * Invitations to review (db/review-invitations.sql).
 *
 * The founder's link (SHCWS-132) is one token per listing, created only when the founder
 * asks for it (never on a page load) and replaceable. Reviews that arrive through it are
 * labelled and weigh half. shwcs's own invitation after a real conversation (SHCWS-135)
 * is a notice the daily mail run creates.
 */

export const newInviteToken = () => randomBytes(16).toString('hex');

/** The owner's current link token for a listing, or null before they create one. */
export async function getReviewInvite(solutionId: string): Promise<string | null> {
  const [row] =
    await solutionsSql()`SELECT token FROM solution_review_invites WHERE solution_id=${solutionId}`;
  return row ? String(row.token) : null;
}

export type ResolvedInvite = {
  solutionId: string;
  ownerId: string;
  name: string;
  website: string | null;
};

/** The published listing a link points to, or null for an unknown, replaced or withdrawn one. */
export async function resolveReviewInvite(token: string): Promise<ResolvedInvite | null> {
  if (!isReviewInviteToken(token)) return null;
  const [row] = await solutionsSql()`SELECT s.id,s.owner_id,s.published_data->>'name' AS name,
      s.published_data->>'website' AS website
    FROM solution_review_invites i JOIN founder_solutions s ON s.id=i.solution_id
    WHERE i.token=${token} AND s.published_data IS NOT NULL`;
  return row
    ? {
        solutionId: String(row.id),
        ownerId: String(row.owner_id),
        name: String(row.name),
        website: row.website ? String(row.website) : null,
      }
    : null;
}

/**
 * The buyer's side of SHCWS-135: notices for conversations that started 30 to 90 days
 * ago and still have no review (invite_contact_reviews in db/review-invitations.sql).
 * Returns how many it created.
 */
export async function createContactReviewInvitations(): Promise<number> {
  const [row] = await solutionsSql()`SELECT invite_contact_reviews() AS created`;
  return Number(row?.created ?? 0);
}

/** Whether this account's request to this listing reached a real conversation. */
export async function contactBacked(accountId: string, solutionId: string): Promise<boolean> {
  const [row] =
    await solutionsSql()`SELECT review_contact_backed(${accountId}::uuid,${solutionId}::uuid) AS backed`;
  return Boolean(row?.backed);
}
