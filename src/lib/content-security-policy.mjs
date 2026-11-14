/**
 * The product's Content-Security-Policy (SHCWS-159), read by next.config.mjs.
 *
 * It names every place a page may load from: shwcs itself, plus Vercel's preview toolbar
 * on preview deployments and the analytics debug scripts in development. PostHog goes
 * through /relay and Vercel Analytics through /_vercel, so neither needs a host here.
 *
 * `script-src` still allows inline scripts: the App Router writes its page data as inline
 * <script> tags, and only a per-request nonce can tell those apart from an injected one.
 * A nonce makes every page render on request, so it is a separate decision (see the
 * follow-up issue in SHCWS-159). Until then this blocks scripts, frames, fetches and
 * images from other origins, plugins, <base> hijacking and framing by other sites.
 *
 * `stripe` is only for the page that takes a payment (the promote page): Stripe.js loads
 * from js.stripe.com, the card, address and tax id fields are Stripe iframes, 3-D Secure
 * opens in a hooks.stripe.com frame and the fields talk to api.stripe.com (Stripe's CSP
 * guide). Card data never touches shwcs; every other page keeps these origins out.
 *
 * @param {{ dev?: boolean, preview?: boolean, stripe?: boolean }} [options]
 * @returns {string}
 */
export function contentSecurityPolicy({ dev = false, preview = false, stripe = false } = {}) {
  const live = preview ? ['https://vercel.live'] : [];
  const stripeScripts = stripe ? ['https://js.stripe.com', 'https://*.js.stripe.com'] : [];
  const stripeFrames = stripe
    ? ['https://js.stripe.com', 'https://*.js.stripe.com', 'https://hooks.stripe.com']
    : [];
  /** @type {Record<string, string[]>} */
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'", 'https://va.vercel-scripts.com'] : []),
      ...live,
      ...stripeScripts,
    ],
    'style-src': ["'self'", "'unsafe-inline'", ...live],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      ...(preview ? [...live, 'https://vercel.com'] : []),
      ...(stripe ? ['https://*.stripe.com'] : []),
    ],
    'font-src': ["'self'", 'data:', ...(preview ? [...live, 'https://assets.vercel.com'] : [])],
    'connect-src': [
      "'self'",
      ...(dev ? ['ws:', 'wss:'] : []),
      ...(preview ? [...live, 'wss://ws-us3.pusher.com'] : []),
      ...(stripe ? ['https://api.stripe.com', 'https://merchant-ui-api.stripe.com'] : []),
    ],
    'frame-src': preview || stripe ? [...live, ...stripeFrames] : ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'media-src': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
  };
  return [
    ...Object.entries(directives).map(([name, sources]) => `${name} ${sources.join(' ')}`),
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
