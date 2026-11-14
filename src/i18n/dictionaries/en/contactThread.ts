import type { Dictionary } from '../../dictionary';

export const contactThread = {
  title: 'Conversation',
  you: 'You',
  turnMine: 'Your turn to reply',
  turnTheirs: 'Waiting for {name} · {since}',
  closed: 'This conversation is closed. You can reopen it from “More actions”.',
  closedBuyer: 'This conversation is closed.',
  withdrawn: 'The buyer withdrew the request.',
  changes: {
    started: '{name} replied and started the conversation',
    closed: '{name} closed the conversation',
    reopened: '{name} reopened the conversation',
    withdrawn: '{name} withdrew the request',
  },
  changesMine: {
    started: 'You replied and started the conversation',
    closed: 'You closed the conversation',
    reopened: 'You reopened the conversation',
    withdrawn: 'You withdrew the request',
  },
  composerLabel: 'Your message',
  placeholderBuyer: 'Reply, suggest a date or ask anything you need…',
  placeholderRecipient: 'Reply with a concrete next step: a demo, a proposal, a question…',
  send: 'Send',
  sending: 'Sending…',
  hint: '⌘/Ctrl + Enter to send',
  sent: 'Message sent.',
  errors: {
    origin: 'Use your shwcs account.',
    signIn: 'Sign in to continue.',
    invalid: 'Write a message of up to 2000 characters.',
    limit: 'Too many messages in a row. Try again in a few minutes.',
    closed: 'This conversation no longer accepts messages. Reload to see its status.',
    unavailable: 'Conversation unavailable.',
    failed: 'We couldn’t confirm it was sent. Reload to check before trying again.',
  },
} as const satisfies Dictionary['contactThread'];
