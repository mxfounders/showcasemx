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
      "We'll email you to confirm your address: you'll only get the newsletter after confirming. We use your email, profile and role to send you shwcs news; clicks are counted as totals, never per person.",
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
  successTitle: 'Check your inbox',
  successDesc:
    "We sent you a link to confirm your subscription; it expires in 7 days. We won't send the newsletter until you open it. If you were already subscribed, we won't duplicate your registration.",
  successBtn: 'Explore solutions',
  confirm: {
    metaTitle: 'Confirm subscription',
    title: 'Confirm your subscription',
    desc: 'One click and you will start getting the shwcs newsletter. You can unsubscribe from any email.',
    submit: 'Confirm subscription',
    pending: 'Confirming…',
    openLink: 'Open the full link we emailed you.',
    doneTitle: 'Subscription confirmed',
    doneDesc: "You're on the list. Every email has a one-click unsubscribe link.",
    back: 'Explore solutions →',
    error: "We couldn't confirm your subscription.",
    genericError: "We couldn't confirm your subscription. Please try again.",
  },
  mail: {
    confirm: {
      subject: 'Confirm your shwcs subscription',
      heading: 'Confirm your subscription',
      paragraphs: [
        'We received a request to subscribe this address to the shwcs newsletter.',
        "Confirm it with the button. If it wasn't you, ignore this email: we won't send you campaigns.",
      ],
      button: 'Confirm subscription',
      footer: 'The link expires in 7 days and works only once.',
    },
    reconfirm: {
      subject: 'Do you still want the shwcs newsletter?',
      heading: 'Should we keep writing?',
      paragraphs: [
        'You subscribed to the shwcs newsletter. We now ask every address to confirm before we send it campaigns.',
        "If you'd like to keep getting it, confirm with the button. If not, ignore this email: we won't send you campaigns.",
      ],
      button: 'Yes, keep me subscribed',
      footer: 'The link expires in 7 days and works only once.',
    },
    campaign: {
      footer:
        'You are receiving this email because you confirmed your subscription to the shwcs newsletter.',
      unsubscribe: 'Unsubscribe',
      unsubscribeText: 'Unsubscribe: {url}',
      testSubject: '[Test v{version}] {subject}',
      testBanner:
        "Test send of version {version}. Clicks in this test aren't counted and unsubscribing has no effect.",
    },
    weekly: {
      subjectOne: 'New this week on shwcs: {name}',
      subjectMany: 'New this week on shwcs: {count} solutions',
      heading: 'New this week',
      intro:
        'These are the listings the team approved in the last seven days, newest first. They are not ranked by votes.',
      cta: '[See them all in New this week](/en/nuevo)',
    },
  },
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
    confirmationUnavailable:
      "We couldn't send you the confirmation email. Your request wasn't lost: please try again in a few minutes.",
    confirmLinkInvalid:
      'This link was already used or has expired. Subscribe again to get a new one.',
    confirmUnavailable: "We couldn't confirm your subscription. Please try again.",
    confirmTooMany: 'Too many attempts. Wait a moment.',
  },
} as const satisfies Dictionary['newsletter'];
