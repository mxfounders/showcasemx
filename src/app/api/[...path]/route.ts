// Any /api path no route handles. Without this catch-all, Next matched it against
// /[locale]/[...catchAll] and rendered the whole not-found page with a 200 status
// (CLAUDE.md §79). An empty 404 is cached by the CDN, so a scanner repeating the same
// probe stops reaching a function at all; each deployment starts with a fresh cache.
function notFound() {
  return new Response(null, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=86400' },
  });
}

export {
  notFound as GET,
  notFound as HEAD,
  notFound as POST,
  notFound as PUT,
  notFound as PATCH,
  notFound as DELETE,
  notFound as OPTIONS,
};
