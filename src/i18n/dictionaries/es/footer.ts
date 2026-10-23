export const footer = {
  description:
    'Software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con quienes los construyen.',
  newsletter: 'Suscribirse al newsletter',
  poweredBy: 'Powered by',
  sections: [
    {
      heading: 'Para compradores',
      cols: [
        {
          subheading: 'Por problema',
          links: [
            {
              label: 'Cobros y cobranza',
              href: '/explorar/cobros',
              icon: 'card',
            },
            {
              label: 'Contratos digitales',
              href: '/explorar/contratos',
              icon: 'document',
            },
            {
              label: 'Nómina y compliance',
              href: '/explorar/nomina',
              icon: 'clients',
            },
            {
              label: 'Visibilidad financiera',
              href: '/explorar/finanzas',
              icon: 'chart-bar',
            },
            {
              label: 'Inventario y supply',
              href: '/explorar/inventario',
              icon: 'parcel',
            },
            {
              label: 'Ventas y CRM',
              href: '/explorar/ventas',
              icon: 'target',
            },
            {
              label: 'Atención al cliente',
              href: '/explorar/soporte',
              icon: 'headphones',
            },
          ],
        },
        {
          subheading: 'Por industria',
          links: [
            {
              label: 'Agencias',
              href: '/industria/agencias',
              icon: 'office-building',
            },
            {
              label: 'Retail y e-commerce',
              href: '/industria/retail',
              icon: 'bag',
            },
            {
              label: 'Manufactura',
              href: '/industria/manufactura',
              icon: 'factory',
            },
            {
              label: 'Despachos legales',
              href: '/industria/legal',
              icon: 'balance-scale',
            },
            {
              label: 'Construcción',
              href: '/industria/construccion',
              icon: 'hard-hat',
            },
            {
              label: 'Salud y clínicas',
              href: '/industria/salud',
              icon: 'heart',
            },
            {
              label: 'Educación',
              href: '/industria/educacion',
              icon: 'graduation-cap',
            },
          ],
        },
        {
          subheading: 'Tu selección',
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
              label: 'Agencia en 30 días',
              href: '/colecciones/agencia',
              icon: 'trend-up',
            },
            {
              label: 'Stack legal moderno',
              href: '/colecciones/legal',
              icon: 'book-open',
            },
          ],
        },
      ],
    },
    {
      heading: 'Para fundadores',
      cols: [
        {
          subheading: 'Entrar al catálogo',
          links: [
            {
              label: 'Cómo aplicar',
              href: '/aplicar',
              icon: 'send',
            },
            {
              label: 'Criterios',
              href: '/criterios',
              icon: 'clipboard-check',
            },
            {
              label: 'Proceso',
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
          subheading: 'Oportunidades',
          links: [
            {
              label: 'Newsletter',
              href: '/newsletter',
              icon: 'mail',
            },
            {
              label: 'Eventos',
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
      heading: 'Compañía',
      cols: [
        {
          subheading: 'Recursos',
          links: [
            {
              label: 'El Proyecto',
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
              label: 'Contacto',
              href: '/contacto',
              icon: 'mail',
            },
            {
              label: 'Privacidad',
              href: '/privacidad',
              icon: 'document',
            },
            {
              label: 'Términos',
              href: '/terminos',
              icon: 'document',
            },
          ],
        },
      ],
    },
  ],
} as const;
