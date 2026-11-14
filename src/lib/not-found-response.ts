import type { Locale } from '@/i18n/config';
import { commonText } from '@/i18n/common';
import { notFound as en } from '@/i18n/dictionaries/en/notFound';
import { notFound as es } from '@/i18n/dictionaries/es/notFound';

/**
 * The middleware's 404 for paths that cannot be a page: a real 404 status and a
 * couple of KB of self-contained HTML, sent without starting React or touching the
 * database. Same copy and palette as src/app/[locale]/not-found.tsx, which still
 * covers the misses only a page can detect (an unknown solution id).
 */
export function notFoundResponse(locale: Locale): Response {
  const text = locale === 'en' ? en : es;
  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${text.title} | shwcs</title>
<link rel="icon" href="/favicon.ico" sizes="any">
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f4;color:#1c1917;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:28rem;padding:48px 24px;text-align:center}
.brand{display:inline-block;margin-bottom:40px}
.brand img{display:block;height:26px;width:auto}
h1{margin:0;font-size:8rem;line-height:1;font-weight:700;letter-spacing:-0.05em;color:#365DC4}
.title{margin:24px 0 0;font-size:1.375rem;font-weight:500}
.description{margin:12px 0 0;color:#78716c;line-height:1.6}
.home{display:inline-flex;align-items:center;height:48px;margin-top:40px;padding:0 32px;border-radius:9999px;background:#E4EBFC;color:#365DC4;font-size:.875rem;font-weight:500;text-decoration:none}
a:focus-visible{outline:2px solid #365DC4;outline-offset:3px;border-radius:9999px}
</style>
</head>
<body>
<main>
<a class="brand" href="/${locale}" aria-label="${commonText(locale).homeLink}"><img src="/brand/shwcs-logo-1.png" alt="" height="26"></a>
<h1>404</h1>
<p class="title">${text.title}</p>
<p class="description">${text.description}</p>
<a class="home" href="/${locale}">${text.backHome}</a>
</main>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'noindex',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
