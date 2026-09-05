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

// Every vocabulary term a declared category/industry pulls in, flattened and
// ready to tokenize. `[]` ("declared, fits any") intentionally contributes no
// extra vocabulary of its own — matching every filter already covers that
// case; it shouldn't also flood search with every category's words.
export function expandVocabulary(categories?: string[], industries?: string[]): string[] {
  const terms: string[] = [];
  for (const category of categories ?? []) terms.push(...(categoryVocabulary[category as SolutionCategory] ?? []));
  for (const industry of industries ?? []) terms.push(...(industryVocabulary[industry as Industry] ?? []));
  return terms;
}
