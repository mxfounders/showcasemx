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
  cobros: { label: 'Billing', title: 'Billing & Accounts Receivable', description: 'Systems to shrink your collection cycle from weeks to days. Automatic reconciliation, reminders and B2B payment portals.' },
  contratos: { label: 'Legal', title: 'Contracts & Digital Signature', description: 'Close B2B deals without printing a single page. Contract lifecycle management (CLM), NOM-151-valid signatures and secure storage.' },
  nomina: { label: 'Payroll', title: 'Payroll & Compliance', description: 'IMSS, SAT, bank disbursement and vacation-management calculations in one place. Avoid fines and manual errors.' },
  finanzas: { label: 'Finance', title: 'Financial Visibility', description: 'Tools to know exactly what comes in, what goes out, and when. Cash flow, budgets and bank consolidation.' },
  inventario: { label: 'Operations', title: 'Inventory & Supply Chain', description: 'Real-time stock control, logistics and purchasing. Say goodbye to inventory managed in spreadsheets.' },
  ventas: { label: 'Sales', title: 'Sales & CRM', description: 'Map your pipeline, follow up on prospects and close more deals. CRMs built for long B2B sales cycles.' },
  soporte: { label: 'Operations', title: 'Customer Support', description: 'Omnichannel help desk, ticketing and response automation to scale your B2B support without chaos.' },
  agencias: { label: 'Agencies', title: 'Software to Sell Services', description: 'Tools for agencies, consultancies and studios that execute for you: billable hours, proposals and per-account profitability.' },
};

export const industryEn: Record<string, { label: string; title: string; description: string }> = {
  agencias: { label: 'Agencies & Consultancies', title: 'Software for Agencies', description: 'Operating systems to bill hours, manage client projects and secure per-account profitability.' },
  retail: { label: 'Retail & E-commerce', title: 'Retail & E-commerce', description: 'Integrated solutions to sync physical and digital inventory, orchestrate payments and automate logistics.' },
  manufactura: { label: 'Manufacturing & Logistics', title: 'Manufacturing', description: 'Digitize your production floor. Industrial ERPs, quality management, maintenance and supplier portals.' },
  legal: { label: 'Law Firms', title: 'Law Firms', description: 'Modern legal practice: digital case files, billable-hours invoicing and paperless client relationships.' },
  construccion: { label: 'Construction & Real Estate', title: 'Construction & Real Estate', description: 'Control of construction budgets, contracts, contractor estimates and physical-financial tracking.' },
  salud: { label: 'Healthcare & Clinics', title: 'Healthcare & Clinics', description: 'Electronic health records (NOM-024), multi-site scheduling, insurer billing and telemedicine.' },
  educacion: { label: 'Education & EdTech', title: 'Education & EdTech', description: 'School management systems, LMS platforms, tuition billing and effective parent communication.' },
};

export const companySizeEn: Record<string, { label: string; range: string }> = {
  micro: { label: 'Micro business', range: '1–10 people' },
  pyme: { label: 'SMB', range: '11–100 people' },
  mediana: { label: 'Mid-market', range: '101–500 people' },
  corporativo: { label: 'Enterprise', range: '500+ people' },
};

export const offeringEn: Record<string, string> = { Software: 'Software', Agencia: 'Agency', Servicio: 'Service' };

export const capabilityEn: Record<string, string> = {
  'facturacion-cfdi': 'Invoicing & CFDI', 'cobranza-recordatorios': 'Collections & reminders', 'conciliacion-bancaria': 'Bank reconciliation', 'portal-pagos': 'Payment portal', suscripciones: 'Subscription billing', 'cartera-antiguedad': 'Aging & receivables', 'cuentas-por-pagar': 'Accounts payable', factoraje: 'Factoring',
  'flujo-efectivo': 'Cash flow', presupuestos: 'Budgets', contabilidad: 'Accounting', 'reportes-tableros': 'Financial reports & dashboards', 'gastos-reembolsos': 'Expenses & reimbursements', 'tarjetas-corporativas': 'Corporate cards', 'consolidacion-multiempresa': 'Multi-entity consolidation', impuestos: 'Taxes',
  'calculo-timbrado': 'Payroll calculation & stamping', dispersion: 'Payment disbursement', 'imss-infonavit': 'IMSS & INFONAVIT', 'asistencia-horarios': 'Attendance & schedules', 'vacaciones-ausencias': 'Vacation & leave', 'reclutamiento-onboarding': 'Recruiting & onboarding', desempeno: 'Performance reviews', capacitacion: 'Training', prestaciones: 'Benefits',
  'crm-pipeline': 'CRM & pipeline', 'cotizaciones-propuestas': 'Quotes & proposals', 'catalogo-precios': 'Catalog & price lists', prospeccion: 'Prospecting', pronostico: 'Sales forecasting', comisiones: 'Commissions', 'contratos-cierre': 'Contracts & closing', 'mayoreo-b2b': 'B2B wholesale sales', 'postventa-renovaciones': 'Post-sale & renewals',
  'inventario-almacen': 'Inventory & warehouse', 'compras-proveedores': 'Purchasing & suppliers', 'logistica-envios': 'Logistics & shipping', 'proyectos-tareas': 'Projects & tasks', produccion: 'Production', mantenimiento: 'Maintenance', calidad: 'Quality control', 'mesa-ayuda': 'Help desk', 'automatizacion-procesos': 'Process automation', documentos: 'Document management',
  'firma-electronica': 'Electronic signature', 'gestion-contratos': 'Contract management', 'expedientes-casos': 'Case files', 'cumplimiento-normativo': 'Regulatory compliance', societario: 'Corporate & governance', 'marcas-pi': 'Trademarks & IP', 'proteccion-datos': 'Data protection',
  'horas-facturables': 'Billable hours', 'cuentas-clientes': 'Client account management', 'propuestas-briefs': 'Proposals & briefs', 'rentabilidad-proyecto': 'Project profitability', 'reportes-cliente': 'Client reporting', 'capacidad-equipo': 'Team capacity', 'aprobaciones-creativas': 'Creative approvals',
};

