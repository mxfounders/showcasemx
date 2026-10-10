import type { Dictionary } from '../../dictionary';

export const faq = {
  metaTitle: 'Frequently asked questions',
  title: 'Frequently<br />asked questions',
  intro:
    'The essentials for discovering projects, managing your account and publishing in the directory.',
  link: 'Learn about the project',
  groups: {
    account: {
      title: 'Account and privacy',
      items: [
        {
          question: 'Who can use an account?',
          answer:
            'One person can explore solutions and publish their own projects. Buyer and founder are working views within the same account; they are not separate permissions.',
        },
        {
          question: 'Are my lists and notes public?',
          answer:
            "Your saved projects and notes are always private. Lists are only shared if you choose to publish them. Saving a project doesn't notify its team or create a contact request.",
        },
        {
          question: 'What information is shared when I reach out?',
          answer:
            'Only when you explicitly send a request do you authorize sharing the information and usage context you wrote with the recipient.',
        },
      ],
    },
    contact: {
      title: 'Contact and decisions',
      items: [
        {
          question: 'How do I contact a project?',
          answer:
            "From its listing you can send a request with context about your problem and situation. The team's replies are available directly in your shwcs account.",
        },
        {
          question: 'Does shwcs recommend hiring the published solutions?',
          answer:
            'Publishing makes it easier to evaluate and contact a team, but it is not a purchase recommendation and does not guarantee results. Confirm the terms and scope directly with the project.',
        },
        {
          question: 'Are you involved in contracting or payments?',
          answer:
            'No. shwcs is a space to discover and present projects clearly. It does not handle contracting, invoicing or agreements between companies and providers.',
        },
      ],
    },
    publishing: {
      title: 'Publishing projects',
      items: [
        {
          question: 'What do I need to apply?',
          answer:
            'Any founder with an active account can submit a draft. You need to provide real context: the problem you solve, who it works for, the scope, limitations, pricing and evidence that supports what you offer.',
        },
        {
          question: 'Can I update a project that is already published?',
          answer:
            'Yes. Your changes are saved as a new draft and go through editorial review. Meanwhile, your current public version stays visible without interruption until the changes are approved.',
        },
        {
          question: 'How long does the review take?',
          answer:
            'There is no promised response time. Check your account notifications for decisions, requested changes or approvals.',
        },
      ],
    },
    review: {
      title: 'Editorial review',
      items: [
        {
          question: 'Is being published a quality certification?',
          answer:
            'No. An approved listing means the project explained its context clearly. It is not a security audit or a solvency review, and it does not ensure they will deliver their results.',
        },
        {
          question: 'What happens if my project is rejected?',
          answer:
            'The editorial team must explain the reason for every decision. A change request or a rejection always includes a comment from the reviewer, giving you the chance to correct the information and resubmit it.',
        },
        {
          question: 'How do I report false information or problems?',
          answer:
            "We don't accept impersonation, misleading claims or unlawful content. You can report any listing directly from its page so it can be evaluated and, if appropriate, removed.",
        },
      ],
    },
  },
} as const satisfies Dictionary['faq'];
