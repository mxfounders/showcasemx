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
              icon: 'card',
            },
            {
              label: 'Digital Contracts',
              href: '/explorar/contratos',
              icon: 'document',
            },
            {
              label: 'Payroll & Compliance',
              href: '/explorar/nomina',
              icon: 'clients',
            },
            {
              label: 'Financial Visibility',
              href: '/explorar/finanzas',
              icon: 'chart-bar',
            },
            {
              label: 'Inventory & Supply',
              href: '/explorar/inventario',
              icon: 'parcel',
            },
            {
              label: 'Sales & CRM',
              href: '/explorar/ventas',
              icon: 'target',
            },
            {
              label: 'Customer Support',
              href: '/explorar/soporte',
              icon: 'headphones',
            },
          ],
        },
        {
          subheading: 'By industry',
          links: [
            {
              label: 'Agencies',
              href: '/industria/agencias',
              icon: 'office-building',
            },
            {
              label: 'Retail & E-commerce',
              href: '/industria/retail',
              icon: 'bag',
            },
            {
              label: 'Manufacturing',
              href: '/industria/manufactura',
              icon: 'factory',
            },
            {
              label: 'Law Firms',
              href: '/industria/legal',
              icon: 'balance-scale',
            },
            {
              label: 'Construction',
              href: '/industria/construccion',
              icon: 'hard-hat',
            },
            {
              label: 'Healthcare & Clinics',
              href: '/industria/salud',
              icon: 'heart',
            },
            {
              label: 'Education',
              href: '/industria/educacion',
              icon: 'graduation-cap',
            },
          ],
        },
        {
          subheading: 'Your selection',
          links: [
            {
              label: 'Essential Stack MX',
              href: '/colecciones/essential',
              icon: 'layers',
            },
            {
              label: 'CFO Toolkit',
              href: '/colecciones/cfo',
              icon: 'briefcase',
            },
            {
              label: 'Agency in 30 days',
              href: '/colecciones/agencia',
              icon: 'trend-up',
            },
            {
              label: 'Modern Legal Stack',
              href: '/colecciones/legal',
              icon: 'book-open',
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
              icon: 'send',
            },
            {
              label: 'Criteria',
              href: '/criterios',
              icon: 'clipboard-check',
            },
            {
              label: 'Process',
              href: '/proceso',
              icon: 'gear',
            },
            {
              label: 'FAQ',
              href: '/faq',
              icon: 'help',
            },
          ],
        },
        {
          subheading: 'Opportunities',
          links: [
            {
              label: 'Newsletter',
              href: '/newsletter',
              icon: 'mail',
            },
            {
              label: 'Events',
              href: '/eventos',
              icon: 'calendar',
            },
            {
              label: 'Sponsor',
              href: '/sponsor',
              icon: 'bolt',
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
              icon: 'target',
            },
            {
              label: 'Blog',
              href: '/blog',
              icon: 'book-open',
            },
            {
              label: 'Changelog',
              href: '/changelog',
              icon: 'rocket',
            },
          ],
        },
        {
          subheading: 'Legal',
          links: [
            {
              label: 'Contact',
              href: '/contacto',
              icon: 'mail',
            },
            {
              label: 'Privacy',
              href: '/privacidad',
              icon: 'document',
            },
            {
              label: 'Terms',
              href: '/terminos',
              icon: 'document',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies Dictionary['footer'];
