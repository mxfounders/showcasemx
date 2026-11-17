export const brandColors = {
  blue: { name: 'Azul', solid: '#365DC4', soft: '#E4EBFC' },
  sage: { name: 'Salvia', solid: '#416B50', soft: '#E4EDE2' },
  lavender: { name: 'Lavanda', solid: '#7753A5', soft: '#EEE5F5' },
  terracotta: { name: 'Terracota', solid: '#A94E35', soft: '#F6E5DD' },
  amber: { name: 'Ámbar', solid: '#88631B', soft: '#F4ECD5' },
} as const;

export type BrandTone = keyof typeof brandColors;

// Shared route mapping keeps matching links consistent in the header and footer.
const routeTones: Record<string, BrandTone> = {
  '/explorar/cobros': 'sage',
  '/explorar/finanzas': 'blue',
  '/explorar/nomina': 'lavender',
  '/explorar/ventas': 'terracotta',
  '/explorar/inventario': 'amber',
  '/explorar/contratos': 'lavender',
  '/explorar/agencias': 'blue',
  '/explorar/marketing': 'terracotta',
  '/explorar/atencion-clientes': 'sage',
  '/explorar/datos-ia': 'lavender',
  '/explorar/ti-seguridad': 'blue',
  '/explorar/comercio-electronico': 'amber',
  '/explorar/productividad': 'terracotta',
  '/explorar/desarrollo': 'sage',
  '/industria/agencias': 'blue',
  '/industria/retail': 'terracotta',
  '/industria/manufactura': 'amber',
  '/industria/legal': 'lavender',
  '/industria/construccion': 'amber',
  '/industria/salud': 'sage',
  '/industria/educacion': 'blue',
  '/industria/tecnologia': 'blue',
  '/industria/servicios-financieros': 'sage',
  '/industria/logistica': 'amber',
  '/industria/hospitalidad': 'terracotta',
  '/industria/inmobiliario': 'lavender',
  '/industria/servicios-profesionales': 'blue',
  '/industria/sector-publico': 'sage',
  '/industria/agroindustria': 'amber',
  '/colecciones/essential': 'sage',
  '/colecciones/cfo': 'blue',
  '/colecciones/agencia': 'terracotta',
  '/colecciones/legal': 'lavender',
  '/aplicar': 'blue',
  '/criterios': 'sage',
  '/proceso': 'amber',
  '/faq': 'amber',
  '/dashboard/founder': 'blue',
  '/leads': 'terracotta',
  '/perfil': 'lavender',
  '/nuevo': 'terracotta',
  '/fundadores': 'sage',
  '/account/solutions': 'blue',
  '/account/opportunities': 'terracotta',
  '/account/settings': 'lavender',
  '/comunidad': 'lavender',
  '/newsletter': 'blue',
  '/destacados': 'amber',
  '/buscar': 'amber',
  '/colecciones': 'lavender',
  '/explorar': 'sage',
  '/el-proyecto': 'terracotta',
  '/privacidad': 'lavender',
  '/terminos': 'lavender',
  '/cookies': 'amber',
};

export function getAccentStyle(href: string) {
  const palette = brandColors[routeTones[href] ?? 'blue'];
  return { backgroundColor: palette.soft, color: palette.solid };
}

// Shared treatment for action buttons; category colors remain semantic.
export const actionButtonStyle = {
  backgroundColor: brandColors.blue.soft,
  color: brandColors.blue.solid,
};

export const solutionCategoryTones: Record<string, BrandTone> = {
  Cobros: 'sage',
  Finanzas: 'blue',
  Nómina: 'lavender',
  Ventas: 'terracotta',
  Operación: 'amber',
  Legal: 'lavender',
  Agencias: 'blue',
  Marketing: 'terracotta',
  'Atención al cliente': 'sage',
  'Datos e IA': 'lavender',
  'TI y seguridad': 'blue',
  'Comercio electrónico': 'amber',
  Productividad: 'terracotta',
  Desarrollo: 'sage',
};