export const integrationEn: Record<string, string> = {
  'sat-cfdi': 'SAT / CFDI', contpaqi: 'Contpaqi', aspel: 'Aspel', quickbooks: 'QuickBooks', xero: 'Xero', odoo: 'Odoo', sap: 'SAP', netsuite: 'Oracle NetSuite',
  shopify: 'Shopify', 'mercado-libre': 'Mercado Libre', woocommerce: 'WooCommerce', amazon: 'Amazon', stripe: 'Stripe', conekta: 'Conekta', clip: 'Clip', 'mercado-pago': 'Mercado Pago', paypal: 'PayPal', 'bancos-mx': 'Mexican banks',
  'google-workspace': 'Google Workspace', 'microsoft-365': 'Microsoft 365', slack: 'Slack', 'whatsapp-business': 'WhatsApp Business', 'zapier-make': 'Zapier / Make', 'api-publica': 'Public API', webhooks: 'Webhooks',
};

export const pricingModelEn: Record<string, string> = { 'suscripcion-mensual': 'Monthly subscription', 'suscripcion-anual': 'Annual subscription', 'pago-unico': 'One-time payment', 'por-uso': 'Usage-based', 'por-proyecto': 'Per project', 'por-hora': 'Per hour', comision: 'Commission on transaction', 'solo-cotizar': 'Quote only' };

export const priceBandEn: Record<string, string> = { 'menos-1000': 'Under $1,000 MXN/month', 'de-1000-a-5000': '$1,000–$5,000 MXN/month', 'de-5000-a-20000': '$5,000–$20,000 MXN/month', 'de-20000-a-50000': '$20,000–$50,000 MXN/month', 'mas-50000': 'Over $50,000 MXN/month', 'depende-alcance': 'Depends on scope' };

export const setupTimeEn: Record<string, string> = { 'mismo-dia': 'Same day', 'menos-semana': 'Under a week', 'una-a-cuatro-semanas': 'One to four weeks', 'uno-a-tres-meses': 'One to three months', 'mas-tres-meses': 'Over three months' };

export const complianceEn: Record<string, string> = { 'cfdi-4-0': 'CFDI 4.0 & stamping', 'sat-buzon': 'SAT tax mailbox & filing', 'nom-151': 'NOM-151 (e-signature)', 'nom-024': 'NOM-024 (clinical record)', 'imss-infonavit': 'IMSS / INFONAVIT', lfpdppp: 'LFPDPPP', gdpr: 'GDPR', 'iso-27001': 'ISO 27001', 'soc-2': 'SOC 2', 'soporte-espanol': 'Spanish-language support', 'factura-fiscal-mx': 'Mexican tax invoice' };

// Only the four generic publicLinkKinds (src/lib/solutions/profile.ts) need a
// translation — the other seven are proper nouns (LinkedIn, X, TikTok...).
// The icon lookup in social-icons.tsx stays keyed on the canonical Spanish
// label; this only overrides the adjacent visible text.
export const publicLinkKindEn: Record<string, string> = {
  'Sitio web': 'Website',
  'Documentación': 'Documentation',
  'Precios': 'Pricing',
  'Contacto': 'Contact',
};

export const collectionEn: Record<string, { title: string; description: string }> = {
  essential: { title: 'Essential Stack MX', description: 'The minimum, indispensable tools to run a business in Mexico without chaos.' },
  cfo: { title: 'CFO Toolkit', description: 'High-level financial control for finance directors and modern accounting teams.' },
  agencia: { title: 'Agency in 30 Days', description: 'The operating stack to launch, run and scale your B2B services agency from zero.' },
  legal: { title: 'Modern Legal Stack', description: 'The complete digital transformation kit for your in-house legal department or firm.' },
};
