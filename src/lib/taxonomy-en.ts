// English overrides for src/lib/taxonomy.ts, keyed identically (slug for
// categories/industries/collections, value/id for everything else). The
// underlying values in solutions/model.ts and the slugs/tones/rules in
// taxonomy.ts stay Spanish/canonical on purpose — they're what's stored in
// Postgres and what routes match on, and changing them would mean migrating
// data. This file only overrides *display* strings for locale === 'en';
// taxonomy.ts's localized*() helpers merge these in and fall back to the
// Spanish literal for any key this file doesn't cover. See CLAUDE.md §49
// ("catálogo... están traducidos") and the translation pass that made that
// claim true for the catalog/ficha surface.

export const categoryEn: Record<string, { label: string; title: string; description: string }> = {
  cobros: {
    label: 'Billing',
    title: 'Billing & Accounts Receivable',
    description:
      'Systems to shrink your collection cycle from weeks to days. Automatic reconciliation, reminders and B2B payment portals.',
  },
  contratos: {
    label: 'Legal',
    title: 'Contracts & Digital Signature',
    description:
      'Close B2B deals without printing a single page. Contract lifecycle management (CLM), NOM-151-valid signatures and secure storage.',
  },
  nomina: {
    label: 'Payroll',
    title: 'Payroll & Compliance',
    description:
      'IMSS, SAT, bank disbursement and vacation-management calculations in one place. Avoid fines and manual errors.',
  },
  finanzas: {
    label: 'Finance',
    title: 'Financial Visibility',
    description:
      'Tools to know exactly what comes in, what goes out, and when. Cash flow, budgets and bank consolidation.',
  },
  inventario: {
    label: 'Operations',
    title: 'Inventory & Supply Chain',
    description:
      'Real-time stock control, logistics and purchasing. Say goodbye to inventory managed in spreadsheets.',
  },
  ventas: {
    label: 'Sales',
    title: 'Sales & CRM',
    description:
      'Map your pipeline, follow up on prospects and close more deals. CRMs built for long B2B sales cycles.',
  },
  agencias: {
    label: 'Agencies',
    title: 'Software to Sell Services',
    description:
      'Tools for agencies, consultancies and studios that execute for you: billable hours, proposals and per-account profitability.',
  },
  marketing: {
    label: 'Marketing',
    title: 'Marketing & Growth',
    description:
      'Campaigns, email, social, content and analytics to attract B2B customers and measure what works.',
  },
  'atencion-clientes': {
    label: 'Customer service',
    title: 'Customer Service',
    description:
      'Omnichannel help desk, chat, WhatsApp and knowledge bases to answer fast without losing each customer’s context.',
  },
  'datos-ia': {
    label: 'Data & AI',
    title: 'Data & Artificial Intelligence',
    description:
      'Business dashboards, AI assistants and automations that read documents and data so you decide with real information.',
  },
  'ti-seguridad': {
    label: 'IT & Security',
    title: 'IT & Cybersecurity',
    description:
      'Protect accounts, devices and data: access, backups, monitoring and tech support so operations never stop.',
  },
  'comercio-electronico': {
    label: 'E-commerce',
    title: 'E-commerce',
    description:
      'Online stores, marketplaces and digital payments to sell online to businesses and consumers.',
  },
  productividad: {
    label: 'Productivity',
    title: 'Productivity & Collaboration',
    description:
      'Internal communication, shared documents, meetings and approvals so the team works in one place.',
  },
  desarrollo: {
    label: 'Development',
    title: 'Development & Product',
    description:
      'APIs, cloud infrastructure, no-code tools and testing to build and run your own software.',
  },
};

