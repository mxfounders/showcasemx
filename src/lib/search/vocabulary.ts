import type { SolutionCategory, Industry } from '@/lib/taxonomy';

// Concept -> taxonomy vocabulary, keyed by the *declared value* (`Ventas`,
// `Manufactura`...), never by a product's URL. Replaces the old
// src/lib/catalog-search.ts `keywords` map, which was a two-entry object
// keyed by exact website string — if a founder edited their site from
// "https://cordhq.app/" to "https://cordhq.app" (no trailing slash), every
// one of Cord's synonyms silently disappeared. A category/industry a
// solution declares is stable; its URL is not.
//
// Each list is real domain vocabulary a buyer would actually type — verb and
// noun forms, common abbreviations — so a declared category or industry
// pulls in everything that concept implies, not just its own label. Terms
// are plain Spanish; normalizeText() strips accents before comparison, so
// writing them with accents here stays readable without any matching cost.

export const categoryVocabulary: Record<SolutionCategory, string[]> = {
  Cobros: [
    'cobrar', 'cobro', 'cobros', 'cobranza', 'pago', 'pagos', 'pagar',
    'factura', 'facturas', 'facturar', 'facturación', 'recordatorio', 'recordatorios',
    'conciliación', 'conciliar', 'vencimiento', 'vencimientos', 'cartera', 'morosidad',
    'recuperación', 'recibo', 'recibos', 'depósito', 'depósitos', 'anticipo', 'anticipos',
  ],
  Finanzas: [
    'finanzas', 'financiero', 'financiera', 'presupuesto', 'presupuestos', 'flujo',
    'efectivo', 'caja', 'tesorería', 'gasto', 'gastos', 'ingreso', 'ingresos',
    'rentabilidad', 'margen', 'márgenes', 'reporte', 'reportes', 'contabilidad',
    'bancario', 'banco', 'bancos', 'proyección', 'consolidación',
  ],
  Nómina: [
    'nómina', 'nóminas', 'sueldo', 'sueldos', 'salario', 'salarios', 'imss', 'sat',
    'dispersión', 'vacaciones', 'vacación', 'permiso', 'permisos', 'recursos',
    'humanos', 'personal', 'empleado', 'empleados', 'contratación', 'onboarding',
    'capacitación', 'beneficio', 'beneficios', 'asistencia', 'turno', 'turnos',
  ],
  Ventas: [
    'venta', 'ventas', 'vender', 'crm', 'cotizar', 'cotización', 'cotizaciones',
    'cotizador', 'propuesta', 'propuestas', 'pipeline', 'embudo', 'prospecto',
    'prospectos', 'prospección', 'seguimiento', 'cierre', 'forecast', 'pronóstico',
    'predicción', 'mayoreo', 'menudeo', 'volumen', 'descuento', 'descuentos',
    'comisión', 'comisiones', 'oportunidad', 'oportunidades', 'cliente', 'clientes',
  ],
  'Operación': [
    'operación', 'inventario', 'stock', 'existencias', 'logística', 'almacén',
    'compra', 'compras', 'proveedor', 'proveedores', 'pedido', 'pedidos', 'entrega',
    'entregas', 'proceso', 'procesos', 'calidad', 'soporte', 'ticket', 'tickets',
    'mesa', 'ayuda', 'recurso', 'recursos', 'cadena', 'suministro',
  ],
  Legal: [
    'legal', 'contrato', 'contratos', 'firma', 'firmas', 'cláusula', 'cláusulas',
    'vigencia', 'expediente', 'expedientes', 'poder', 'poderes', 'cumplimiento',
    'compliance', 'jurídico', 'abogado', 'abogados', 'despacho', 'notarial',
    'acuerdo', 'acuerdos', 'obligación', 'obligaciones',
  ],
  Agencias: [
    'agencia', 'agencias', 'consultoría', 'consultor', 'consultores', 'proyecto',
    'proyectos', 'cliente', 'clientes', 'horas', 'facturable', 'retainer',
    'servicio', 'servicios', 'freelance', 'estudio', 'creativo', 'marketing',
    'diseño', 'desarrollo', 'implementación',
  ],
};

