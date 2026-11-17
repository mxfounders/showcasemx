import type { PostHog } from 'posthog-js';
import {
  consentCookie,
  consentMaxAge,
  readConsent,
  relayPath,
  withoutUrlFragments,
  type Consent,
} from './consent';

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

/** False when the build has no PostHog project: no banner, no script, nothing to consent to. */
export const analyticsConfigured = Boolean(token && host);

let posthog: PostHog | null = null;
let started = false;
let account: string | null = null;

export function storedConsent(): Consent | null {
  const entry = document.cookie.split('; ').find(part => part.startsWith(`${consentCookie}=`));
  return readConsent(entry?.slice(consentCookie.length + 1));
}

/**
 * Downloads and starts PostHog. Call it only after the visitor accepted: until then the
 * SDK is not even fetched, so nothing is stored and nothing is sent.
 */
export function startAnalytics() {
  if (!token || !host || started) return;
  started = true;
  import('posthog-js')
    .then(({ default: client }) => {
      client.init(token, {
        api_host: relayPath,
        ui_host: host.replace('.i.posthog.com', '.posthog.com'),
        defaults: '2026-05-30',
        person_profiles: 'identified_only',
        // Keep PostHog's cookie on shwcs.site, away from ops.shwcs.site.
        cross_subdomain_cookie: false,
        capture_exceptions: true,
        // Account pages show other people's names and messages: record the click, never its text.
        mask_all_text: true,
        mask_all_element_attributes: true,
        disable_session_recording: true,
        disable_surveys: true,
        before_send: event => (event ? withoutUrlFragments(event) : event),
      });
      posthog = client;
      if (account) client.identify(account);
    })
    .catch(() => {
      started = false;
    });
}

/** Records the visitor's choice and applies it right away. */
export function setConsent(consent: Consent) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${consentCookie}=${consent}; Max-Age=${consentMaxAge}; Path=/; SameSite=Lax${secure}`;
  if (consent === 'granted') return startAnalytics();
  posthog?.opt_out_capturing();
  for (const storage of [localStorage, sessionStorage])
    for (const key of Object.keys(storage)) if (/^(ph_|__ph)/.test(key)) storage.removeItem(key);
  for (const cookie of document.cookie.split('; ')) {
    const name = cookie.split('=')[0];
    if (name.startsWith('ph_')) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
  // A running instance keeps its identity in memory; reloading is the only clean stop.
  if (started) location.reload();
}

/** Links this browser's events to the signed-in account by its id, never by email or name. */
export function identifyAccount(id: string) {
  account = id;
  if (posthog && posthog.get_distinct_id() !== id) posthog.identify(id);
}

/** On sign-out, so the next person on this browser starts anonymous. */
export function forgetAccount() {
  account = null;
  posthog?.reset();
}

/** Errors caught by React error boundaries never reach `window.onerror`. */
export function reportError(error: unknown) {
  posthog?.captureException(error);
}
