import type { Dictionary } from '../../dictionary';

export const notFound = {
  title: 'Page not found',
  description:
    "Sorry, we couldn't find the page you're looking for. It may have been moved or no longer exists.",
  backHome: 'Back to home',
} as const satisfies Dictionary['notFound'];
