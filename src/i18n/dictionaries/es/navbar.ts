export const navbar = {
  search: {
    searchLabel: 'Buscar soluciones en el catálogo',
    searchPlaceholder: '¿Qué necesitas resolver?',
    searchBtnLabel: 'Buscar soluciones',
    searchSubmitLabel: 'Enviar búsqueda',
    searchCloseLabel: 'Cerrar búsqueda',
    searchFormLabel: 'Buscar en el catálogo',
  },
  dashboard: 'Ir a mi panel',
  login: 'Entrar',
  subscribe: 'Suscribirse',
  communityLabel: 'Listas de la comunidad',
  communityTitle: 'Comunidad',
  openMenu: 'Abrir menú',
  closeMenu: 'Cerrar menú',
  menus: {
    compradores: {
      heading: 'Para compradores',
      columns: [
        {
          heading: 'Por problema operativo',
          links: [
            {
              label: 'Cobros y cuentas por cobrar',
              desc: 'Reduce tu ciclo de cobranza de semanas a días',
              href: '/explorar/cobros',
              icon: 'CreditCard',
            },
            {
              label: 'Contratos y firma digital',
              desc: 'Cierra acuerdos sin imprimir una sola hoja',
              href: '/explorar/contratos',
              icon: 'FileText',
            },
            {
              label: 'Nómina y compliance',
              desc: 'IMSS, SAT y dispersión en un solo lugar',
              href: '/explorar/nomina',
              icon: 'Users',
            },
            {
              label: 'Visibilidad financiera',
              desc: 'Sabe exactamente qué entra, qué sale y cuándo',
              href: '/explorar/finanzas',
              icon: 'BarChart3',
            },
            {
              label: 'Inventario y supply chain',
              desc: 'Control de stock en tiempo real, sin hojas de Excel',
              href: '/explorar/inventario',
              icon: 'Package',
            },
            {
              label: 'Ventas y CRM',
              desc: 'Pipeline claro para cerrar más y perder menos',
              href: '/explorar/ventas',
              icon: 'Target',
            },
            {
              label: 'Atención al cliente',
              desc: 'Mesa de ayuda multicanal sin caos operativo',
              href: '/explorar/soporte',
              icon: 'HeadphonesIcon',
            },
          ],
        },
        {
          heading: 'Por industria',
          links: [
            {
              label: 'Agencias y consultoras',
              desc: 'Factura, gestiona proyectos y cobra a tiempo',
              href: '/industria/agencias',
              icon: 'Building2',
            },
            {
              label: 'Retail y e-commerce',
              desc: 'Inventario, pagos y logística integrados',
              href: '/industria/retail',
              icon: 'ShoppingBag',
            },
            {
              label: 'Manufactura',
              desc: 'Digitaliza planta, proveedores y calidad',
              href: '/industria/manufactura',
              icon: 'Factory',
            },
            {
              label: 'Despachos legales',
              desc: 'Expedientes, clientes y honorarios sin papel',
              href: '/industria/legal',
              icon: 'Scale',
            },
            {
              label: 'Construcción y real estate',
              desc: 'Contratos de obra, estimaciones y avance en obra',
              href: '/industria/construccion',
              icon: 'HardHat',
            },
            {
              label: 'Salud y clínicas',
              desc: 'Agenda, expediente clínico y cobros en un sistema',
              href: '/industria/salud',
              icon: 'Heart',
            },
            {
              label: 'Educación y EdTech',
              desc: 'Inscripciones, cobranza y comunicación con padres',
              href: '/industria/educacion',
              icon: 'GraduationCap',
            },
          ],
        },
        {
          heading: 'Tu selección',
          links: [
            {
              label: 'Essential Stack MX',
              desc: 'Las herramientas mínimas para operar sin caos',
              href: '/colecciones/essential',
              icon: 'Layers',
            },
            {
              label: 'CFO Toolkit',
              desc: 'Control financiero para directores de finanzas',
              href: '/colecciones/cfo',
              icon: 'Briefcase',
            },
            {
              label: 'Agencia en 30 días',
              desc: 'Lanza tu operación de servicios desde cero',
              href: '/colecciones/agencia',
              icon: 'TrendingUp',
            },
            {
              label: 'Stack legal moderno',
              desc: 'De firma de contratos a cobranza, sin impresoras',
              href: '/colecciones/legal',
              icon: 'BookOpen',
            },
          ],
        },
      ],
      featured: {
        tag: 'Nuevo',
        label: 'Descubre proyectos',
        desc: 'Conoce qué resuelven, guarda opciones y compara antes de contactar.',
        cta: 'Explorar catálogo →',
        href: '/#catalogo',
        mockupType: 'catalog',
      },
    },
    fundadores: {
      heading: 'Para fundadores',
      columns: [
        {
          heading: 'Entrar al catálogo',
          links: [
            {
              label: 'Cómo aplicar',
              desc: 'El proceso de entrada en 3 pasos, sin burocracia',
              href: '/aplicar',
              icon: 'Send',
            },
            {
              label: 'Criterios de entrada',
              desc: 'Qué evalúa el equipo: tracción, modelo y ejecución',
              href: '/criterios',
              icon: 'ClipboardCheck',
            },
            {
              label: 'Proceso de revisión',
              desc: 'De draft a publicado: tiempos y comunicación directa',
              href: '/proceso',
              icon: 'Settings',
            },
            {
              label: 'Preguntas frecuentes',
              desc: 'Todo lo que debes saber antes de enviar tu aplicación',
              href: '/faq',
              icon: 'HelpCircle',
            },
          ],
        },
        {
          heading: 'Tu presencia',
          links: [
            {
              label: 'Mis soluciones',
              desc: 'Postula, consulta avances y administra tus soluciones',
              href: '/account/solutions',
              icon: 'LayoutDashboard',
            },
            {
              label: 'Oportunidades',
              desc: 'Empresas que vieron tu solución y quieren hablar',
              href: '/leads',
              icon: 'Target',
            },
            {
              label: 'Tu cuenta',
              desc: 'Actualiza tus datos y preferencias',
              href: '/account/settings',
              icon: 'UserCircle',
            },
            {
              label: 'Weekly Drops',
              desc: 'Sé parte del lanzamiento semanal más visto del ecosistema',
              href: '/drops',
              icon: 'Rocket',
            },
          ],
        },
        {
          heading: 'Novedades',
          links: [
            {
              label: 'Directorio de founders',
              desc: 'Conoce quién más está construyendo en el catálogo',
              href: '/fundadores',
              icon: 'Globe',
            },
            {
              label: 'Eventos y networking',
              desc: 'Encuentros B2B presenciales en CDMX y Monterrey',
              href: '/eventos',
              icon: 'Calendar',
            },
            {
              label: 'Newsletter',
              desc: 'Inteligencia de mercado: qué buscan las empresas hoy',
              href: '/newsletter',
              icon: 'Mail',
            },
            {
              label: 'Founders destacados',
              desc: 'Los operadores más traccionados del catálogo este mes',
              href: '/destacados',
              icon: 'Award',
            },
          ],
        },
      ],
      featured: {
        tag: 'Léelo',
        label: 'El Proyecto',
        desc: 'Por qué construimos shwcs, cómo funciona el proceso de selección y qué significa estar en el catálogo.',
        cta: 'Leer más →',
        href: '/el-proyecto',
        mockupType: 'catalog',
      },
    },
    recursos: {
      heading: 'Recursos',
      columns: [
        {
          heading: 'Conoce shwcs',
          links: [
            {
              label: 'El Proyecto',
              desc: 'Por qué existe shwcs y cómo elegimos qué presentar',
              href: '/el-proyecto',
              icon: 'Target',
            },
            {
              label: 'Blog',
              desc: 'Ideas para elegir, construir y operar mejores proyectos',
              href: '/blog',
              icon: 'BookOpen',
            },
          ],
        },
        {
          heading: 'Mantente cerca',
          links: [
            {
              label: 'Changelog',
              desc: 'Qué cambia en el catálogo y en la experiencia',
              href: '/changelog',
              icon: 'Rocket',
            },
            {
              label: 'Contacto',
              desc: 'Cuéntanos qué buscas, construyes o quieres proponer',
              href: '/contacto',
              icon: 'Mail',
            },
          ],
        },
      ],
      featured: {
        tag: 'shwcs',
        label: 'Proyectos con contexto',
        desc: 'Una selección para entender qué resuelve cada proyecto y quién está detrás.',
        cta: 'Conocer el proyecto →',
        href: '/el-proyecto',
        mockupType: 'catalog',
      },
    },
  },
} as const;
