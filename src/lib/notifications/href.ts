/**
 * Where a notice may link (§31): inside the account, or to a public list (SHCWS-117:
 * «your project is on a public list»). Anything else falls back to the account home.
 */
export function noticeHref(href: string) {
  return /^\/account(?:\/|$)/.test(href) || /^\/comunidad\/[0-9a-f-]{36}$/.test(href)
    ? href
    : '/account';
}
