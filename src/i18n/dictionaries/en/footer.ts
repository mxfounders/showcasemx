import type { Dictionary } from '../../dictionary';

export const footer = {
  description:
    'Software, agencies and services for your company. Know what they solve and connect with those who build them.',
  newsletter: 'Subscribe to newsletter',
  poweredBy: 'Powered by',
  sections: [
    {
      heading: 'For buyers',
      cols: [
        {
          subheading: 'By problem',
          links: [
            {
              label: 'Billing & Collection',
              href: '/explorar/cobros',
              icon: 'CreditCard',
            },
            {
              label: 'Digital Contracts',
              href: '/explorar/contratos',
              icon: 'FileText',
            },
            {
              label: 'Payroll & Compliance',
              href: '/explorar/nomina',
              icon: 'Users',
            },
            {
              label: 'Financial Visibility',
              href: '/explorar/finanzas',
              icon: 'BarChart3',
            },
            {
              label: 'Inventory & Supply',
              href: '/explorar/inventario',
              icon: 'Package',
            },
            {
              label: 'Sales & CRM',
              href: '/explorar/ventas',
              icon: 'Target',
            },
            {
              label: 'Customer Support',
              href: '/explorar/soporte',
              icon: 'HeadphonesIcon',
            },
          ],
        },
        {
          subheading: 'By industry',
          links: [
            {
              label: 'Agencies',
              href: '/industria/agencias',
              icon: 'Building2',
            },
            {
              label: 'Retail & E-commerce',
              href: '/industria/retail',
              icon: 'ShoppingBag',
            },
            {
              label: 'Manufacturing',
              href: '/industria/manufactura',
              icon: 'Factory',
            },
            {
              label: 'Law Firms',
              href: '/industria/legal',
              icon: 'Scale',
            },
            {
              label: 'Construction',
              href: '/industria/construccion',
              icon: 'HardHat',
            },
            {
              label: 'Healthcare & Clinics',
              href: '/industria/salud',
              icon: 'Heart',
            },
            {
              label: 'Education',
              href: '/industria/educacion',
              icon: 'GraduationCap',
            },
          ],
        },
        {
          subheading: 'Your selection',
          links: [
            {
              label: 'Essential Stack MX',
              href: '/colecciones/essential',
              icon: 'Layers',
            },
            {
              label: 'CFO Toolkit',
              href: '/colecciones/cfo',
              icon: 'Briefcase',
            },
            {
              label: 'Agency in 30 days',
              href: '/colecciones/agencia',
              icon: 'TrendingUp',
            },
            {
              label: 'Modern Legal Stack',
              href: '/colecciones/legal',
              icon: 'BookOpen',
            },
          ],
        },
      ],
    },
    {
      heading: 'For founders',
      cols: [
        {
          subheading: 'Enter the catalog',
          links: [
            {
              label: 'How to apply',
              href: '/aplicar',
              icon: 'Send',
            },
            {
              label: 'Criteria',
              href: '/criterios',
              icon: 'ClipboardCheck',
            },
            {
              label: 'Process',
              href: '/proceso',
              icon: 'Settings',
            },
            {
              label: 'FAQ',
              href: '/faq',
              icon: 'HelpCircle',
            },
          ],
        },
        {
          subheading: 'Opportunities',
          links: [
            {
              label: 'Newsletter',
              href: '/newsletter',
              icon: 'Mail',
            },
            {
              label: 'Events',
              href: '/eventos',
              icon: 'Calendar',
            },
            {
              label: 'Sponsor',
              href: '/sponsor',
              icon: 'Zap',
            },
          ],
        },
      ],
    },
    {
      heading: 'Company',
      cols: [
        {
          subheading: 'Resources',
          links: [
            {
              label: 'The Project',
              href: '/el-proyecto',
              icon: 'Target',
            },
            {
              label: 'Blog',
              href: '/blog',
              icon: 'BookOpen',
            },
            {
              label: 'Changelog',
              href: '/changelog',
              icon: 'Rocket',
            },
          ],
        },
        {
          subheading: 'Legal',
          links: [
            {
              label: 'Contact',
              href: '/contacto',
              icon: 'Mail',
            },
            {
              label: 'Privacy',
              href: '/privacidad',
              icon: 'FileText',
            },
            {
              label: 'Terms',
              href: '/terminos',
              icon: 'FileText',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies Dictionary['footer'];
