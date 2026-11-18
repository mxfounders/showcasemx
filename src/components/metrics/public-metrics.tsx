'use client';
import { useEffect, useRef } from 'react';
import { takeSteps } from '@/lib/attribution/visit';
// Aggregate events only: no visitor ID, cookie, fingerprint or buyer list data. The view
// carries the visit's funnel steps (SHCWS-109/111): only the channel of the visit (the
// linking site's host, never its path), once per visit.
export function PublicMetrics({ solutionId }: { solutionId: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (
      navigator.doNotTrack === '1' ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
    )
      return;
    function record(event: 'view' | 'click') {
      // Reaching a listing also counts as exploring: the funnel never skips a step.
      const funnel = event === 'view' ? takeSteps(['browse', 'listing']) : null;
      void fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutionId, event, ...(funnel ? { funnel } : {}) }),
        keepalive: true,
      }).catch(() => {});
    }
    if (!fired.current) {
      fired.current = true;
      record('view');
    }
    function click(e: MouseEvent) {
      const target = e.target instanceof Element ? e.target.closest('a[data-official-site]') : null;
      if (target) record('click');
    }
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, [solutionId]);
  return null;
}
