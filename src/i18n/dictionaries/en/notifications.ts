import type { Dictionary } from '../../dictionary';

export const notifications = {
  action: {
    saveError: "We couldn't save. Please try again.",
    saving: 'Saving…',
    saved: 'Preferences saved.',
  },
  preferences: {
    intro: 'Your account notifications are separate from the newsletter.',
    contacts: 'Requests and replies by email',
    solutions: 'Status of my submissions by email',
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
    title: 'Confirm your email.',
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
