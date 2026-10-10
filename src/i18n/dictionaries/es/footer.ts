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
              icon: 'CreditCard',
            },
            {
              label: 'Contratos digitales',
              href: '/explorar/contratos',
              icon: 'FileText',
            },
            {
              label: 'Nómina y compliance',
              href: '/explorar/nomina',
              icon: 'Users',
            },
            {
              label: 'Visibilidad financiera',
              href: '/explorar/finanzas',
              icon: 'BarChart3',
            },
            {
              label: 'Inventario y supply',
              href: '/explorar/inventario',
              icon: 'Package',
            },
            {
              label: 'Ventas y CRM',
              href: '/explorar/ventas',
              icon: 'Target',
            },
            {
              label: 'Atención al cliente',
              href: '/explorar/soporte',
              icon: 'HeadphonesIcon',
            },
          ],
        },
        {
          subheading: 'Por industria',
          links: [
            {
              label: 'Agencias',
              href: '/industria/agencias',
              icon: 'Building2',
            },
            {
              label: 'Retail y e-commerce',
              href: '/industria/retail',
              icon: 'ShoppingBag',
            },
            {
              label: 'Manufactura',
              href: '/industria/manufactura',
              icon: 'Factory',
            },
            {
              label: 'Despachos legales',
              href: '/industria/legal',
              icon: 'Scale',
            },
            {
              label: 'Construcción',
              href: '/industria/construccion',
              icon: 'HardHat',
            },
            {
              label: 'Salud y clínicas',
              href: '/industria/salud',
              icon: 'Heart',
            },
            {
              label: 'Educación',
              href: '/industria/educacion',
              icon: 'GraduationCap',
            },
          ],
        },
        {
          subheading: 'Tu selección',
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
              label: 'Agencia en 30 días',
              href: '/colecciones/agencia',
              icon: 'TrendingUp',
            },
            {
              label: 'Stack legal moderno',
              href: '/colecciones/legal',
              icon: 'BookOpen',
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
              icon: 'Send',
            },
            {
              label: 'Criterios',
              href: '/criterios',
              icon: 'ClipboardCheck',
            },
            {
              label: 'Proceso',
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
          subheading: 'Oportunidades',
          links: [
            {
              label: 'Newsletter',
              href: '/newsletter',
              icon: 'Mail',
            },
            {
              label: 'Eventos',
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
      heading: 'Compañía',
      cols: [
        {
          subheading: 'Recursos',
          links: [
            {
              label: 'El Proyecto',
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
              label: 'Contacto',
              href: '/contacto',
              icon: 'Mail',
            },
            {
              label: 'Privacidad',
              href: '/privacidad',
              icon: 'FileText',
            },
            {
              label: 'Términos',
              href: '/terminos',
              icon: 'FileText',
            },
          ],
        },
      ],
    },
  ],
} as const;
