'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { landingKind, pageSteps } from '@/lib/attribution/classify';
import { sendSteps, takeSteps } from '@/lib/attribution/visit';

/**
 * Counts where a visit came from and the funnel steps no other beacon carries (SHCWS-111,
 * SHCWS-109): the first page of a visit, the first search or category page and the first
 * visit to /aplicar. At most one request per step and visit, nothing with DNT/GPC. On a
 * listing it waits for the listing's own view beacon, which carries the visit, so landing
 * there costs no extra request. Client only: static pages stay static.
 */
export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const send = () => {
      const funnel = takeSteps(pageSteps(pathname));
      if (funnel) sendSteps(funnel);
    };
    if (landingKind(pathname) !== 'listing') return send();
    const timer = window.setTimeout(send, 2000);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}
