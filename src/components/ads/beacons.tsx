'use client';

import { useEffect } from 'react';
import type { AdPlacement } from '@/lib/ads/model';

/**
 * First-party, aggregate-only measurement for sponsored slots: no cookies, no identifiers,
 * nothing sent when the browser asks not to be tracked (Do Not Track or Global Privacy
 * Control). The server applies the same rules again (/api/ads/events, /api/ads/reach).
 */
function trackingAllowed() {
  return !(
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  );
}

function send(path: string, body: Record<string, string>) {
  void fetch(path, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}

/** Once per tab: a reload or going back does not count the same visit twice. */
function firstTime(key: string) {
  try {
    if (sessionStorage.getItem(key) === '1') return false;
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage blocked: count it; the server rate-limits repeats.
  }
  return true;
}

/** A view of a page that carries a sponsored slot, for the reach estimate (SHCWS-72). */
export function PlacementBeacon({
  placement,
  scope = '',
}: {
  placement: AdPlacement;
  scope?: string;
}) {
  useEffect(() => {
    if (trackingAllowed()) send('/api/ads/reach', { placement, scope });
  }, [placement, scope]);
  return null;
}

/**
 * The listing was opened from a sponsored card (`?from=sponsored&ad=<booking>`): counts
 * the visit, and every click from it to the project's official site (SHCWS-70).
 */
export function SponsoredVisit({
  bookingId,
  solutionId,
}: {
  bookingId: string;
  solutionId: string;
}) {
  useEffect(() => {
    if (!trackingAllowed()) return;
    if (firstTime(`shwcs-ad-visit:${bookingId}`)) {
      send('/api/ads/events', { bookingId, solutionId, kind: 'visit' });
    }
    function click(event: MouseEvent) {
      const link =
        event.target instanceof Element ? event.target.closest('a[data-official-site]') : null;
      if (link) send('/api/ads/events', { bookingId, solutionId, kind: 'site' });
    }
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, [bookingId, solutionId]);
  return null;
}

/**
 * The buyer opened the contact form from a sponsored visit: the request they send is then
 * counted for that booking (src/lib/ads/server.ts, recordContactIntent).
 */
export function SponsoredContactIntent({
  bookingId,
  solutionId,
}: {
  bookingId: string;
  solutionId: string;
}) {
  useEffect(() => {
    if (trackingAllowed()) send('/api/ads/events', { bookingId, solutionId, kind: 'contact' });
  }, [bookingId, solutionId]);
  return null;
}
