import type { Dictionary } from '../../dictionary';

export const contactForm = {
  formAria: 'Contact form',
  progressAria: 'Form progress',
  honeypot: 'Do not fill in',
  titles: {
    reason: 'What would you like to talk to us about?',
    person: 'Who will we be talking to?',
    context: 'Tell us the context.',
    review: 'Is everything correct?',
  },
  errors: {
    reason: 'Choose the reason that best matches your message.',
    name: 'Enter your name.',
    email: 'Enter a valid email.',
    org: 'Enter the name of your company or project.',
    msg: 'Tell us a bit more so we can reply properly.',
    urgency: 'Tell us when you want to solve it.',
    website: 'Enter a valid website, including https://',
    consent: 'We need your authorization to reply to this message.',
    submit: "We couldn't send your message.",
    submitCatch:
      "We couldn't confirm that your message was sent. Your answers are still here so you can try again.",
  },
  reasons: {
    find: {
      label: 'Find a solution',
      detail: "I'm looking for software, an agency or a service for my company.",
    },
    submit: {
      label: 'Present a project',
      detail: 'I want to publish or improve the presence of what I build.',
    },
    partnership: {
      label: 'Partnership or community',
      detail: 'I have a collaboration, event or initiative to propose.',
    },
    press: {
      label: 'Press or content',
      detail: 'I want to talk, do research or tell a story.',
    },
    support: {
      label: 'Help with my account',
      detail: 'I need to solve something inside shwcs.',
    },
    other: {
      label: 'Another conversation',
      detail: "My message doesn't fit any of the options above.",
    },
  },
  urgencies: {
    exploring: "I'm just exploring",
    month: 'I want to solve it this month',
    soon: "I'd like to talk soon",
  },
  labels: {
    name: 'Full name',
    email: 'Work email',
    org: 'Company or project',
    role: 'Your role',
    roleOpt: '· optional',
    msg: 'What do you need to solve?',
    msgHint: 'Shift + Enter for a new line',
    website: 'Website',
    websiteOpt: '· optional',
    urgency: "What's your timeline?",
  },
  placeholders: {
    name: 'Your name',
    email: 'you@company.com',
    org: 'Name',
    role: 'Founder, CFO, operations…',
    msg: "Give us the context, what you've tried and what a good next step would be.",
    website: 'https://',
  },
  summary: {
    reason: 'Reason',
    person: 'Person',
    org: 'Company or project',
    urgency: 'Timeline',
  },
  consentLabel:
    'I authorize shwcs to use this data to reply to my request. This does not subscribe me to the newsletter.',
  step: 'Step',
  of: 'of',
  sending: 'Sending…',
  submitBtn: 'Send message',
  continueBtn: 'Continue',
  enterHint: 'press Enter ↵',
  backBtn: 'Back',
  successTitle: 'Your message is with us.',
  successDesc: 'We saved it successfully. We will reply to',
  successDesc2: 'with the context of your request.',
  successBtn: 'Explore shwcs',
  successRetry: 'Send another',
  apiErrors: {
    origin: 'Send the message from shwcs.',
    invalid: 'Check the form fields and try again.',
    rateLimited: 'We received several messages. Wait a little before sending another one.',
    unavailable:
      "We couldn't save your message. Your details are still in the form so you can try again.",
  },
} as const satisfies Dictionary['contactForm'];
