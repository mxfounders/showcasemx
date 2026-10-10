import type { Dictionary } from '../../dictionary';

export const changelog = {
  metaTitle: 'What changes in shwcs',
  heroTitle: "What's new in shwcs",
  heroDesc1: 'A log of the changes you can already use in shwcs.',
  heroDesc2:
    'We publish features when they are available. Ideas that are still in development stay out until they become real.',
  feedbackBtn: 'Tell us what you would improve',
  filterTitle: 'Filter releases',
  categoryLabel: 'Category',
  releaseLabel: 'release',
  releasesLabel: 'releases',
  updateLabel: 'update',
  updatesLabel: 'updates',
  filterAria: 'Filter releases by category',
  categories: {
    all: 'All',
    product: 'Product',
    community: 'Community',
    panel: 'Dashboard',
    account: 'Account',
  },
  months: {
    september: 'September 2026',
    august: 'August 2026',
  },
  releases: {
    capabilities: {
      date: 'September 5, 2026',
      label: 'New',
      title: 'Filter by what a project does, not just by its category',
      summary:
        'Every project can declare its concrete capabilities — quotes, CFDI invoicing, payroll, integrations and more — so the catalog finds it by what it actually solves.',
      items: [
        'New filters by capability, integrations, price range, time to launch and regulatory compliance in /explorar, /industria and /colecciones.',
        'A filter only appears when at least one real project covers it — no options that lead nowhere.',
        'The application form suggests capabilities based on what you already wrote; it never selects them for you.',
      ],
    },
    conceptSearch: {
      date: 'September 5, 2026',
      label: 'Search',
      title: 'Search understands concepts, not just exact words',
      summary:
        'Searching for "cotizaciones de mayoreo" (wholesale quotes) or "agencias que cotizan" (agencies that quote) now finds Sales projects even if their listing never uses those words.',
      items: [
        'Dedicated vocabulary for each category, industry and declared capability.',
        'Literal matches come first; the expanded vocabulary never outranks them.',
        'Works the same in the catalog and in your saved projects.',
      ],
    },
    listingSocial: {
      date: 'September 3, 2026',
      label: 'Community',
      title: 'Every listing now has likes and comments',
      summary:
        'The same social layer that community lists already had comes to project listings, with a catalog order based on real interaction.',
      items: [
        "Like or comment on any listing with your account; a founder can't do it on their own.",
        'The catalog order now reflects that activity, giving more weight to comments than to saves, and to saves than to likes.',
        'Only activity from accounts with a verified email counts.',
      ],
    },
    listingCover: {
      date: 'September 3, 2026',
      label: 'Product',
      title: 'Automatic cover and real logos on every listing',
      summary:
        "As soon as you enter your website, your listing already has a cover — and each project's social profiles are shown with their real logo.",
      items: [
        "The cover is read from the project's own website and stored as our own copy, never as an external link.",
        'LinkedIn, X, Instagram, YouTube, GitHub, TikTok and Product Hunt logos next to each link.',
        "An image carousel brings together the cover and the founder's screenshots on every listing.",
      ],
    },
    welcome: {
      date: 'September 3, 2026',
      label: 'Account',
      title: 'A three-step welcome to get to know you better',
      summary:
        'Before you enter your dashboard, shwcs asks for your name, your profile and your role — so your home page adapts to you from the very first moment.',
      items: [
        'Name and company, profile (buyer, founder, both or exploring) and role.',
        'Google accounts that already include a name skip that first step.',
        "It doesn't change permissions or account type; only your home experience.",
      ],
    },
    identity: {
      date: 'September 1, 2026',
      label: 'Now',
      title: 'shwcs now has a voice and a place of its own',
      summary:
        'The public experience now brings together a clearer identity, editorial pages and better ways to discover what we are building.',
      items: [
        'New visual identity across navigation, account and public pages.',
        'Editorial blog with search, categories and optimized reading.',
        'Guided contact that adapts the questions to the reason for each conversation.',
      ],
    },
    publicLists: {
      date: 'August 31, 2026',
      label: 'Community',
      title: 'Lists are no longer just private folders',
      summary:
        'A selection can now organize a purchase, be shared with other people and become a conversation starter.',
      items: [
        'Private and public lists with categories.',
        'Browse by popularity or date.',
        'Likes, saves and comments on public lists.',
      ],
    },
    founderSignals: {
      date: 'August 31, 2026',
      label: 'Operations',
      title: 'More signals for those who present a project',
      summary:
        'The dashboard brings together the status of listings, conversations and the activity that helps you understand what sparks interest.',
      items: [
        'View and click metrics with daily activity.',
        'Notification center inside your account.',
        'Tracking of opportunities and contact requests.',
      ],
    },
    oneAccount: {
      date: 'August 30, 2026',
      label: 'Foundation',
      title: 'One account to discover and to build',
      summary:
        'Sign-in, saved projects and project publishing share the same account, with clear controls for each space.',
      items: [
        'Secure sign-in and account recovery.',
        'Saved projects, private notes and project comparison.',
        'Drafts, editorial review and verified domain control.',
      ],
    },
  },
  footerTitle: 'Should something work better?',
  footerDesc: "Tell us what gets in your way, what's missing, or what you expected to find.",
  footerBtn: 'Open a conversation',
} as const satisfies Dictionary['changelog'];