export const industryEn: Record<string, { label: string; title: string; description: string }> = {
  agencias: {
    label: 'Agencies & Consultancies',
    title: 'Software for Agencies',
    description:
      'Operating systems to bill hours, manage client projects and secure per-account profitability.',
  },
  retail: {
    label: 'Retail & E-commerce',
    title: 'Retail & E-commerce',
    description:
      'Integrated solutions to sync physical and digital inventory, orchestrate payments and automate logistics.',
  },
  manufactura: {
    label: 'Manufacturing & Logistics',
    title: 'Manufacturing',
    description:
      'Digitize your production floor. Industrial ERPs, quality management, maintenance and supplier portals.',
  },
  legal: {
    label: 'Law Firms',
    title: 'Law Firms',
    description:
      'Modern legal practice: digital case files, billable-hours invoicing and paperless client relationships.',
  },
  construccion: {
    label: 'Construction & Real Estate',
    title: 'Construction & Real Estate',
    description:
      'Control of construction budgets, contracts, contractor estimates and physical-financial tracking.',
  },
  salud: {
    label: 'Healthcare & Clinics',
    title: 'Healthcare & Clinics',
    description:
      'Electronic health records (NOM-024), multi-site scheduling, insurer billing and telemedicine.',
  },
  educacion: {
    label: 'Education & EdTech',
    title: 'Education & EdTech',
    description:
      'School management systems, LMS platforms, tuition billing and effective parent communication.',
  },
  tecnologia: {
    label: 'Technology & SaaS',
    title: 'Technology & SaaS',
    description:
      'Software and digital-services companies: recurring sales, customer support, subscription billing and remote teams.',
  },
  'servicios-financieros': {
    label: 'Financial services',
    title: 'Financial Services & Fintech',
    description:
      'Banks, fintechs, insurers and accounting firms: compliance, reconciliation, origination and regulated customer service.',
  },
  logistica: {
    label: 'Logistics & transportation',
    title: 'Logistics & Transportation',
    description:
      'Fleets, warehouses and carriers: routing, shipment tracking, proof of delivery and freight billing.',
  },
  hospitalidad: {
    label: 'Hotels & restaurants',
    title: 'Hospitality & Restaurants',
    description:
      'Hotels, restaurants and tourism: bookings, point of sale, staff shifts and suppliers.',
  },
  inmobiliario: {
    label: 'Real estate',
    title: 'Real Estate',
    description:
      'Developers, property managers and brokers: rent collection, contracts, leads and property maintenance.',
  },
  'servicios-profesionales': {
    label: 'Professional services',
    title: 'Professional Services',
    description:
      'Accountants, consultants, architects and engineering firms: hours, proposals, client files and per-project billing.',
  },
  'sector-publico': {
    label: 'Government & public sector',
    title: 'Government & Public Sector',
    description:
      'Agencies, municipalities and public bodies: digital procedures, transparency, public procurement and citizen services.',
  },
  agroindustria: {
    label: 'Agribusiness',
    title: 'Agribusiness & Food',
    description:
      'Growers, packers and distributors: traceability, harvests, cold chain and wholesale sales.',
  },
};

export const companySizeEn: Record<string, { label: string; range: string }> = {
  micro: { label: 'Micro business', range: '1–10 people' },
  pyme: { label: 'SMB', range: '11–100 people' },
  mediana: { label: 'Mid-market', range: '101–500 people' },
  corporativo: { label: 'Enterprise', range: '500+ people' },
};

export const offeringEn: Record<string, string> = {
  Software: 'Software',
  Agencia: 'Agency',
  Servicio: 'Service',
};

