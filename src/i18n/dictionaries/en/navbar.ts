import type { Dictionary } from '../../dictionary';

export const navbar = {
  search: {
    searchLabel: 'Search solutions in the catalog',
    searchPlaceholder: 'What do you need to solve?',
    searchBtnLabel: 'Search solutions',
    searchSubmitLabel: 'Submit search',
    searchCloseLabel: 'Close search',
    searchFormLabel: 'Search the catalog',
  },
  dashboard: 'Go to dashboard',
  login: 'Log in',
  subscribe: 'Subscribe',
  communityLabel: 'Community lists',
  communityTitle: 'Community',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  menus: {
    compradores: {
      heading: 'For buyers',
      columns: [
        {
          heading: 'By operational problem',
          links: [
            {
              label: 'Billing & Accounts Receivable',
              desc: 'Reduce your collection cycle from weeks to days',
              href: '/explorar/cobros',
              icon: 'card',
            },
            {
              label: 'Contracts & Digital Signature',
              desc: 'Close deals without printing a single page',
              href: '/explorar/contratos',
              icon: 'document',
            },
            {
              label: 'Payroll & Compliance',
              desc: 'IMSS, SAT and disbursement in one place',
              href: '/explorar/nomina',
              icon: 'clients',
            },
            {
              label: 'Financial Visibility',
              desc: 'Know exactly what comes in, what goes out and when',
              href: '/explorar/finanzas',
              icon: 'chart-bar',
            },
            {
              label: 'Inventory & Supply Chain',
              desc: 'Real-time stock control, no Excel sheets',
              href: '/explorar/inventario',
              icon: 'parcel',
            },
            {
              label: 'Sales & CRM',
              desc: 'Clear pipeline to close more and lose less',
              href: '/explorar/ventas',
              icon: 'target',
            },
            {
              label: 'Customer Support',
              desc: 'Multichannel helpdesk without operational chaos',
              href: '/explorar/atencion-clientes',
              icon: 'headphones',
            },
          ],
        },
        {
          heading: 'By industry',
          links: [
            {
              label: 'Agencies & Consulting',
              desc: 'Invoice, manage projects and collect on time',
              href: '/industria/agencias',
              icon: 'office-building',
            },
            {
              label: 'Retail & E-commerce',
              desc: 'Integrated inventory, payments and logistics',
              href: '/industria/retail',
              icon: 'bag',
            },
            {
              label: 'Manufacturing',
              desc: 'Digitize plant, suppliers and quality',
              href: '/industria/manufactura',
              icon: 'factory',
            },
            {
              label: 'Law Firms',
              desc: 'Paperless files, clients and fees',
              href: '/industria/legal',
              icon: 'balance-scale',
            },
            {
              label: 'Construction & Real Estate',
              desc: 'Construction contracts, estimates and progress',
              href: '/industria/construccion',
              icon: 'hard-hat',
            },
            {
              label: 'Healthcare & Clinics',
              desc: 'Agenda, clinical records and billing in one system',
              href: '/industria/salud',
              icon: 'heart',
            },
            {
              label: 'Education & EdTech',
              desc: 'Enrollment, collection and parent communication',
              href: '/industria/educacion',
              icon: 'graduation-cap',
            },
          ],
        },
        {
          heading: 'Collections',
          links: [
            {
              label: 'Operating basics',
              desc: 'Billing, finance, payroll and operations',
              href: '/colecciones/essential',
              icon: 'layers',
            },
            {
              label: 'For the finance team',
              desc: 'Finance and Billing listings',
              href: '/colecciones/cfo',
              icon: 'briefcase',
            },
            {
              label: 'For agencies',
              desc: 'Listings that say they serve agencies',
              href: '/colecciones/agencia',
              icon: 'trend-up',
            },
            {
              label: 'Legal and contracts',
              desc: 'Listings in the Legal category',
              href: '/colecciones/legal',
              icon: 'book-open',
            },
            {
              label: 'New this week',
              desc: 'Listings approved in the last seven days',
              href: '/nuevo',
              icon: 'rocket',
            },
          ],
        },
      ],
      featured: {
        tag: 'New',
        label: 'Discover projects',
        desc: 'Learn what they solve, save options and compare before contacting.',
        cta: 'Explore catalog →',
        href: '/#catalogo',
      },
    },
    fundadores: {
      heading: 'For founders',
      columns: [
        {
          heading: 'Enter the catalog',
          links: [
            {
              label: 'How to apply',
              desc: 'The 3-step entry process, without bureaucracy',
              href: '/aplicar',
              icon: 'send',
            },
            {
              label: 'Entry criteria',
              desc: 'What the team evaluates: traction, model and execution',
              href: '/criterios',
              icon: 'clipboard-check',
            },
            {
              label: 'Review process',
              desc: 'From draft to published: times and direct communication',
              href: '/proceso',
              icon: 'gear',
            },
            {
              label: 'FAQ',
              desc: 'Everything you need to know before sending your application',
              href: '/faq',
              icon: 'help',
            },
          ],
        },
        {
          heading: 'Your presence',
          links: [
            {
              label: 'My solutions',
              desc: 'Apply, check progress and manage your solutions',
              href: '/account/solutions',
              icon: 'dashboard',
            },
            {
              label: 'Opportunities',
              desc: 'Companies that saw your solution and want to talk',
              href: '/leads',
              icon: 'target',
            },
            {
              label: 'Your account',
              desc: 'Update your details and preferences',
              href: '/account/settings',
              icon: 'person-circle',
            },
            {
              label: 'New this week',
              desc: 'Once approved, your listing is featured here for a full week',
              href: '/nuevo',
              icon: 'rocket',
            },
          ],
        },
        {
          heading: 'News',
          links: [
            {
              label: 'Founders directory',
              desc: 'Meet who else is building in the catalog',
              href: '/fundadores',
              icon: 'globe',
            },
            {
              label: 'Newsletter',
              desc: 'Market intelligence: what companies are looking for today',
              href: '/newsletter',
              icon: 'mail',
            },
            {
              label: 'shwcs Selection',
              desc: 'The listings the team picks each month, with its reason',
              href: '/destacados',
              icon: 'award',
            },
          ],
        },
      ],
      featured: {
        tag: 'Read it',
        label: 'The Project',
        desc: 'Why we built shwcs, how the selection process works and what it means to be in the catalog.',
        cta: 'Read more →',
        href: '/el-proyecto',
      },
    },
    recursos: {
      heading: 'Resources',
      columns: [
        {
          heading: 'Get to know shwcs',
          links: [
            {
              label: 'The Project',
              desc: 'Why shwcs exists and how we choose what to present',
              href: '/el-proyecto',
              icon: 'target',
            },
            {
              label: 'Blog',
              desc: 'Ideas to choose, build and operate better projects',
              href: '/blog',
              icon: 'book-open',
            },
          ],
        },
        {
          heading: 'Stay close',
          links: [
            {
              label: 'Changelog',
              desc: 'What changes in the catalog and in the experience',
              href: '/changelog',
              icon: 'rocket',
            },
            {
              label: 'Contact',
              desc: 'Tell us what you are looking for, building or want to propose',
              href: '/contacto',
              icon: 'mail',
            },
          ],
        },
      ],
      featured: {
        tag: 'shwcs',
        label: 'Projects with context',
        desc: 'A selection to understand what each project solves and who is behind it.',
        cta: 'Get to know the project →',
        href: '/el-proyecto',
      },
    },
  },
} as const satisfies Dictionary['navbar'];
