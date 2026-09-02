const fs = require('fs');

const es = {
  landing: {
    loadingCatalog: "Cargando catálogo",
    founderTitle: "¿Construyes algo que una empresa necesita?",
    founderSubtitle: "Postula tu software, agencia o servicio y cuéntanos qué resuelves y para quién.",
    founderButton: "Postular mi solución",
    founderDisclaimer: "La postulación no garantiza la publicación.",
    heroLine1: "Encuentra soluciones.",
    heroLine2: "Conoce a sus creadores.",
    heroDescription: "Descubre herramientas creadas en México para resolver los retos de tu empresa. En shwcs seleccionamos productos, te ayudamos a entender qué resuelven y te acercamos a quienes los construyen.",
    heroSearchPlaceholder: "¿Qué necesitas resolver en tu empresa?",
    heroSearchButton: "Encontrar soluciones",
    heroSearchButtonMobile: "Buscar",
    heroSearchExample: "Prueba con “quiero cobrar a tiempo” o “necesito organizar mi nómina”.",
    heroExplore: "Explora:",
    heroExploreFinance: "Finanzas",
    heroExplorePayroll: "Nómina",
    heroExploreSales: "CRM",
  },
  navbar: {
    dashboard: "Ir a mi panel",
    login: "Entrar",
    subscribe: "Suscribirse",
    menus: {
      compradores: {
        heading: "Para compradores",
        cols: [
          {
            heading: "Por problema operativo",
            links: [
              { label: "Cobros y cuentas por cobrar", desc: "Reduce tu ciclo de cobranza de semanas a días", href: "/explorar/cobros", icon: "CreditCard" },
              { label: "Contratos y firma digital", desc: "Cierra acuerdos sin imprimir una sola hoja", href: "/explorar/contratos", icon: "FileText" },
              { label: "Nómina y compliance", desc: "IMSS, SAT y dispersión en un solo lugar", href: "/explorar/nomina", icon: "Users" },
              { label: "Visibilidad financiera", desc: "Sabe exactamente qué entra, qué sale y cuándo", href: "/explorar/finanzas", icon: "BarChart3" },
              { label: "Inventario y supply chain", desc: "Control de stock en tiempo real, sin hojas de Excel", href: "/explorar/inventario", icon: "Package" },
              { label: "Ventas y CRM", desc: "Pipeline claro para cerrar más y perder menos", href: "/explorar/ventas", icon: "Target" },
              { label: "Atención al cliente", desc: "Mesa de ayuda multicanal sin caos operativo", href: "/explorar/soporte", icon: "HeadphonesIcon" }
            ]
          },
          {
            heading: "Por industria",
            links: [
              { label: "Agencias y consultoras", desc: "Factura, gestiona proyectos y cobra a tiempo", href: "/industria/agencias", icon: "Building2" },
              { label: "Retail y e-commerce", desc: "Inventario, pagos y logística integrados", href: "/industria/retail", icon: "ShoppingBag" },
              { label: "Manufactura", desc: "Digitaliza planta, proveedores y calidad", href: "/industria/manufactura", icon: "Factory" },
              { label: "Despachos legales", desc: "Expedientes, clientes y honorarios sin papel", href: "/industria/legal", icon: "Scale" },
              { label: "Construcción y real estate", desc: "Contratos de obra, estimaciones y avance en obra", href: "/industria/construccion", icon: "HardHat" },
              { label: "Salud y clínicas", desc: "Agenda, expediente clínico y cobros en un sistema", href: "/industria/salud", icon: "Heart" },
              { label: "Educación y EdTech", desc: "Inscripciones, cobranza y comunicación con padres", href: "/industria/educacion", icon: "GraduationCap" }
            ]
          },
          {
            heading: "Tu selección",
            links: [
              { label: "Essential Stack MX", desc: "Las herramientas mínimas para operar sin caos", href: "/colecciones/essential", icon: "Layers" },
              { label: "CFO Toolkit", desc: "Control financiero para directores de finanzas", href: "/colecciones/cfo", icon: "Briefcase" },
              { label: "Agencia en 30 días", desc: "Lanza tu operación de servicios desde cero", href: "/colecciones/agencia", icon: "TrendingUp" },
              { label: "Stack legal moderno", desc: "De firma de contratos a cobranza, sin impresoras", href: "/colecciones/legal", icon: "BookOpen" }
            ]
          }
        ],
        featured: {
          tag: "Nuevo", label: "Descubre proyectos", desc: "Conoce qué resuelven, guarda opciones y compara antes de contactar.", cta: "Explorar catálogo →"
        }
      },
      fundadores: {
        heading: "Para fundadores",
        cols: [
          {
            heading: "Entrar al catálogo",
            links: [
              { label: "Cómo aplicar", desc: "El proceso de entrada en 3 pasos, sin burocracia", href: "/aplicar", icon: "Send" },
              { label: "Criterios de entrada", desc: "Qué evalúa el equipo: tracción, modelo y ejecución", href: "/criterios", icon: "ClipboardCheck" },
              { label: "Proceso de revisión", desc: "De draft a publicado: tiempos y comunicación directa", href: "/proceso", icon: "Settings" },
              { label: "Preguntas frecuentes", desc: "Todo lo que debes saber antes de enviar tu aplicación", href: "/faq", icon: "HelpCircle" }
            ]
          },
          {
            heading: "Tu presencia",
            links: [
              { label: "Mis soluciones", desc: "Postula, consulta avances y administra tus soluciones", href: "/account/solutions", icon: "LayoutDashboard" },
              { label: "Oportunidades", desc: "Empresas que vieron tu solución y quieren hablar", href: "/leads", icon: "Target" },
              { label: "Tu cuenta", desc: "Actualiza tus datos y preferencias", href: "/account/settings", icon: "UserCircle" },
              { label: "Weekly Drops", desc: "Sé parte del lanzamiento semanal más visto del ecosistema", href: "/drops", icon: "Rocket" }
            ]
          },
          {
            heading: "Novedades",
            links: [
              { label: "Directorio de founders", desc: "Conoce quién más está construyendo en el catálogo", href: "/fundadores", icon: "Globe" },
              { label: "Eventos y networking", desc: "Encuentros B2B presenciales en CDMX y Monterrey", href: "/eventos", icon: "Calendar" },
              { label: "Newsletter", desc: "Inteligencia de mercado: qué buscan las empresas hoy", href: "/newsletter", icon: "Mail" },
              { label: "Founders destacados", desc: "Los operadores más traccionados del catálogo este mes", href: "/destacados", icon: "Award" }
            ]
          }
        ],
        featured: {
          tag: "Léelo", label: "El Proyecto", desc: "Por qué construimos shwcs, cómo funciona el proceso de selección y qué significa estar en el catálogo.", cta: "Leer más →"
        }
      },
      recursos: {
        heading: "Recursos",
        cols: [
          {
            heading: "Conoce shwcs",
            links: [
              { label: "El Proyecto", desc: "Por qué existe shwcs y cómo elegimos qué presentar", href: "/el-proyecto", icon: "Target" },
              { label: "Blog", desc: "Ideas para elegir, construir y operar mejores proyectos", href: "/blog", icon: "BookOpen" }
            ]
          },
          {
            heading: "Mantente cerca",
            links: [
              { label: "Changelog", desc: "Qué cambia en el catálogo y en la experiencia", href: "/changelog", icon: "Rocket" },
              { label: "Contacto", desc: "Cuéntanos qué buscas, construyes o quieres proponer", href: "/contacto", icon: "Mail" }
            ]
          }
        ],
        featured: {
          tag: "shwcs", label: "Proyectos con contexto", desc: "Una selección para entender qué resuelve cada proyecto y quién está detrás.", cta: "Conocer el proyecto →"
        }
      }
    }
  },
  footer: {
    madeIn: "Hecho en México",
    sections: [
      {
        heading: "Para compradores",
        cols: [
          {
            subheading: "Por problema",
            links: [
              { label: "Cobros y cobranza", href: "/explorar/cobros", icon: "CreditCard" },
              { label: "Contratos digitales", href: "/explorar/contratos", icon: "FileText" },
              { label: "Nómina y compliance", href: "/explorar/nomina", icon: "Users" },
              { label: "Visibilidad financiera", href: "/explorar/finanzas", icon: "BarChart3" },
              { label: "Inventario y supply", href: "/explorar/inventario", icon: "Package" },
              { label: "Ventas y CRM", href: "/explorar/ventas", icon: "Target" },
              { label: "Atención al cliente", href: "/explorar/soporte", icon: "HeadphonesIcon" }
            ]
          },
          {
            subheading: "Por industria",
            links: [
              { label: "Agencias", href: "/industria/agencias", icon: "Building2" },
              { label: "Retail y e-commerce", href: "/industria/retail", icon: "ShoppingBag" },
              { label: "Manufactura", href: "/industria/manufactura", icon: "Factory" },
              { label: "Despachos legales", href: "/industria/legal", icon: "Scale" },
              { label: "Construcción", href: "/industria/construccion", icon: "HardHat" },
              { label: "Salud y clínicas", href: "/industria/salud", icon: "Heart" },
              { label: "Educación", href: "/industria/educacion", icon: "GraduationCap" }
            ]
          },
          {
            subheading: "Tu selección",
            links: [
              { label: "Essential Stack MX", href: "/colecciones/essential", icon: "Layers" },
              { label: "CFO Toolkit", href: "/colecciones/cfo", icon: "Briefcase" },
              { label: "Agencia en 30 días", href: "/colecciones/agencia", icon: "TrendingUp" },
              { label: "Stack legal moderno", href: "/colecciones/legal", icon: "BookOpen" }
            ]
          }
        ]
      },
      {
        heading: "Para fundadores",
        cols: [
          {
            subheading: "Entrar al catálogo",
            links: [
              { label: "Cómo aplicar", href: "/aplicar", icon: "Send" },
              { label: "Criterios", href: "/criterios", icon: "ClipboardCheck" },
              { label: "Proceso", href: "/proceso", icon: "Settings" },
              { label: "FAQ", href: "/faq", icon: "HelpCircle" }
            ]
          },
          {
            subheading: "Oportunidades",
            links: [
              { label: "Newsletter", href: "/newsletter", icon: "Mail" },
              { label: "Eventos", href: "/eventos", icon: "Calendar" },
              { label: "Sponsor", href: "/sponsor", icon: "Zap" }
            ]
          }
        ]
      },
      {
        heading: "Compañía",
        cols: [
          {
            subheading: "Recursos",
            links: [
              { label: "El Proyecto", href: "/el-proyecto", icon: "Target" },
              { label: "Blog", href: "/blog", icon: "BookOpen" },
              { label: "Changelog", href: "/changelog", icon: "Rocket" }
            ]
          },
          {
            subheading: "Legal",
            links: [
              { label: "Contacto", href: "/contacto", icon: "Mail" },
              { label: "Privacidad", href: "/privacidad", icon: "FileText" },
              { label: "Términos", href: "/terminos", icon: "FileText" }
            ]
          }
        ]
      }
    ]
  }
};

