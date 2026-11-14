import { contentSecurityPolicy } from './src/lib/content-security-policy.mjs';

/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy({
      dev: process.env.NODE_ENV !== 'production',
      preview: process.env.VERCEL_ENV === 'preview',
    }),
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];
// PostHog is proxied through /relay (src/lib/analytics/consent.ts) so the browser only
// ever talks to shwcs.site. Its assets live on a sibling host: us.i → us-assets.i.
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogAssets = posthogHost?.replace('.i.posthog.com', '-assets.i.posthog.com');

const nextConfig = {
  poweredByHeader: false,
  // PostHog's endpoints end in a slash; middleware.ts still trims it from page URLs.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    if (!posthogHost) return [];
    return [
      { source: '/relay/static/:path*', destination: `${posthogAssets}/static/:path*` },
      { source: '/relay/array/:path*', destination: `${posthogAssets}/array/:path*` },
      { source: '/relay/:path*', destination: `${posthogHost}/:path*` },
    ];
  },
  images: {
    // Custom loader (src/lib/images/loader.js): rewrites founder-screenshot URLs
    // to ?w=<400|800|1600>, everything else passes through. No remotePatterns
    // needed — the loader never proxies, and every URL is same-origin.
    loader: 'custom',
    loaderFile: './src/lib/images/loader.js',
    deviceSizes: [400, 800, 1600],
    imageSizes: [400],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The payment form (Stripe Elements) runs only on the promote page. When two entries
      // set the same header for a path, Next keeps the last one.
      {
        source: '/:locale(es|en)/account/solutions/:id/promote',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy({
              dev: process.env.NODE_ENV !== 'production',
              preview: process.env.VERCEL_ENV === 'preview',
              stripe: true,
            }),
          },
        ],
      },
    ];
  },
  async redirects() {
    // /explorar/soporte showed Operación under the title «Atención al cliente» until that
    // became a category of its own (src/lib/taxonomy.ts); old links land on the real one.
    return [
      {
        source: '/:locale(es|en)/explorar/soporte',
        destination: '/:locale/explorar/atencion-clientes',
        permanent: true,
      },
      {
        source: '/explorar/soporte',
        destination: '/explorar/atencion-clientes',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
