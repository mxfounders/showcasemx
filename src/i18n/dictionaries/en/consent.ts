import type { Dictionary } from '../../dictionary';

export const consent = {
  label: 'Cookie preferences',
  title: 'Optional analytics',
  body: 'With your permission we use PostHog to see which parts of shwcs get used and to catch errors. If you decline, it never loads.',
  learnMore: 'How it works',
  accept: 'Accept',
  reject: 'Decline',
  current: {
    granted: 'Currently accepted.',
    denied: 'Currently declined.',
  },
  close: 'Close',
} as const satisfies Dictionary['consent'];
