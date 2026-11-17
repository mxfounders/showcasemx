import type { Dictionary } from '../../dictionary';

export const apply = {
  metaTitle: 'Submit your project',
  title: 'Submit your project',
  desc: 'Listing on shwcs is free. Every listing goes through an editorial review before it enters the catalog; here is what we ask for and what happens next.',
  cta: 'List my project',
  ctaNote: 'You need an account. Your draft is saved and you can finish it later.',
  link: 'See the entry criteria',
  steps: {
    draft: {
      title: '1. Build your listing',
      desc: 'A form of short questions guides you: what problem you solve, for whom, what it can do, which industries and company sizes it fits and how to reach you. Screenshots, a demo, pricing and integrations are optional, but they help buyers decide.',
    },
    review: {
      title: '2. Editorial review',
      desc: "We check that the information is clear and complete against the public criteria. If context is missing, we ask for specific changes; if it doesn't fit, we tell you why. The review doesn't certify your project's quality or results.",
    },
    publish: {
      title: '3. After publishing',
      desc: "Your listing appears in the catalog. You get contact requests with the buyer's context in your Opportunities inbox, view and click metrics, and reviews with their verification level. If you like, you can prove with a TXT record that you control your site's domain.",
    },
  },
} as const satisfies Dictionary['apply'];
