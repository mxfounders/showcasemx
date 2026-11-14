import type { Dictionary } from '../../dictionary';

export const notifications = {
  action: {
    saveError: "We couldn't save. Please try again.",
    saving: 'Saving…',
    saved: 'Preferences saved.',
  },
  weeklyUnsubscribe: {
    metaTitle: 'Stop the weekly summary',
    doneTitle: "Done, we won't send it again",
    doneDesc:
      "You won't receive «Your week on shwcs» anymore. Your metrics stay in your account and other notifications don't change. You can turn it back on in notification preferences.",
    back: 'Back to shwcs →',
    title: 'Stop receiving «Your week on shwcs»',
    desc: "Confirm and we'll stop sending you the Monday summary. Your account and other notifications don't change.",
    pending: 'Saving…',
    submit: 'Stop receiving it',
    missingToken:
      "This link isn't valid. You can turn the summary off in notification preferences.",
    error: "We couldn't save the change.",
    genericError: "We couldn't save the change. Please try again.",
  },
  preferences: {
    intro: 'Your account notifications are separate from the newsletter.',
    contacts: 'Requests and replies by email',
    solutions: 'My listings by email: review, comments, reviews, reports and sponsored slots',
    community:
      'Community by email: activity on my public lists (grouped by day) and a weekly summary of the lists and curators I follow',
    alerts: 'My search alerts by email (at most one a week per alert)',
    weekly: 'Weekly summary «Your week on shwcs» (Mondays, if you have a published listing)',
    save: 'Save preferences',
    verifyHint: 'Verify your email from {link} to turn them on.',
    verifyLink: 'Security',
    emailUnavailable:
      "Email delivery isn't enabled yet. Notifications inside your account are available.",
  },
  verification: {
    verified: 'Email verified.',
    sent: 'Link sent. Check your inbox.',
    genericError: "We couldn't complete the operation.",
    pending: 'One moment…',
    confirm: 'Confirm my email',
    send: 'Verify my email',
    unavailable: "Sending isn't enabled yet.",
    openLink: 'Open the link you received by email.',
    back: 'Back to Security →',
  },
  verifyPage: {
    metaTitle: 'Verify your email',
    title: 'Confirm your email',
  },
  settingsPage: {
    title: 'Notification preferences',
    desc: 'Choose which account updates reach you by email. In-app notifications keep appearing under the bell.',
  },
  errors: {
    signIn: 'Sign in.',
    invalidCursor: 'Invalid cursor.',
    loadUnavailable: "We couldn't load your notifications.",
    useAccount: 'Use your account.',
    tooManyChanges: 'Too many changes. Try again later.',
    invalidPreferences: 'Invalid preferences.',
    verifyFirst: 'Verify your email before turning on email notifications.',
    invalidAction: 'Invalid action.',
    saveUnavailable: "We couldn't save the change.",
  },
} as const satisfies Dictionary['notifications'];
