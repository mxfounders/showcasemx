/**
 * The browser half of channel attribution (SHCWS-111, docs/attribution.md). A visit
 * remembers, in sessionStorage under `shwcs-visit`, the raw signals of the page it started
 * on and which funnel steps it already counted, so every step is counted once per visit
 * and a sign-up can say where its visit came from. No cookie, no identifier: the entry
 * dies with the tab and only ever leaves the browser inside an aggregate count or the
 * sign-up form. With Do Not Track or Global Privacy Control nothing is read or written.
 * Browser only: call it from effects and event handlers.
 */
import { impliedRef, landingKind, type FunnelStep, type RawTouch } from './classify';

const key = 'shwcs-visit';
/** A visit ends after thirty minutes without a page, as most analytics count it. */
const idle = 30 * 60_000;

type VisitState = { v: 1; touch: RawTouch; steps: FunnelStep[]; at: number };

let memory: VisitState | null = null;
let evaluated = false;

export function trackingAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack !== '1' && !nav.globalPrivacyControl && !nav.webdriver;
}

function load(): VisitState | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key) ?? 'null') as VisitState | null;
    return value?.v === 1 && Array.isArray(value.steps) && typeof value.at === 'number'
      ? value
      : null;
  } catch {
    return null;
  }
}

function save(state: VisitState) {
  memory = state;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Private windows and full storage keep the visit in memory for this page only.
  }
}

/** The raw signals of the current page: its tags and the host that linked to it. */
function pageTouch(): RawTouch {
  const params = new URLSearchParams(window.location.search);
  const get = (name: string) => params.get(name) ?? undefined;
  let referrer: string | undefined;
  try {
    const from = document.referrer ? new URL(document.referrer) : null;
    if (from && from.host !== window.location.host) referrer = from.hostname;
  } catch {
    referrer = undefined;
  }
  return {
    source: get('utm_source'),
    medium: get('utm_medium'),
    campaign: get('utm_campaign'),
    ref: get('ref') ?? impliedRef(window.location.pathname),
    referrer,
    landing: landingKind(window.location.pathname),
  };
}

const signalOf = (touch: RawTouch) =>
  [touch.source, touch.medium, touch.campaign, touch.ref, touch.referrer]
    .map(value => value ?? '')
    .join('|');

/**
 * The current visit, starting a new one on a full page load when there is none, when the
 * last one went idle, or when this page arrived from a new campaign or another site.
 * Reloads and back/forward keep the visit they belong to.
 */
export function currentVisit(): VisitState | null {
  if (!trackingAllowed()) return null;
  let state = memory ?? load();
  if (!evaluated) {
    evaluated = true;
    const touch = pageTouch();
    const navigation = performance.getEntriesByType?.('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    const arrived = !navigation || navigation.type === 'navigate';
    const newSignal = signalOf(touch).replace(/\|/g, '') !== '';
    if (
      !state ||
      Date.now() - state.at > idle ||
      (arrived && newSignal && signalOf(touch) !== signalOf(state.touch))
    )
      state = { v: 1, touch, steps: [], at: Date.now() };
  }
  if (!state) return null;
  save({ ...state, at: Date.now() });
  return memory;
}

/**
 * Marks the visit and the wanted steps as counted and returns what is still to send, or
 * null when everything was counted already. Whoever calls first carries the visit step,
 * so a listing's own view beacon counts the visit that landed on it.
 */
export function takeSteps(
  wanted: FunnelStep[] = [],
): { steps: FunnelStep[]; touch: RawTouch } | null {
  const state = currentVisit();
  if (!state) return null;
  const steps = (['visit', ...wanted] as FunnelStep[]).filter(
    (step, index, all) => all.indexOf(step) === index && !state.steps.includes(step),
  );
  if (!steps.length) return null;
  save({ ...state, steps: [...state.steps, ...steps] });
  return { steps, touch: state.touch };
}

/** What the sign-up form sends about its visit, or nothing with DNT/GPC. */
export function signupOrigin(next: string) {
  const state = currentVisit();
  if (!state) return undefined;
  return { touch: state.touch, applied: state.steps.includes('apply'), next };
}

/** Sends funnel steps on their own, for pages without a beacon of their own. */
export function sendSteps(funnel: { steps: FunnelStep[]; touch: RawTouch }) {
  void fetch('/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(funnel),
    keepalive: true,
  }).catch(() => undefined);
}
