export const brandColors = {
  blue: { name: "Azul", solid: "#365DC4", soft: "#E4EBFC" },
  sage: { name: "Salvia", solid: "#416B50", soft: "#E4EDE2" },
  lavender: { name: "Lavanda", solid: "#7753A5", soft: "#EEE5F5" },
  terracotta: { name: "Terracota", solid: "#A94E35", soft: "#F6E5DD" },
  amber: { name: "Ámbar", solid: "#88631B", soft: "#F4ECD5" },
} as const;

export type BrandTone = keyof typeof brandColors;

// Shared route mapping keeps matching links consistent in the header and footer.
const routeTones: Record<string, BrandTone> = {
  "/explorar/cobros": "sage", "/explorar/finanzas": "blue",
  "/explorar/nomina": "lavender", "/explorar/ventas": "terracotta",
  "/explorar/inventario": "amber", "/explorar/soporte": "amber",
  "/explorar/contratos": "lavender",
  "/industria/agencias": "blue", "/industria/retail": "terracotta",
  "/industria/manufactura": "amber", "/industria/legal": "lavender",
  "/industria/construccion": "amber", "/industria/salud": "sage",
  "/industria/educacion": "blue",
  "/colecciones/essential": "sage", "/colecciones/cfo": "blue",
  "/colecciones/agencia": "terracotta", "/colecciones/legal": "lavender",
  "/aplicar": "blue", "/criterios": "sage", "/proceso": "amber",
  "/faq": "amber", "/dashboard/founder": "blue", "/leads": "terracotta",
  "/perfil": "lavender", "/drops": "terracotta", "/fundadores": "sage",
  "/account/solutions": "blue", "/account/opportunities": "terracotta",
  "/account/settings": "lavender", "/comunidad": "lavender",
  "/eventos": "lavender", "/newsletter": "blue", "/destacados": "amber",
  "/buscar": "amber", "/colecciones": "lavender", "/explorar": "sage",
  "/el-proyecto": "terracotta", "/privacidad": "lavender",
  "/terminos": "lavender", "/cookies": "amber",
};

export function getAccentStyle(href: string) {
  const palette = brandColors[routeTones[href] ?? "blue"];
  return { backgroundColor: palette.soft, color: palette.solid };
}

// Shared treatment for action buttons; category colors remain semantic.
export const actionButtonStyle = { backgroundColor: brandColors.blue.soft, color: brandColors.blue.solid };

export const solutionCategoryTones: Record<string, BrandTone> = {Cobros:'sage',Finanzas:'blue','Nómina':'lavender',Ventas:'terracotta','Operación':'amber',Legal:'lavender',Agencias:'blue'};
