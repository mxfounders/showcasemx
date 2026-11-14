import { analyticsConfigured, startAnalytics, storedConsent } from '@/lib/analytics/client';

if (!analyticsConfigured) {
  if (process.env.NODE_ENV === 'development') {
    const variable = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
      ? 'NEXT_PUBLIC_POSTHOG_HOST'
      : 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN';
    console.error(
      `${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`,
    );
  }
} else if (storedConsent() === 'granted') {
  startAnalytics();
}
