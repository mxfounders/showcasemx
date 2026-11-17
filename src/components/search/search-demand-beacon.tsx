'use client';
import { useEffect, useRef } from 'react';
import type { DemandSurface } from '@/lib/search/demand';

/**
 * Counts a search once the person stops typing, and a click on a listing while that
 * search is on screen (SHCWS-107). Aggregate only, like PublicMetrics: nothing that
 * identifies the visitor, and nothing at all with Do Not Track or Global Privacy Control.
 */
export function SearchDemandBeacon({
  query,
  results,
  surface,
}: {
  query: string;
  results: number;
  surface: DemandSurface;
}) {
  const counted = useRef('');
  const current = useRef('');
  useEffect(() => {
    const value = query.trim();
    current.current = '';
    if (
      value.length < 2 ||
      navigator.doNotTrack === '1' ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
    )
      return;
    const timer = window.setTimeout(() => {
      current.current = value;
      if (counted.current === value) return;
      counted.current = value;
      send({ event: 'search', query: value, surface, results });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [query, results, surface]);
  useEffect(() => {
    function click(event: MouseEvent) {
      const link =
        event.target instanceof Element ? event.target.closest('a[href*="/soluciones/"]') : null;
      if (link && current.current) send({ event: 'click', query: current.current, surface });
    }
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, [surface]);
  return null;
}

function send(body: {
  event: 'search' | 'click';
  query: string;
  surface: DemandSurface;
  results?: number;
}) {
  void fetch('/api/search-demand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}