export const capabilityEn: Record<string, string> = {
  'facturacion-cfdi': 'Invoicing & CFDI',
  'cobranza-recordatorios': 'Collections & reminders',
  'conciliacion-bancaria': 'Bank reconciliation',
  'portal-pagos': 'Payment portal',
  suscripciones: 'Subscription billing',
  'cartera-antiguedad': 'Aging & receivables',
  'cuentas-por-pagar': 'Accounts payable',
  factoraje: 'Factoring',
  'flujo-efectivo': 'Cash flow',
  presupuestos: 'Budgets',
  contabilidad: 'Accounting',
  'reportes-tableros': 'Financial reports & dashboards',
  'gastos-reembolsos': 'Expenses & reimbursements',
  'tarjetas-corporativas': 'Corporate cards',
  'consolidacion-multiempresa': 'Multi-entity consolidation',
  impuestos: 'Taxes',
  'calculo-timbrado': 'Payroll calculation & stamping',
  dispersion: 'Payment disbursement',
  'imss-infonavit': 'IMSS & INFONAVIT',
  'asistencia-horarios': 'Attendance & schedules',
  'vacaciones-ausencias': 'Vacation & leave',
  'reclutamiento-onboarding': 'Recruiting & onboarding',
  desempeno: 'Performance reviews',
  capacitacion: 'Training',
  prestaciones: 'Benefits',
  'crm-pipeline': 'CRM & pipeline',
  'cotizaciones-propuestas': 'Quotes & proposals',
  'catalogo-precios': 'Catalog & price lists',
  prospeccion: 'Prospecting',
  pronostico: 'Sales forecasting',
  comisiones: 'Commissions',
  'contratos-cierre': 'Contracts & closing',
  'mayoreo-b2b': 'B2B wholesale sales',
  'postventa-renovaciones': 'Post-sale & renewals',
  'inventario-almacen': 'Inventory & warehouse',
  'compras-proveedores': 'Purchasing & suppliers',
  'logistica-envios': 'Logistics & shipping',
  'proyectos-tareas': 'Projects & tasks',
  produccion: 'Production',
  mantenimiento: 'Maintenance',
  calidad: 'Quality control',
  'mesa-ayuda': 'Help desk',
  'automatizacion-procesos': 'Process automation',
  documentos: 'Document management',
  'firma-electronica': 'Electronic signature',
  'gestion-contratos': 'Contract management',
  'expedientes-casos': 'Case files',
  'cumplimiento-normativo': 'Regulatory compliance',
  societario: 'Corporate & governance',
  'marcas-pi': 'Trademarks & IP',
  'proteccion-datos': 'Data protection',
  'horas-facturables': 'Billable hours',
  'cuentas-clientes': 'Client account management',
  'propuestas-briefs': 'Proposals & briefs',
  'rentabilidad-proyecto': 'Project profitability',
  'reportes-cliente': 'Client reporting',
  'capacidad-equipo': 'Team capacity',
  'aprobaciones-creativas': 'Creative approvals',
  'email-marketing': 'Email marketing',
  'redes-sociales': 'Social media',
  'seo-contenido': 'SEO & content',
  'publicidad-digital': 'Digital advertising',
  'automatizacion-marketing': 'Marketing automation',
  'analitica-marketing': 'Analytics & attribution',
  'eventos-webinars': 'Events & webinars',
  'chat-en-vivo': 'Live chat',
  'whatsapp-atencion': 'WhatsApp support',
  'base-conocimiento': 'Knowledge base',
  'encuestas-satisfaccion': 'Satisfaction surveys',
  'centro-contacto': 'Contact center',
  chatbots: 'Chatbots',
  'lealtad-clientes': 'Loyalty & retention',
  'inteligencia-negocios': 'Business intelligence',
  'asistentes-ia': 'AI assistants',
  'automatizacion-ia': 'AI automation',
  'procesamiento-documentos': 'Document processing',
  'modelos-predictivos': 'Predictive models',
  'integracion-datos': 'Data integration',
  ciberseguridad: 'Cybersecurity',
  'identidad-accesos': 'Identity & access',
  'respaldos-recuperacion': 'Backup & recovery',
  'gestion-dispositivos': 'Device management',
  'monitoreo-infraestructura': 'Infrastructure monitoring',
  'soporte-ti': 'IT support',
  'tienda-online': 'Online store',
  'venta-marketplaces': 'Marketplace selling',
  'checkout-pagos-online': 'Checkout & online payments',
  'catalogo-online': 'Online catalog',
  'carritos-abandonados': 'Abandoned-cart recovery',
  'punto-venta': 'Point of sale',
  'comunicacion-interna': 'Internal communication',
  'documentos-colaborativos': 'Collaborative documents',
  'agenda-reuniones': 'Scheduling & meetings',
  'gestion-conocimiento': 'Knowledge management',
  'flujos-aprobacion': 'Approval workflows',
  intranet: 'Intranet',
  'apis-integraciones': 'APIs & integrations',
  'herramientas-desarrollo': 'Developer tools',
  'infraestructura-nube': 'Cloud infrastructure',
  'no-code-low-code': 'No-code & low-code',
  'pruebas-calidad-software': 'Software testing',
  'analitica-producto': 'Product analytics',
};

