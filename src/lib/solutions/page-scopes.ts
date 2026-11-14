/** The page up to and including its </head>, or all of it when there is none. */
export function headOf(html: string): string {
  return html.slice(0, html.toLowerCase().indexOf('</head>') + 1 || html.length);
}

/**
 * Where a page declares itself: its <head> first, then the rest of the page. Frameworks
 * that stream metadata (React 19, Next.js for most user agents) emit the same <meta>
 * and <link> tags after the head, sometimes a megabyte in. Read by the cover and logo
 * readers (site-image.ts, site-icon.ts).
 */
export function metadataScopes(html: string): string[] {
  const head = headOf(html);
  return head.length < html.length ? [head, html.slice(head.length)] : [head];
}
