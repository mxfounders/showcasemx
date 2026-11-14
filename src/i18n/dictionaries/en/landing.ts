import type { Dictionary } from '../../dictionary';

export const landing = {
  loadingCatalog: 'Loading catalog',
  founderTitle: 'Do you build software for companies?',
  founderSubtitle:
    'Publish your software, agency or service for free: tell us what you solve and for whom. The team reviews every listing before it goes live.',
  founderButton: 'Publish for free',
  founderDisclaimer: 'Applying does not guarantee publication.',
  heroLine1: 'Find solutions.',
  heroLine2: 'Meet their creators.',
  heroDescription:
    "Discover tools to solve your company's challenges. At shwcs we select products, help you understand what they solve, and bring you closer to those who build them.",
  heroSearchPlaceholder: 'What do you need to solve in your company?',
  heroSearchButton: 'Find solutions',
  heroSearchButtonMobile: 'Search',
  heroSearchTry: 'Try',
  heroSearchOr: 'or',
  heroSearchExamples: [
    'I want to get paid on time',
    'wholesale quotes',
    'an online store',
    'I need to organize my payroll',
    'control my finances',
    'digital contracts',
    'automate my operations',
  ],
  heroExplore: 'Explore:',
  features: {
    titleLine1: 'Find the exact technology',
    titleLine2: 'for your industry',
    description:
      'Explore tools and services designed to solve each of your operational challenges, all in one place.',
    tabs: {
      crm: 'CRM & Sales',
      marketing: 'Marketing Automation',
      rh: 'Payroll & HR',
      finanzas: 'Finance & Billing',
      operaciones: 'Logistics & Operations',
      legal: 'Legal & Contracts',
      datos: 'Data & Analytics',
      ti: 'Security & IT',
      soporte: 'Support & Helpdesk',
      ecommerce: 'E-commerce',
      proyectos: 'Project Management',
      diseno: 'Design & UX',
      automatizacion: 'AI & Automation',
      comunicacion: 'Communications',
      desarrollo: 'Development & Cloud',
    },
  },
  stackingCards: {
    secondaryAction: 'Learn more',
    cards: {
      catalog: {
        badge: 'CATALOG',
        title: 'Listings that answer the same questions',
        description:
          "Every project answers the same questions: what problem it solves, for whom, what it can do, what it costs and how it's implemented. Whatever it didn't declare shows as missing; we don't make it up.",
        button: 'Explore catalog',
      },
      lists: {
        badge: 'LISTS AND COMPARISON',
        title: 'Save options and compare them',
        description:
          'Save projects, organize them in private lists with your own notes and compare two or three side by side using what each one published. No made-up scores or recommendations.',
        button: 'Create a list',
      },
      contact: {
        badge: 'CONTACT',
        title: 'Reach out with context',
        description:
          "Send a request to the project's team with your need, timeline and team size. Before sending you see exactly what you share, and you follow the reply from your account.",
        button: 'Find a project',
      },
      reviews: {
        badge: 'REVIEWS',
        title: 'Reviews with a verification level',
        description:
          'Every review shows what was checked about its author: verified email, company email or verified purchase. The project can reply in public, but it cannot delete them.',
        button: 'How we review',
      },
    },
  },
} as const satisfies Dictionary['landing'];