export const integrationEn: Record<string, string> = {
  'sat-cfdi': 'Local Tax Authority',
  contpaqi: 'Contpaqi',
  aspel: 'Aspel',
  quickbooks: 'QuickBooks',
  xero: 'Xero',
  odoo: 'Odoo',
  sap: 'SAP',
  netsuite: 'Oracle NetSuite',
  shopify: 'Shopify',
  'mercado-libre': 'Mercado Libre',
  woocommerce: 'WooCommerce',
  amazon: 'Amazon',
  stripe: 'Stripe',
  conekta: 'Conekta',
  clip: 'Clip',
  'mercado-pago': 'Mercado Pago',
  paypal: 'PayPal',
  'bancos-mx': 'Local banks',
  'google-workspace': 'Google Workspace',
  'microsoft-365': 'Microsoft 365',
  slack: 'Slack',
  'whatsapp-business': 'WhatsApp Business',
  'zapier-make': 'Zapier / Make',
  'api-publica': 'Public API',
  webhooks: 'Webhooks',
};

export const pricingModelEn: Record<string, string> = {
  'suscripcion-mensual': 'Monthly subscription',
  'suscripcion-anual': 'Annual subscription',
  'pago-unico': 'One-time payment',
  'por-uso': 'Usage-based',
  'por-proyecto': 'Per project',
  'por-hora': 'Per hour',
  comision: 'Commission on transaction',
  'solo-cotizar': 'Quote only',
};

export const priceBandEn: Record<string, string> = {
  'menos-1000': 'Under $50 USD/month',
  'de-1000-a-5000': '$50–$250 USD/month',
  'de-5000-a-20000': '$250–$1,000 USD/month',
  'de-20000-a-50000': '$1,000–$2,500 USD/month',
  'mas-50000': 'Over $2,500 USD/month',
  'depende-alcance': 'Depends on scope',
};

export const setupTimeEn: Record<string, string> = {
  'mismo-dia': 'Same day',
  'menos-semana': 'Under a week',
  'una-a-cuatro-semanas': 'One to four weeks',
  'uno-a-tres-meses': 'One to three months',
  'mas-tres-meses': 'Over three months',
};

export const complianceEn: Record<string, string> = {
  'cfdi-4-0': 'Electronic invoicing',
  'sat-buzon': 'Tax mailbox & filing',
  'nom-151': 'Local e-signature standards',
  'nom-024': 'Local health records standards',
  'imss-infonavit': 'Local social security',
  lfpdppp: 'Local Data Privacy Law',
  gdpr: 'GDPR',
  'iso-27001': 'ISO 27001',
  'soc-2': 'SOC 2',
  'soporte-espanol': 'Spanish-language support',
  'factura-fiscal-mx': 'Local tax invoice',
};

// Only the four generic publicLinkKinds (src/lib/solutions/profile.ts) need a
// translation — the other seven are proper nouns (LinkedIn, X, TikTok...).
// The icon lookup in social-icons.tsx stays keyed on the canonical Spanish
// label; this only overrides the adjacent visible text.
export const publicLinkKindEn: Record<string, string> = {
  'Sitio web': 'Website',
  Documentación: 'Documentation',
  Precios: 'Pricing',
  Contacto: 'Contact',
};

export const collectionEn: Record<string, { title: string; description: string }> = {
  essential: {
    title: 'Operating basics',
    description:
      'Automatically gathers the approved listings in Billing, Finance, Payroll and Operations: what almost every company solves first.',
  },
  cfo: {
    title: 'For the finance team',
    description:
      'Automatically gathers the approved listings in Finance and Billing, for whoever runs financial control.',
  },
  agencia: {
    title: 'For agencies',
    description:
      'Automatically gathers the approved listings that say they serve agencies and consultancies.',
  },
  legal: {
    title: 'Legal and contracts',
    description: 'Automatically gathers the approved listings in the Legal category.',
  },
};
