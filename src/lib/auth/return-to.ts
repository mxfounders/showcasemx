import { isSolutionId } from '@/lib/solutions/model';
import { validProjectKey } from '@/lib/library/model';
import { briefHref, readBriefPrefill } from '@/lib/briefs/links';
export function authReturnTo(value: unknown): string {
  if (typeof value !== 'string') return '/account';
  if (
    [
      '/account',
      '/account/solutions',
      '/account/solutions/new',
      '/account/saved',
      '/account/lists',
      '/account/contacts',
      '/account/opportunities',
      '/account/alerts',
      '/account/briefs',
      '/account/briefs/new',
      '/account/needs',
    ].includes(value)
  )
    return value;
  if (value.startsWith('/account/contacts/new?')) {
    const params = new URLSearchParams(value.slice(value.indexOf('?') + 1));
    const id = params.get('solution');
    // `ad` is the sponsored booking the buyer came from (SHCWS-70); only a UUID survives.
    const ad = params.get('ad');
    if (id && isSolutionId(id)) {
      return '/account/contacts/new?solution=' + id + (ad && isSolutionId(ad) ? '&ad=' + ad : '');
    }
  }
  if (
    /^\/account\/opportunities\/[a-f0-9-]+$/i.test(value) &&
    isSolutionId(value.slice('/account/opportunities/'.length))
  )
    return value;
  if (
    /^\/account\/contacts\/[a-f0-9-]+$/i.test(value) &&
    isSolutionId(value.slice('/account/contacts/'.length))
  )
    return value;
  // «Publica tu necesidad» from a search or category (SHCWS-58): only the bounded need and
  // a known category survive, rebuilt from scratch.
  if (value.startsWith('/account/briefs/new?')) {
    const params = new URLSearchParams(value.slice(value.indexOf('?') + 1));
    const prefill = readBriefPrefill({
      necesidad: params.get('necesidad') ?? undefined,
      categoria: params.get('categoria') ?? undefined,
    });
    return briefHref(prefill.problem, prefill.categories[0]);
  }
  // A brief or a matched need from a notice email (SHCWS-58).
  const brief = /^\/account\/(briefs|needs)\/([a-f0-9-]+)$/i.exec(value);
  if (brief && isSolutionId(brief[2])) return value;
  // A public listing, to follow it after signing in (SHCWS-24). By UUID: it redirects to
  // the listing's current address, and nothing else is accepted.
  if (/^\/soluciones\/[a-f0-9-]+$/i.test(value) && isSolutionId(value.slice('/soluciones/'.length)))
    return value;
  // Review invitations (SHCWS-132, SHCWS-135): the founder's link and shwcs's own.
  if (/^\/resenar\/[a-f0-9]{32}$/.test(value)) return value;
  if (
    /^\/account\/reviews\/[a-f0-9-]+$/i.test(value) &&
    isSolutionId(value.slice('/account/reviews/'.length))
  )
    return value;
  if (value.startsWith('/account/saved?')) {
    const params = new URLSearchParams(value.slice(value.indexOf('?') + 1));
    const key = params.get('project');
    if (validProjectKey(key)) return `/account/saved?project=${encodeURIComponent(key)}`;
  }
  return '/account';
}

/**
 * The project someone wanted to save before signing in (`/account/saved?project=KEY`).
 * The sign-in form saves it right after the session opens (SHCWS-26): the person asked by
 * submitting that form, so no GET link ever changes anything by itself (§5).
 */
export function pendingSave(returnTo: string): string | null {
  if (!returnTo.startsWith('/account/saved?')) return null;
  const key = new URLSearchParams(returnTo.slice(returnTo.indexOf('?') + 1)).get('project');
  return validProjectKey(key) ? key : null;
}
