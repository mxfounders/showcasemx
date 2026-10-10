import type { Dictionary } from '../../dictionary';

export const publicationProcess = {
  metaTitle: 'From idea to publication',
  titleLine1: 'From idea to',
  titleLine2: 'publication',
  desc: 'See how the flow works, from the moment you create an account until your project is ready to receive requests.',
  link: 'Submit a project',
  steps: [
    {
      title: 'Prepare your listing',
      description:
        'Start with a private draft. Take your time to describe the problem you solve, define your ideal customer and add screenshots or demos. There is no time limit to submit.',
    },
    {
      title: 'Editorial review',
      description:
        'Once you submit your application, our team evaluates how clear the information is. If context is missing or we find confusing details, we will send you specific suggestions on what to fix. Nothing is rejected without an explanation.',
    },
    {
      title: 'Publication',
      description:
        'Once approved, your listing becomes public and visible in the directory. Any future update (pricing changes, redesigns) is saved as a new draft and goes through a quick review.',
    },
    {
      title: 'Distribution',
      description:
        'If your solution solves a complex problem exceptionally well, our editorial team may feature it in in-depth analyses, newsletters and use cases for key operators.',
    },
    {
      title: 'Real connection',
      description:
        'The people who find your listing are not casual onlookers; they are operators looking for tools. Receive qualified interest from people who already understand your value proposition and your constraints.',
    },
  ],
} as const satisfies Dictionary['publicationProcess'];