export const industryVocabulary: Record<Industry, string[]> = {
  Agencias: [
    'agencia', 'agencias', 'consultoría', 'consultor', 'freelance', 'estudio',
    'retainer', 'cliente', 'clientes', 'servicios', 'profesionales', 'marketing',
    'publicidad', 'creativo', 'b2b',
  ],
  Retail: [
    'retail', 'tienda', 'tiendas', 'comercio', 'electrónico', 'ecommerce', 'e-commerce',
    'punto', 'venta', 'pos', 'mayoreo', 'menudeo', 'inventario', 'sucursal',
    'sucursales', 'comprador', 'compradores', 'checkout',
  ],
  Manufactura: [
    'manufactura', 'planta', 'fábrica', 'producción', 'industrial', 'erp',
    'calidad', 'mantenimiento', 'proveedores', 'logística', 'almacén', 'línea',
    'producto', 'productos', 'planta productiva',
  ],
  Legal: [
    'despacho', 'abogados', 'jurídico', 'notarial', 'legal', 'litigio',
    'expediente', 'cliente', 'clientes',
  ],
  'Construcción': [
    'construcción', 'obra', 'obras', 'contratista', 'contratistas', 'inmobiliaria',
    'inmobiliario', 'edificación', 'presupuesto', 'estimación', 'proveedor',
  ],
  Salud: [
    'salud', 'clínica', 'clínicas', 'médico', 'médicos', 'paciente', 'pacientes',
    'hospital', 'consultorio', 'telemedicina', 'expediente', 'clínico',
    'aseguradora', 'aseguradoras',
  ],
  'Educación': [
    'educación', 'escuela', 'escuelas', 'colegio', 'universidad', 'alumno',
    'alumnos', 'estudiante', 'estudiantes', 'colegiatura', 'lms', 'capacitación',
  ],
};

// The 15-tab marketing narrative in landing-features.tsx used to carry a
// mapping from its own editorial concepts (crm, marketing, rh...) down to the
// 7 real categories, unexported and invisible to search. Moved here so both
// consumers share it instead of drifting.
export const conceptCategories: Record<string, SolutionCategory[]> = {
  crm: ['Ventas'], marketing: ['Agencias'], rh: ['Nómina'],
  finanzas: ['Finanzas', 'Cobros'], operaciones: ['Operación'], legal: ['Legal'],
  datos: ['Operación'], ti: ['Operación'], soporte: ['Operación'],
  ecommerce: ['Ventas'], proyectos: ['Operación'], diseno: ['Agencias'],
  automatizacion: ['Operación'], comunicacion: ['Ventas'], desarrollo: ['Operación'],
};

