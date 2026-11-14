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
              icon: 'card',
            },
            {
              label: 'Contratos y firma digital',
              desc: 'Cierra acuerdos sin imprimir una sola hoja',
              href: '/explorar/contratos',
              icon: 'document',
            },
            {
              label: 'Nómina y compliance',
              desc: 'IMSS, SAT y dispersión en un solo lugar',
              href: '/explorar/nomina',
              icon: 'clients',
            },
            {
              label: 'Visibilidad financiera',
              desc: 'Sabe exactamente qué entra, qué sale y cuándo',
              href: '/explorar/finanzas',
              icon: 'chart-bar',
            },
            {
              label: 'Inventario y supply chain',
              desc: 'Control de stock en tiempo real, sin hojas de Excel',
              href: '/explorar/inventario',
              icon: 'parcel',
            },
            {
              label: 'Ventas y CRM',
              desc: 'Pipeline claro para cerrar más y perder menos',
              href: '/explorar/ventas',
              icon: 'target',
            },
            {
              label: 'Atención al cliente',
              desc: 'Mesa de ayuda multicanal sin caos operativo',
              href: '/explorar/atencion-clientes',
              icon: 'headphones',
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
              icon: 'office-building',
            },
            {
              label: 'Retail y e-commerce',
              desc: 'Inventario, pagos y logística integrados',
              href: '/industria/retail',
              icon: 'bag',
            },
            {
              label: 'Manufactura',
              desc: 'Digitaliza planta, proveedores y calidad',
              href: '/industria/manufactura',
              icon: 'factory',
            },
            {
              label: 'Despachos legales',
              desc: 'Expedientes, clientes y honorarios sin papel',
              href: '/industria/legal',
              icon: 'balance-scale',
            },
            {
              label: 'Construcción y real estate',
              desc: 'Contratos de obra, estimaciones y avance en obra',
              href: '/industria/construccion',
              icon: 'hard-hat',
            },
            {
              label: 'Salud y clínicas',
              desc: 'Agenda, expediente clínico y cobros en un sistema',
              href: '/industria/salud',
              icon: 'heart',
            },
            {
              label: 'Educación y EdTech',
              desc: 'Inscripciones, cobranza y comunicación con padres',
              href: '/industria/educacion',
              icon: 'graduation-cap',
            },
          ],
        },
        {
          heading: 'Colecciones',
          links: [
            {
              label: 'Lo básico para operar',
              desc: 'Cobros, finanzas, nómina y operación',
              href: '/colecciones/essential',
              icon: 'layers',
            },
            {
              label: 'Para el área de finanzas',
              desc: 'Fichas de Finanzas y Cobros',
              href: '/colecciones/cfo',
              icon: 'briefcase',
            },
            {
              label: 'Para agencias',
              desc: 'Fichas que declaran servir a agencias',
              href: '/colecciones/agencia',
              icon: 'trend-up',
            },
            {
              label: 'Legal y contratos',
              desc: 'Fichas de la categoría Legal',
              href: '/colecciones/legal',
              icon: 'book-open',
            },
            {
              label: 'Nuevo esta semana',
              desc: 'Fichas aprobadas en los últimos siete días',
              href: '/nuevo',
              icon: 'rocket',
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
              icon: 'send',
            },
            {
              label: 'Criterios de entrada',
              desc: 'Qué evalúa el equipo: tracción, modelo y ejecución',
              href: '/criterios',
              icon: 'clipboard-check',
            },
            {
              label: 'Proceso de revisión',
              desc: 'De draft a publicado: tiempos y comunicación directa',
              href: '/proceso',
              icon: 'gear',
            },
            {
              label: 'Preguntas frecuentes',
              desc: 'Todo lo que debes saber antes de enviar tu aplicación',
              href: '/faq',
              icon: 'help',
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
              icon: 'dashboard',
            },
            {
              label: 'Oportunidades',
              desc: 'Empresas que vieron tu solución y quieren hablar',
              href: '/leads',
              icon: 'target',
            },
            {
              label: 'Tu cuenta',
              desc: 'Actualiza tus datos y preferencias',
              href: '/account/settings',
              icon: 'person-circle',
            },
            {
              label: 'Nuevo esta semana',
              desc: 'Al aprobarse, tu ficha se destaca aquí una semana completa',
              href: '/nuevo',
              icon: 'rocket',
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
              icon: 'globe',
            },
            {
              label: 'Newsletter',
              desc: 'Inteligencia de mercado: qué buscan las empresas hoy',
              href: '/newsletter',
              icon: 'mail',
            },
            {
              label: 'Selección shwcs',
              desc: 'Las fichas que el equipo elige cada mes, con su motivo',
              href: '/destacados',
              icon: 'award',
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
              icon: 'target',
            },
            {
              label: 'Blog',
              desc: 'Ideas para elegir, construir y operar mejores proyectos',
              href: '/blog',
              icon: 'book-open',
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
              icon: 'rocket',
            },
            {
              label: 'Contacto',
              desc: 'Cuéntanos qué buscas, construyes o quieres proponer',
              href: '/contacto',
              icon: 'mail',
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
      },
    },
  },
} as const;
