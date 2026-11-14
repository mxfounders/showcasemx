import { after, type NextRequest } from 'next/server';
import { PostHog } from 'posthog-node';
import { consentCookie, readConsent } from './consent';

let client: PostHog | null = null;
let warned = false;

function posthogClient() {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!token || !host) {
    if (process.env.NODE_ENV === 'development' && !warned) {
      warned = true;
      const variable = token ? 'NEXT_PUBLIC_POSTHOG_HOST' : 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN';
      console.error(
        `${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`,
      );
    }
    return null;
  }
  client ??= new PostHog(token, { host, flushAt: 1, flushInterval: 0 });
  return client;
}

type EventProperties = Record<string, string | number | boolean>;

/**
 * Records a product event for the signed-in account, only when this browser accepted
 * analytics. Sent after the response, so delivery never slows or changes the outcome of
 * an action that already succeeded. Properties carry categories and counts, never what
 * people wrote.
 */
export function captureServerEvent(
  request: NextRequest,
  accountId: string,
  event: string,
  properties: EventProperties = {},
) {
  if (readConsent(request.cookies.get(consentCookie)?.value) !== 'granted') return;
  const posthog = posthogClient();
  if (!posthog) return;
  after(async () => {
    try {
      posthog.capture({ distinctId: accountId, event, properties });
      await posthog.flush();
    } catch {
      // Analytics delivery must not change the outcome of a completed product action.
    }
  });
}

/**
 * Reports an unhandled server error. It carries the route pattern and the stack, no
 * account, cookie or request data, so it does not depend on the visitor's consent.
 */
export async function captureServerError(error: unknown, properties: EventProperties) {
  const posthog = posthogClient();
  if (!posthog) return;
  try {
    await posthog.captureExceptionImmediate(error, undefined, {
      ...properties,
      $process_person_profile: false,
      $geoip_disable: true,
    });
  } catch {
    // Reporting an error must never raise another one.
  }
}