// Capability -> vocabulary, keyed by capability id (src/lib/solutions/model.ts
// solutionCapabilities). One level more specific than category vocabulary: a
// solution that declared "cotizaciones-propuestas" should surface for
// "cotización de mayoreo" even though its category (Ventas) also covers CRM,
// comisiones and forecast — words that would otherwise dilute a plain
// category-level match. Not every capability needs entries here; one missing
// simply falls back to its category's vocabulary contributing nothing extra.
export const capabilityVocabulary: Record<string, string[]> = {
  'facturacion-cfdi': ['facturar', 'factura', 'facturas', 'facturación', 'cfdi', 'timbrado', 'timbrar', 'comprobante', 'comprobantes', 'sat'],
  'cobranza-recordatorios': ['cobrar', 'cobro', 'cobros', 'cobranza', 'recordatorio', 'recordatorios', 'vencimiento', 'vencimientos', 'morosidad', 'recuperación'],
  'conciliacion-bancaria': ['conciliación', 'conciliar', 'banco', 'bancos', 'bancario', 'movimientos'],
  'portal-pagos': ['pago', 'pagos', 'pagar', 'portal', 'checkout', 'cobrar en línea'],
  'suscripciones': ['suscripción', 'suscripciones', 'recurrente', 'membresía'],
  'cartera-antiguedad': ['cartera', 'antigüedad', 'saldos', 'saldo'],
  'cuentas-por-pagar': ['cuentas por pagar', 'proveedor', 'proveedores', 'pagar a proveedores'],
  'factoraje': ['factoraje', 'anticipo', 'anticipos'],
  'flujo-efectivo': ['flujo', 'efectivo', 'caja', 'tesorería'],
  'presupuestos': ['presupuesto', 'presupuestos'],
  'contabilidad': ['contabilidad', 'contable', 'contador', 'contadores'],
  'reportes-tableros': ['reporte', 'reportes', 'tablero', 'tableros', 'dashboard', 'kpi'],
  'gastos-reembolsos': ['gasto', 'gastos', 'reembolso', 'reembolsos', 'viáticos'],
  'tarjetas-corporativas': ['tarjeta', 'tarjetas', 'corporativa', 'corporativas'],
  'consolidacion-multiempresa': ['consolidación', 'multiempresa', 'grupo', 'grupo empresarial'],
  'impuestos': ['impuesto', 'impuestos', 'declaración', 'declaraciones'],
  'calculo-timbrado': ['nómina', 'nóminas', 'timbrado', 'cálculo'],
  'dispersion': ['dispersión', 'dispersar', 'pago de sueldos'],
  'imss-infonavit': ['imss', 'infonavit'],
  'asistencia-horarios': ['asistencia', 'horario', 'horarios', 'turno', 'turnos', 'checador', 'checadas'],
  'vacaciones-ausencias': ['vacaciones', 'vacación', 'ausencia', 'ausencias', 'permiso', 'permisos'],
  'reclutamiento-onboarding': ['reclutamiento', 'contratación', 'onboarding', 'inducción'],
  'desempeno': ['desempeño', 'evaluación', 'evaluaciones'],
  'capacitacion': ['capacitación', 'capacitaciones', 'entrenamiento'],
  'prestaciones': ['prestación', 'prestaciones', 'beneficio', 'beneficios'],
  'crm-pipeline': ['crm', 'pipeline', 'embudo'],
  'cotizaciones-propuestas': ['cotizar', 'cotización', 'cotizaciones', 'cotizador', 'propuesta', 'propuestas'],
  'catalogo-precios': ['catálogo', 'lista de precios', 'listas de precios', 'precio', 'precios'],
  'prospeccion': ['prospección', 'prospecto', 'prospectos'],
  'pronostico': ['pronóstico', 'forecast', 'predicción'],
  'comisiones': ['comisión', 'comisiones'],
  'contratos-cierre': ['contrato', 'contratos', 'cierre'],
  'mayoreo-b2b': ['mayoreo', 'menudeo', 'volumen', 'b2b'],
  'postventa-renovaciones': ['postventa', 'renovación', 'renovaciones'],
  'inventario-almacen': ['inventario', 'stock', 'existencias', 'almacén'],
  'compras-proveedores': ['compra', 'compras', 'proveedor', 'proveedores'],
  'logistica-envios': ['logística', 'envío', 'envíos', 'entrega', 'entregas'],
  'proyectos-tareas': ['proyecto', 'proyectos', 'tarea', 'tareas'],
  'produccion': ['producción', 'planta', 'línea de producción'],
  'mantenimiento': ['mantenimiento'],
  'calidad': ['calidad'],
  'mesa-ayuda': ['soporte', 'ticket', 'tickets', 'mesa de ayuda', 'help desk'],
  'automatizacion-procesos': ['automatización', 'automatizar', 'proceso', 'procesos'],
  'documentos': ['documento', 'documentos', 'expediente digital'],
  'firma-electronica': ['firma', 'firmas', 'firma electrónica', 'nom-151'],
  'gestion-contratos': ['contrato', 'contratos', 'clm', 'ciclo de vida del contrato'],
  'expedientes-casos': ['expediente', 'expedientes', 'caso', 'casos'],
  'cumplimiento-normativo': ['cumplimiento', 'compliance', 'normativo'],
  'societario': ['societario', 'corporativo', 'acta', 'actas'],
  'marcas-pi': ['marca', 'marcas', 'propiedad intelectual', 'patente', 'patentes'],
  'proteccion-datos': ['protección de datos', 'privacidad', 'lfpdppp'],
  'horas-facturables': ['horas facturables', 'billable', 'horas'],
  'cuentas-clientes': ['cuenta', 'cuentas', 'cliente', 'clientes'],
  'propuestas-briefs': ['propuesta', 'propuestas', 'brief', 'briefs'],
  'rentabilidad-proyecto': ['rentabilidad', 'margen', 'márgenes'],
  'reportes-cliente': ['reporte para clientes', 'reporte de cliente'],
  'capacidad-equipo': ['capacidad', 'carga de trabajo', 'equipo'],
  'aprobaciones-creativas': ['aprobación', 'aprobaciones', 'creativo', 'creativos'],
};

// Every vocabulary term a declared category/industry/capability pulls in,
// flattened and ready to tokenize. `[]` ("declared, fits any") intentionally
// contributes no extra vocabulary of its own — matching every filter already
// covers that case; it shouldn't also flood search with every category's
// words. Capabilities have no "any" state, so they always contribute
// whatever their id resolves to.
export function expandVocabulary(categories?: string[], industries?: string[], capabilities?: string[]): string[] {
  const terms: string[] = [];
  for (const category of categories ?? []) terms.push(...(categoryVocabulary[category as SolutionCategory] ?? []));
  for (const industry of industries ?? []) terms.push(...(industryVocabulary[industry as Industry] ?? []));
  for (const capability of capabilities ?? []) terms.push(...(capabilityVocabulary[capability] ?? []));
  return terms;
}