const en = {
  landing: {
    loadingCatalog: "Loading catalog",
    founderTitle: "Are you building something a company needs?",
    founderSubtitle: "Apply with your software, agency or service and tell us what you solve and for whom.",
    founderButton: "Apply my solution",
    founderDisclaimer: "Applying does not guarantee publication.",
    heroLine1: "Find solutions.",
    heroLine2: "Meet their creators.",
    heroDescription: "Discover tools created in Mexico to solve your company's challenges. At shwcs we select products, help you understand what they solve, and bring you closer to those who build them.",
    heroSearchPlaceholder: "What do you need to solve in your company?",
    heroSearchButton: "Find solutions",
    heroSearchButtonMobile: "Search",
    heroSearchExample: "Try with “I want to get paid on time” or “I need to organize my payroll”.",
    heroExplore: "Explore:",
    heroExploreFinance: "Finance",
    heroExplorePayroll: "Payroll",
    heroExploreSales: "CRM",
  },
  navbar: {
    dashboard: "Go to dashboard",
    login: "Log in",
    subscribe: "Subscribe",
    menus: {
      compradores: {
        heading: "For buyers",
        cols: [
          {
            heading: "By operational problem",
            links: [
              { label: "Billing & Accounts Receivable", desc: "Reduce your collection cycle from weeks to days", href: "/explorar/cobros", icon: "CreditCard" },
              { label: "Contracts & Digital Signature", desc: "Close deals without printing a single page", href: "/explorar/contratos", icon: "FileText" },
              { label: "Payroll & Compliance", desc: "IMSS, SAT and disbursement in one place", href: "/explorar/nomina", icon: "Users" },
              { label: "Financial Visibility", desc: "Know exactly what comes in, what goes out and when", href: "/explorar/finanzas", icon: "BarChart3" },
              { label: "Inventory & Supply Chain", desc: "Real-time stock control, no Excel sheets", href: "/explorar/inventario", icon: "Package" },
              { label: "Sales & CRM", desc: "Clear pipeline to close more and lose less", href: "/explorar/ventas", icon: "Target" },
              { label: "Customer Support", desc: "Multichannel helpdesk without operational chaos", href: "/explorar/soporte", icon: "HeadphonesIcon" }
            ]
          },
          {
            heading: "By industry",
            links: [
              { label: "Agencies & Consulting", desc: "Invoice, manage projects and collect on time", href: "/industria/agencias", icon: "Building2" },
              { label: "Retail & E-commerce", desc: "Integrated inventory, payments and logistics", href: "/industria/retail", icon: "ShoppingBag" },
              { label: "Manufacturing", desc: "Digitize plant, suppliers and quality", href: "/industria/manufactura", icon: "Factory" },
              { label: "Law Firms", desc: "Paperless files, clients and fees", href: "/industria/legal", icon: "Scale" },
              { label: "Construction & Real Estate", desc: "Construction contracts, estimates and progress", href: "/industria/construccion", icon: "HardHat" },
              { label: "Healthcare & Clinics", desc: "Agenda, clinical records and billing in one system", href: "/industria/salud", icon: "Heart" },
              { label: "Education & EdTech", desc: "Enrollment, collection and parent communication", href: "/industria/educacion", icon: "GraduationCap" }
            ]
          },
          {
            heading: "Your selection",
            links: [
              { label: "Essential Stack MX", desc: "The minimum tools to operate without chaos", href: "/colecciones/essential", icon: "Layers" },
              { label: "CFO Toolkit", desc: "Financial control for finance directors", href: "/colecciones/cfo", icon: "Briefcase" },
              { label: "Agency in 30 days", desc: "Launch your service operation from scratch", href: "/colecciones/agencia", icon: "TrendingUp" },
              { label: "Modern Legal Stack", desc: "From contract signing to collection, without printers", href: "/colecciones/legal", icon: "BookOpen" }
            ]
          }
        ],
        featured: {
          tag: "New", label: "Discover projects", desc: "Learn what they solve, save options and compare before contacting.", cta: "Explore catalog →"
        }
      },
      fundadores: {
        heading: "For founders",
        cols: [
          {
            heading: "Enter the catalog",
            links: [
              { label: "How to apply", desc: "The 3-step entry process, without bureaucracy", href: "/aplicar", icon: "Send" },
              { label: "Entry criteria", desc: "What the team evaluates: traction, model and execution", href: "/criterios", icon: "ClipboardCheck" },
              { label: "Review process", desc: "From draft to published: times and direct communication", href: "/proceso", icon: "Settings" },
              { label: "FAQ", desc: "Everything you need to know before sending your application", href: "/faq", icon: "HelpCircle" }
            ]
          },
          {
            heading: "Your presence",
            links: [
              { label: "My solutions", desc: "Apply, check progress and manage your solutions", href: "/account/solutions", icon: "LayoutDashboard" },
              { label: "Opportunities", desc: "Companies that saw your solution and want to talk", href: "/leads", icon: "Target" },
              { label: "Your account", desc: "Update your details and preferences", href: "/account/settings", icon: "UserCircle" },
              { label: "Weekly Drops", desc: "Be part of the most viewed weekly launch in the ecosystem", href: "/drops", icon: "Rocket" }
            ]
          },
          {
            heading: "News",
            links: [
              { label: "Founders directory", desc: "Meet who else is building in the catalog", href: "/fundadores", icon: "Globe" },
              { label: "Events & Networking", desc: "In-person B2B meetings in CDMX and Monterrey", href: "/eventos", icon: "Calendar" },
              { label: "Newsletter", desc: "Market intelligence: what companies are looking for today", href: "/newsletter", icon: "Mail" },
              { label: "Featured Founders", desc: "The most tractioned operators in the catalog this month", href: "/destacados", icon: "Award" }
            ]
          }
        ],
        featured: {
          tag: "Read it", label: "The Project", desc: "Why we built shwcs, how the selection process works and what it means to be in the catalog.", cta: "Read more →"
        }
      },
      recursos: {
        heading: "Resources",
        cols: [
          {
            heading: "Get to know shwcs",
            links: [
              { label: "The Project", desc: "Why shwcs exists and how we choose what to present", href: "/el-proyecto", icon: "Target" },
              { label: "Blog", desc: "Ideas to choose, build and operate better projects", href: "/blog", icon: "BookOpen" }
            ]
          },
          {
            heading: "Stay close",
            links: [
              { label: "Changelog", desc: "What changes in the catalog and in the experience", href: "/changelog", icon: "Rocket" },
              { label: "Contact", desc: "Tell us what you are looking for, building or want to propose", href: "/contacto", icon: "Mail" }
            ]
          }
        ],
        featured: {
          tag: "shwcs", label: "Projects with context", desc: "A selection to understand what each project solves and who is behind it.", cta: "Get to know the project →"
        }
      }
    }
  },
  footer: {
    madeIn: "Made in Mexico",
    sections: [
      {
        heading: "For buyers",
        cols: [
          {
            subheading: "By problem",
            links: [
              { label: "Billing & Collection", href: "/explorar/cobros", icon: "CreditCard" },
              { label: "Digital Contracts", href: "/explorar/contratos", icon: "FileText" },
              { label: "Payroll & Compliance", href: "/explorar/nomina", icon: "Users" },
              { label: "Financial Visibility", href: "/explorar/finanzas", icon: "BarChart3" },
              { label: "Inventory & Supply", href: "/explorar/inventario", icon: "Package" },
              { label: "Sales & CRM", href: "/explorar/ventas", icon: "Target" },
              { label: "Customer Support", href: "/explorar/soporte", icon: "HeadphonesIcon" }
            ]
          },
          {
            subheading: "By industry",
            links: [
              { label: "Agencies", href: "/industria/agencias", icon: "Building2" },
              { label: "Retail & E-commerce", href: "/industria/retail", icon: "ShoppingBag" },
              { label: "Manufacturing", href: "/industria/manufactura", icon: "Factory" },
              { label: "Law Firms", href: "/industria/legal", icon: "Scale" },
              { label: "Construction", href: "/industria/construccion", icon: "HardHat" },
              { label: "Healthcare & Clinics", href: "/industria/salud", icon: "Heart" },
              { label: "Education", href: "/industria/educacion", icon: "GraduationCap" }
            ]
          },
          {
            subheading: "Your selection",
            links: [
              { label: "Essential Stack MX", href: "/colecciones/essential", icon: "Layers" },
              { label: "CFO Toolkit", href: "/colecciones/cfo", icon: "Briefcase" },
              { label: "Agency in 30 days", href: "/colecciones/agencia", icon: "TrendingUp" },
              { label: "Modern Legal Stack", href: "/colecciones/legal", icon: "BookOpen" }
            ]
          }
        ]
      },
      {
        heading: "For founders",
        cols: [
          {
            subheading: "Enter the catalog",
            links: [
              { label: "How to apply", href: "/aplicar", icon: "Send" },
              { label: "Criteria", href: "/criterios", icon: "ClipboardCheck" },
              { label: "Process", href: "/proceso", icon: "Settings" },
              { label: "FAQ", href: "/faq", icon: "HelpCircle" }
            ]
          },
          {
            subheading: "Opportunities",
            links: [
              { label: "Newsletter", href: "/newsletter", icon: "Mail" },
              { label: "Events", href: "/eventos", icon: "Calendar" },
              { label: "Sponsor", href: "/sponsor", icon: "Zap" }
            ]
          }
        ]
      },
      {
        heading: "Company",
        cols: [
          {
            subheading: "Resources",
            links: [
              { label: "The Project", href: "/el-proyecto", icon: "Target" },
              { label: "Blog", href: "/blog", icon: "BookOpen" },
              { label: "Changelog", href: "/changelog", icon: "Rocket" }
            ]
          },
          {
            subheading: "Legal",
            links: [
              { label: "Contact", href: "/contacto", icon: "Mail" },
              { label: "Privacy", href: "/privacidad", icon: "FileText" },
              { label: "Terms", href: "/terminos", icon: "FileText" }
            ]
          }
        ]
      }
    ]
  }
};

fs.writeFileSync('src/i18n/dictionaries/es.ts', 'export const es = ' + JSON.stringify(es, null, 2) + ' as const;');
fs.writeFileSync('src/i18n/dictionaries/en.ts', 'export const en = ' + JSON.stringify(en, null, 2) + ' as const;');
