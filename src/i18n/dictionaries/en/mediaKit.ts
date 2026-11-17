import type { Dictionary } from '../../dictionary';

export const mediaKit = {
  meta: {
    title: 'Advertise on shwcs',
    description:
      'Sponsored placements by the day on shwcs: audience measured without cookies, public prices and clear rules.',
  },
  hero: {
    title: 'Reach people choosing B2B software and services',
    lead: 'Sponsored placements by the day, kept apart from the catalog order. Every number on this page comes from our own metrics, with no cookies or pixels.',
    primary: 'Promote my listing',
    secondary: 'Talk to us',
  },
  audience: {
    title: 'Audience',
    window: 'Views from {from} to {to}',
    views: '{n} views',
    since: 'measured since {date}',
    none: 'No views measured yet',
    topCategories: 'Most viewed categories',
    newsletterSoon: 'We do not send campaigns yet. We will publish subscribers once we start.',
    note: 'Page views counted on our server, one per tab: they are not unique people. Visitors who ask not to be tracked (Do Not Track or GPC) are not counted.',
  },
  people: {
    title: 'Who uses shwcs',
    accounts: 'Registered accounts',
    subscribers: 'Newsletter subscribers',
    fewer: 'Fewer than {n}',
    profiles: {
      buyer: 'Looking for solutions',
      founder: 'Listing their project',
      both: 'Both',
      exploring: 'Exploring',
      unknown: 'No profile declared',
    },
    threshold:
      'We publish the breakdown from {n} up: below that, a percentage could point at someone.',
  },
  placements: {
    title: 'Placements',
    perDay: '{rate} per day',
    slots: 'Up to {n} spots per day',
    slotsOne: 'One spot per day',
    open: 'Available',
    closed: 'Closed for now',
    noRate: 'Price to be published',
    taxes: 'Prices before tax, which is worked out for your country at checkout.',
    example: 'How it looks',
    exampleName: 'Your project',
  },
  rules: {
    title: 'Rules',
    items: [
      'Always labelled «Sponsored» and kept apart from the results.',
      'Never changes the order of the catalog, search or comparisons.',
      'Only listings approved by the editorial team.',
      'No third-party pixels or cookies: we count impressions and clicks on our server.',
      'Paid by the day. If you cancel, we refund every day that starts at least 24 hours later.',
    ],
    terms: 'Full advertising terms',
  },
  cta: {
    title: 'Ready to appear?',
    body: 'Choose your listing, the placement and the days. You pay on the same page.',
  },
  updated: 'Data read on {date}',
} as const satisfies Dictionary['mediaKit'];
