import type { Dictionary } from '../../dictionary';

export const criteria = {
  metaTitle: 'What we review',
  titleLine1: 'What we review',
  titleLine2: 'before publishing',
  desc: 'We thoroughly evaluate every project across 8 key operational dimensions to ensure the quality of the directory.',
  link: 'See the publication process',
  criterionPrefix: 'Criterion',
  items: {
    clarity: {
      title: 'Problem clarity',
      desc: 'A useful directory requires real context. We check that the listing explains, crystal clear, which operational problem it solves, who the ideal customer is and why it beats using a spreadsheet. Zero generic marketing jargon.',
    },
    architecture: {
      title: 'Architecture and engineering',
      desc: "We don't audit the source code, but we review the coherence of the architecture. If you promise native integrations with SAP or Salesforce, we look for the technical documentation. We evaluate load times and infrastructure dependencies (such as SSO, open APIs and webhooks), and we make sure the product isn't just an unstable graphical layer built on top of ChatGPT. We want real business software.",
    },
    design: {
      title: 'Design and UX',
      desc: 'The consumerization of B2B is real. We check that the platform screenshots show a modern, clean interface that meets current usability standards.',
    },
    businessModel: {
      title: 'Business model',
      desc: 'Full transparency. We require the pricing structure, implementation fees and hidden add-on modules to be clearly explained.',
    },
    domain: {
      title: 'Domain identity',
      desc: "To prevent fraud or impersonation, we thoroughly verify that the founder's email matches the domain of the submitted website.",
    },
    evidence: {
      title: 'Evidence and use cases',
      desc: 'Big promises need verifiable results. We ask that the promised ROI, hours saved and success stories be presented with sources. We don\'t accept walls of "trusted customer" logos without a detailed breakdown of exactly which problem you solved for them.',
    },
    security: {
      title: 'Baseline security',
      desc: 'We look for active SSL certificates, transparent privacy policies, role-based access control (RBAC) and, for Enterprise plans, standards such as SOC2 or GDPR.',
    },
    ethics: {
      title: 'Commercial ethics',
      desc: 'Our fundamental rule: zero tolerance for aggressive spam tactics, false claims about competitors or intellectual property theft.',
    },
  },
  orderTitle: 'How the catalog is ordered',
  orderDesc:
    "Within each category, the order reflects real buyer interaction — reviewing, commenting, saving, liking — not a quality score or an editorial endorsement. Everything starts at zero. Only activity from accounts with a verified email counts, and it weighs less over time: an old boost doesn't fix the order forever. It is an auxiliary signal, not a certification.",
  weights: {
    review: {
      label: 'Review',
      desc: "The strongest signal: it adds its stars, and counts 1.5 times when the author uses a company email. A low review never subtracts. Nobody can review their own solution or write from the vendor's domain.",
    },
    comment: {
      label: 'Comment',
      desc: "The costliest signal to give: someone took the time to write. A founder can't comment on their own listing.",
    },
    save: {
      label: 'Save',
      desc: 'Expresses the intention to come back or compare later.',
    },
    like: {
      label: 'Like',
      desc: "The easiest interaction to give. A founder can't give one to their own listing either.",
    },
    view: {
      label: 'View',
      desc: "Real traffic, with diminishing returns: thousands of views don't drown out a few comments.",
    },
  },
} as const satisfies Dictionary['criteria'];
