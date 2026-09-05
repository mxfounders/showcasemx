/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'" },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
];
const nextConfig = {
  poweredByHeader: false,
  images: {
    // Custom loader (src/lib/images/loader.js): rewrites founder-screenshot URLs
    // to ?w=<400|800|1600>, everything else passes through. No remotePatterns
    // needed — the loader never proxies, and every URL is same-origin.
    loader: 'custom',
    loaderFile: './src/lib/images/loader.js',
    deviceSizes: [400, 800, 1600],
    imageSizes: [400],
  },
  async headers() { return [{ source: '/:path*', headers: securityHeaders }]; },
};

export default nextConfig;
