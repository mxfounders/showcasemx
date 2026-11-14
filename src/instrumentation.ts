import type { Instrumentation } from 'next';

/** Sends unhandled server errors to PostHog error tracking, identified only by route pattern. */
export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { captureServerError } = await import('./lib/analytics/server');
  await captureServerError(error, {
    route: context.routePath,
    routeType: context.routeType,
  });
};
