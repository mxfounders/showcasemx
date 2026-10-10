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
              icon: 'CreditCard',
            },
            {
              label: 'Contracts & Digital Signature',
              desc: 'Close deals without printing a single page',
              href: '/explorar/contratos',
              icon: 'FileText',
            },
            {
              label: 'Payroll & Compliance',
              desc: 'IMSS, SAT and disbursement in one place',
              href: '/explorar/nomina',
              icon: 'Users',
            },
            {
              label: 'Financial Visibility',
              desc: 'Know exactly what comes in, what goes out and when',
              href: '/explorar/finanzas',
              icon: 'BarChart3',
            },
            {
              label: 'Inventory & Supply Chain',
              desc: 'Real-time stock control, no Excel sheets',
              href: '/explorar/inventario',
              icon: 'Package',
            },
            {
              label: 'Sales & CRM',
              desc: 'Clear pipeline to close more and lose less',
              href: '/explorar/ventas',
              icon: 'Target',
            },
            {
              label: 'Customer Support',
              desc: 'Multichannel helpdesk without operational chaos',
              href: '/explorar/soporte',
              icon: 'HeadphonesIcon',
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
              icon: 'Building2',
            },
            {
              label: 'Retail & E-commerce',
              desc: 'Integrated inventory, payments and logistics',
              href: '/industria/retail',
              icon: 'ShoppingBag',
            },
            {
              label: 'Manufacturing',
              desc: 'Digitize plant, suppliers and quality',
              href: '/industria/manufactura',
              icon: 'Factory',
            },
            {
              label: 'Law Firms',
              desc: 'Paperless files, clients and fees',
              href: '/industria/legal',
              icon: 'Scale',
            },
            {
              label: 'Construction & Real Estate',
              desc: 'Construction contracts, estimates and progress',
              href: '/industria/construccion',
              icon: 'HardHat',
            },
            {
              label: 'Healthcare & Clinics',
              desc: 'Agenda, clinical records and billing in one system',
              href: '/industria/salud',
              icon: 'Heart',
            },
            {
              label: 'Education & EdTech',
              desc: 'Enrollment, collection and parent communication',
              href: '/industria/educacion',
              icon: 'GraduationCap',
            },
          ],
        },
        {
          heading: 'Your selection',
          links: [
            {
              label: 'Essential Stack MX',
              desc: 'The minimum tools to operate without chaos',
              href: '/colecciones/essential',
              icon: 'Layers',
            },
            {
              label: 'CFO Toolkit',
              desc: 'Financial control for finance directors',
              href: '/colecciones/cfo',
              icon: 'Briefcase',
            },
            {
              label: 'Agency in 30 days',
              desc: 'Launch your service operation from scratch',
              href: '/colecciones/agencia',
              icon: 'TrendingUp',
            },
            {
              label: 'Modern Legal Stack',
              desc: 'From contract signing to collection, without printers',
              href: '/colecciones/legal',
              icon: 'BookOpen',
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
        mockupType: 'catalog',
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
              icon: 'Send',
            },
            {
              label: 'Entry criteria',
              desc: 'What the team evaluates: traction, model and execution',
              href: '/criterios',
              icon: 'ClipboardCheck',
            },
            {
              label: 'Review process',
              desc: 'From draft to published: times and direct communication',
              href: '/proceso',
              icon: 'Settings',
            },
            {
              label: 'FAQ',
              desc: 'Everything you need to know before sending your application',
              href: '/faq',
              icon: 'HelpCircle',
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
              icon: 'LayoutDashboard',
            },
            {
              label: 'Opportunities',
              desc: 'Companies that saw your solution and want to talk',
              href: '/leads',
              icon: 'Target',
            },
            {
              label: 'Your account',
              desc: 'Update your details and preferences',
              href: '/account/settings',
              icon: 'UserCircle',
            },
            {
              label: 'Weekly Drops',
              desc: 'Be part of the most viewed weekly launch in the ecosystem',
              href: '/drops',
              icon: 'Rocket',
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
              icon: 'Globe',
            },
            {
              label: 'Events & Networking',
              desc: 'In-person B2B meetings in CDMX and Monterrey',
              href: '/eventos',
              icon: 'Calendar',
            },
            {
              label: 'Newsletter',
              desc: 'Market intelligence: what companies are looking for today',
              href: '/newsletter',
              icon: 'Mail',
            },
            {
              label: 'Featured Founders',
              desc: 'The most tractioned operators in the catalog this month',
              href: '/destacados',
              icon: 'Award',
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
        mockupType: 'catalog',
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
              icon: 'Target',
            },
            {
              label: 'Blog',
              desc: 'Ideas to choose, build and operate better projects',
              href: '/blog',
              icon: 'BookOpen',
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
              icon: 'Rocket',
            },
            {
              label: 'Contact',
              desc: 'Tell us what you are looking for, building or want to propose',
              href: '/contacto',
              icon: 'Mail',
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
        mockupType: 'catalog',
      },
    },
  },
} as const satisfies Dictionary['navbar'];
