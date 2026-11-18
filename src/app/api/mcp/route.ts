import { NextRequest, NextResponse, after } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { authenticateToken, readBearer, touchToken } from '@/lib/assistant/tokens';
import { assistantServer } from '@/lib/assistant/server';
export const runtime = 'nodejs';
// A draft prepared from the founder's website reads up to five pages and calls the model.
export const maxDuration = 180;

/**
 * The MCP server for the founder's AI assistant (SHCWS-152, docs/assistant-mcp.md):
 * Streamable HTTP without sessions, so any instance can answer any request (Fluid
 * Compute). Each POST authenticates its bearer token again, which is what makes a
 * revocation take effect on the very next call. Answers are plain JSON, never a stream.
 *
 * Only `Authorization: Bearer <token>`; a session cookie never authenticates here, and a
 * token is never read from the URL. No CORS headers: browsers can't call it cross-site.
 */
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function rpcError(status: number, code: number, message: string, extra: HeadersInit = {}) {
  return NextResponse.json(
    { jsonrpc: '2.0', error: { code, message }, id: null },
    { status, headers: { ...headers, ...extra } },
  );
}

const unauthorized = () =>
  rpcError(401, -32001, 'Invalid or missing token.', {
    'WWW-Authenticate': 'Bearer realm="shwcs", error="invalid_token"',
  });

export async function POST(request: NextRequest) {
  const token = readBearer(request.headers.get('authorization'));
  if (!token) return unauthorized();
  let identity;
  try {
    identity = await authenticateToken(token);
    if (!identity) {
      // A wrong token costs its network one of a few attempts an hour.
      const allowed = await securityLimit('assistant-auth', requestIdentity(request.headers), 30);
      return allowed ? unauthorized() : rpcError(429, -32002, 'Too many attempts.');
    }
    if (!(await securityLimit('assistant-mcp', identity.tokenId, 300, 600)))
      return rpcError(429, -32002, 'Too many requests for this token. Try again later.', {
        'Retry-After': '600',
      });
  } catch {
    return rpcError(503, -32603, 'Temporarily unavailable.');
  }
  const tokenId = identity.tokenId;
  after(() => touchToken(tokenId).catch(() => undefined));
  try {
    const server = await assistantServer({ identity, origin: request.nextUrl.origin });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: 64 * 1024,
    });
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    await server.close().catch(() => undefined);
    const merged = new Headers(response.headers);
    for (const [key, value] of Object.entries(headers)) merged.set(key, value);
    return new Response(response.body, { status: response.status, headers: merged });
  } catch {
    return rpcError(500, -32603, 'Internal error.');
  }
}

/** No server-initiated stream and no session to end in stateless mode. */
function notAllowed() {
  return rpcError(405, -32000, 'Method not allowed.', { Allow: 'POST' });
}
export const GET = notAllowed;
export const DELETE = notAllowed;
