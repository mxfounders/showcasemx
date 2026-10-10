import type { Dictionary } from '../../dictionary';

export const newsletter = {
  metaTitle: 'News and updates',
  metaDescription: 'Subscribe to hear about new solutions, updates and announcements from shwcs.',
  hero: 'Subscribe to the newsletter.<br />Stay up to date.',
  formAria: 'Newsletter subscription',
  progressAria: 'Form progress',
  titles: {
    profile: 'What brings you here?',
    role: "What's your role?",
    email: 'Which email should we write to?',
  },
  errors: {
    submit: "We couldn't register your subscription. Please try again.",
    submitCatch:
      "We couldn't confirm your subscription. Try again; we won't duplicate your registration.",
  },
  profiles: {
    founder: { label: "I'm a founder", detail: 'I build or sell a solution.' },
    buyer: { label: "I'm a buyer", detail: "I'm looking for solutions for my company." },
    both: { label: 'A bit of both', detail: 'I build and also look for solutions.' },
    exploring: { label: "I'm exploring", detail: 'I want to see what is being built.' },
  },
  roles: {
    leadership: 'Founder / Leadership',
    product_tech: 'Product / Technology',
    sales_marketing: 'Sales / Marketing',
    operations: 'Operations',
    finance_procurement: 'Finance / Procurement',
    other: 'Other role',
  },
  labels: {
    email: 'Your email address',
    purpose:
      'We will use your email, profile and role to send you relevant news and announcements from shwcs.',
    consent: 'I want to receive news and announcements from shwcs by email.',
    honeypot: 'Leave this field empty',
  },
  placeholders: { email: 'you@email.com' },
  step: 'Step',
  of: 'of',
  registering: 'Registering…',
  subscribeBtn: 'Subscribe',
  continueBtn: 'Continue',
  backBtn: 'Back',
  successTitle: 'Thanks for joining.',
  successDesc:
    "We received your request. If you were already on the list, we won't duplicate your registration.",
  successBtn: 'Explore solutions',
  unsubscribe: {
    metaTitle: 'Unsubscribe from the newsletter',
    doneTitle: "You've been unsubscribed.",
    doneDesc:
      "We won't send you newsletter campaigns again. Account notifications, if you turned them on, are managed separately.",
    back: 'Back to shwcs →',
    title: 'Stop receiving the newsletter.',
    desc: "Confirm to unsubscribe. We won't delete your account or change any transactional notifications you've requested.",
    pending: 'Registering…',
    submit: 'Confirm unsubscribe',
    missingToken: "This link doesn't contain a valid unsubscribe request.",
    error: "We couldn't register your unsubscribe request.",
    genericError: "We couldn't register your unsubscribe request. Please try again.",
  },
  api: {
    useForm: 'Subscribe from the shwcs form.',
    invalidFormat: 'Invalid format.',
    missingEmail: 'Your email is missing.',
    formTooLong: 'The form is too long.',
    unreadableForm: "We couldn't read the form. Please try again.",
    invalidSubscription: 'Check your profile, role and email, and agree to receive updates.',
    subscriptionsDisabled:
      "Subscriptions aren't enabled yet. Your email hasn't been saved; try again later.",
    subscribeTooMany: 'We received several attempts. Wait before subscribing again.',
    subscribeUnavailable:
      "We couldn't register your subscription. We kept your email in the form so you can retry.",
    openFromShwcs: 'Open the link from shwcs.',
    requestTooLong: 'The request is too long.',
    unreadableRequest: "We couldn't read the request.",
    unsubscribeLinkInvalid: "The unsubscribe link isn't valid.",
    unsubscribeDisabled: "Unsubscribing isn't available right now.",
    unsubscribeTooMany: 'Too many attempts. Wait a moment.',
    unsubscribeUnavailable: "We couldn't register your unsubscribe request. Please try again.",
  },
} as const satisfies Dictionary['newsletter'];
