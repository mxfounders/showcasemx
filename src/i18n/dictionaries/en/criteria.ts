import type { Dictionary } from '../../dictionary';

export const criteria = {
  metaTitle: 'What we review',
  titleLine1: 'What we review',
  titleLine2: 'before publishing',
  desc: "Before publishing, a person on the editorial team reviews every listing against these 8 criteria. We review the information you declare; the review doesn't certify the project's quality, security or results.",
  link: 'See the publication process',
  criterionPrefix: 'Criterion',
  items: {
    clarity: {
      title: 'Problem clarity',
      desc: 'A useful catalog needs real context. We check that the listing clearly explains which operational problem it solves and who its ideal customer is, without generic marketing jargon.',
    },
    architecture: {
      title: 'Technical coherence',
      desc: "We don't audit the code or test the product in depth. We do check that what you declare is coherent: if you mention integrations with other tools, we look for documentation or a public page that shows them.",
    },
    design: {
      title: 'Screenshots and demo',
      desc: "They're optional, but they help buyers decide. If you add screenshots or a demo, we check that they show the real product and not generic images.",
    },
    businessModel: {
      title: 'Business model',
      desc: "Pricing, implementation and extra costs are optional, but if you declare them they must be clear. If you don't publish them, the listing shows them as missing information instead of making them up.",
    },
    domain: {
      title: 'Domain control',
      desc: "After publishing you can prove, with a TXT record, that you control your site's domain; the listing shows it while it's current. It's optional and proves control of the domain, not legal identity.",
    },
    evidence: {
      title: 'Evidence and use cases',
      desc: "If the listing promises results, such as hours saved, return or success stories, we ask for the context or a source behind them. We don't verify those results ourselves.",
    },
    security: {
      title: 'Data and standards',
      desc: "We check that the linked site is the project's official one. Standards you declare, such as data protection or local invoicing, appear as declared by the project, not as certified by shwcs.",
    },
    ethics: {
      title: 'Commercial ethics',
      desc: "Zero tolerance for aggressive spam, false claims about competitors or use of someone else's intellectual property. Anyone with an account can report a published listing.",
    },
  },
  orderTitle: 'How the catalog is ordered',
  orderDesc:
    "Within each category, the order reflects real buyer interaction — reviewing, commenting, saving, liking — not a quality score or an editorial endorsement. Everything starts at zero. Only activity from accounts with a verified email counts, and it weighs less over time: an old boost doesn't fix the order forever. It is an auxiliary signal, not a certification.",
  communityOrder:
    "Community lists sorted by «Popular» follow the same rules: likes, saves and comments count only from accounts with a verified email, never from the list's maker, and they lose weight over time.",
  responseNote:
    "Once a project has received at least 3 contact requests from accounts with a verified email in the last 90 days, its listing and cards say how long it usually takes to reply (the median time to the first reply) and how many it answered. «Replies fast» marks those who answer at least 8 in 10 with that median at 48 h or less. Requests from the last 72 hours still waiting for a reply don't count, nor those the buyer withdrew before getting one.",
  weights: {
    review: {
      label: 'Review',
      desc: "The strongest signal: it adds its stars multiplied by its verification: ×1 with a verified email, ×1.5 with a company email, ×2 when its author contacted the vendor via shwcs and the conversation moved forward, ×3 with a proven purchase. Reviews that come through the vendor's own invitation link count half, because the vendor chooses whom to invite. A low review never subtracts. Nobody can review their own solution or write from the vendor's domain.",
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
    response: {
      label: 'Response',
      desc: 'Adds up to 2 points —what a save weighs— by the share of requests answered: in full when the median reply time is 48 h or less, half when it is a week or less.',
    },
    view: {
      label: 'View',
      desc: "Real traffic, with diminishing returns: thousands of views don't drown out a few comments.",
    },
  },
} as const satisfies Dictionary['criteria'];
