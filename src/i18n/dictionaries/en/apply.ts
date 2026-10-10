import type { Dictionary } from '../../dictionary';

export const apply = {
  metaTitle: 'Submit your project',
  title: 'Submit your project',
  desc: 'shwcs is a curated B2B directory. We explain exactly what you need to get in and how our review process works.',
  link: 'See the entry criteria',
  steps: {
    draft: {
      title: '1. Write with clarity',
      desc: 'Start with a draft in your account. You will need to explain the core problem your project solves, define your ideal customer and add real screenshots or demos. Avoid empty marketing language; aim for technical clarity.',
    },
    domain: {
      title: '2. Domain verification',
      desc: "We require you to confirm that you are the owner or an authorized representative of the project. During registration, we will validate your corporate identity by linking the company's official domain to your shwcs founder account.",
    },
    review: {
      title: '3. Editorial review',
      desc: 'Our team will check that the listing meets the information standards. If context is missing, we will ask you for specific adjustments. Once approved, your listing will be published in the catalog and you will have access to the metrics dashboard.',
    },
  },
} as const satisfies Dictionary['apply'];
