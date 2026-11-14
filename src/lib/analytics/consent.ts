/**
 * Product analytics (PostHog) runs only after a visitor accepts it in the consent
 * banner. The decision lives in a first-party cookie so the server can honour it too:
 * server-side events are sent only when the request carries `granted`.
 */
export const consentCookie = 'shwcs-analytics';

/** Six months, after which the banner asks again. */
export const consentMaxAge = 60 * 60 * 24 * 182;

/** Same-origin path that next.config.mjs rewrites to PostHog, so the browser never talks to a third party. */
export const relayPath = '/relay';

/** Window event that reopens the banner from "Cookie preferences" links. */
export const consentPreferencesEvent = 'shwcs:consent-preferences';

export type Consent = 'granted' | 'denied';

export function readConsent(value: string | undefined | null): Consent | null {
  return value === 'granted' || value === 'denied' ? value : null;
}

type EventPayload = {
  properties: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
};

const urlWithFragment = /^(https?:\/\/[^#]*)#[\s\S]*$/;

/**
 * Drops the `#fragment` from every URL an event carries. Password-reset and
 * email-verification links put their one-time token there, and PostHog records
 * `location.href` as `$current_url`.
 */
export function withoutUrlFragments<Event extends EventPayload>(event: Event): Event {
  const clean = (values: Record<string, unknown> | undefined) => {
    if (!values) return values;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values))
      result[key] = typeof value === 'string' ? value.replace(urlWithFragment, '$1') : value;
    return result;
  };
  return {
    ...event,
    properties: clean(event.properties) ?? {},
    ...(event.$set ? { $set: clean(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: clean(event.$set_once) } : {}),
  } as Event;
}
