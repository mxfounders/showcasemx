import type { Dictionary } from '../../dictionary';

export const contact = {
  metaTitle: 'Contact',
  metaDescription: 'Tell us what you want to solve, build or propose.',
  homeAria: 'shwcs, back to home',
  heroTitle1: "There's something you want to solve.",
  heroTitle2: "Let's start there.",
  heroDesc:
    "Whether you're looking for a solution, building one, or want to collaborate, give us the context to take the conversation to the right place.",
  bullets: [
    'Your message goes straight to the team.',
    "We don't subscribe you to the newsletter.",
    'Your data is only used to reply.',
  ],
} as const satisfies Dictionary['contact'];
