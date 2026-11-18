import { headers } from 'next/headers';
import { siteOrigin } from '@/lib/seo';

/**
 * The address of the MCP server as this request reached the site: shwcs.site in
 * production, the local origin in development, so the instructions always point at
 * the server the founder is using.
 */
export async function mcpEndpoint() {
  const list = await headers();
  const host = list.get('x-forwarded-host') ?? list.get('host');
  const proto = list.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  const origin = host && /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `${proto}://${host}` : siteOrigin;
  return `${origin}/api/mcp`;
}
