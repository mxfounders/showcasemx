import type { Dictionary } from '../../dictionary';

export const common = {
  skipToContent: 'Skip to content',
  homeLink: 'shwcs, back to home',
  clearSearch: 'Close and clear search',
  loading: 'Loading',
  loadingSolutions: 'Loading solutions',
  loadingListing: 'Loading listing',
  loadingLists: 'Loading lists',
  cookiePreferences: 'Cookie preferences',
  verifiedBy: 'Verified by shwcs',
  responseWithinHours: 'Usually replies within {hours} h',
  responseWithinDays: 'Usually replies within {days} days',
  responseRate: '{answered} of {requests} answered',
  responseFast: 'Replies fast',
  domainVerified: 'Domain verified · {date}',
  domainVerifiedHint:
    "Proved with a TXT record that it controls its site's domain. Not a check of legal identity or of the product.",
} as const satisfies Dictionary['common'];
