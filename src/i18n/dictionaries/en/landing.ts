import type { Dictionary } from '../../dictionary';

export const landing = {
  loadingCatalog: 'Loading catalog',
  founderTitle: 'Are you building something a company needs?',
  founderSubtitle:
    'Apply with your software, agency or service and tell us what you solve and for whom.',
  founderButton: 'Apply my solution',
  founderDisclaimer: 'Applying does not guarantee publication.',
  heroLine1: 'Find solutions.',
  heroLine2: 'Meet their creators.',
  heroDescription:
    "Discover tools to solve your company's challenges. At shwcs we select products, help you understand what they solve, and bring you closer to those who build them.",
  heroSearchPlaceholder: 'What do you need to solve in your company?',
  heroSearchButton: 'Find solutions',
  heroSearchButtonMobile: 'Search',
  heroSearchExample: 'Try with “I want to get paid on time” or “I need to organize my payroll”.',
  heroExplore: 'Explore:',
  heroExploreFinance: 'Finance',
  heroExplorePayroll: 'Payroll',
  heroExploreSales: 'CRM',
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
    slotLabel: 'Open slot',
    slotTitleLine1: 'Your solution',
    slotTitleLine2: 'could be here.',
    cards: {
      data: {
        badge: 'CATALOG',
        title: 'Get data from the most complete marketplace',
        description:
          'One place to compare more than 2,000 B2B tools. Build intent signals and make decisions based on real usage and budget data across Latin America.',
        button: 'Explore catalog',
      },
      agents: {
        badge: 'RECOMMENDATIONS',
        title: 'Find the needle in the haystack instantly',
        description:
          'Our AI analyzes your industry, size and budget to recommend the exact tech stack used by the most successful companies in your sector.',
        button: 'See recommendations',
      },
      enrichment: {
        badge: 'MANAGEMENT',
        title: 'Take control of all your subscriptions',
        description:
          'Stop paying for licenses nobody uses. Connect your stack and get automatic alerts about duplicate spending and upcoming renewals.',
        button: 'Optimize spending',
      },
      outbound: {
        badge: 'IMPLEMENTATION',
        title: 'Connect with certified experts',
        description:
          "Don't stop halfway. We connect you directly with verified agencies and consultants who will set up your new software in record time.",
        button: 'Contact experts',
      },
    },
  },
} as const satisfies Dictionary['landing'];
