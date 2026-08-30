import type { BrandTone } from "@/lib/brand-colors";

// Mixed local catalog: official offerings are explicitly distinguished from design demos.
export type PreviewProduct = {
  name: string;
  description: string;
  feature: string;
  website?: string;
  provider?: string;
  offering?: "Software" | "Servicio";
  ogImage?: string;
  favicon?: string;
};

// Descriptions based on the providers' official sites. No independent certification implied.
const cord: PreviewProduct = {
  name: "Cord",
  description: "Cotiza, da seguimiento a propuestas y gestiona cobranza y facturación en una plataforma.",
  feature: "Cotizaciones, cobros y facturación",
  website: "https://cordhq.app/",
  ogImage: "/images/catalog/cord-og.jpg",
  favicon: "/images/catalog/cord-favicon.svg",
  provider: "Flouvia",
  offering: "Software",
};

const flouvia: PreviewProduct = {
  name: "Flouvia",
  description: "Desarrollo de e-commerce, portales B2B y automatizaciones a medida para tu operación.",
  feature: "Ingeniería e-commerce y B2B",
  website: "https://flouvia.com/",
  ogImage: "/images/catalog/flouvia-og.png",
  favicon: "/images/catalog/flouvia-favicon.svg",
  provider: "Flouvia",
  offering: "Servicio",
};

export type PreviewCategory = {
  id: string;
  label: string;
  action: string;
  tone: BrandTone;
  products: PreviewProduct[];
};

export const previewCategories: PreviewCategory[] = [
  {
    id: "cobros", label: "Cobros", action: "Cobrar a tiempo", tone: "sage",
    products: [
      cord,
      { name: "Enlace", description: "Comparte un enlace y simplifica la forma en que te pagan.", feature: "Links de pago" },
      { name: "Conciliado", description: "Relaciona cada depósito con la factura que le corresponde.", feature: "Conciliación de ingresos" },
      { name: "Recurrente", description: "Organiza los cobros que se repiten cada mes.", feature: "Cobros recurrentes" },
      { name: "Vence", description: "Consulta qué facturas están por vencer y cuáles necesitan seguimiento.", feature: "Control de vencimientos" },
      { name: "Abono", description: "Registra pagos parciales y consulta el saldo de cada cliente.", feature: "Pagos parciales" },
      { name: "Ruta", description: "Asigna cada cuenta por cobrar a la persona responsable.", feature: "Equipos de cobranza" },
      { name: "Anticipo", description: "Organiza anticipos y pagos por etapas de tus proyectos.", feature: "Pagos por proyecto" },
      { name: "Recibo", description: "Centraliza los comprobantes y el historial de cada pago.", feature: "Historial de pagos" },
    ],
  },
  {
    id: "finanzas", label: "Finanzas", action: "Entender tus números", tone: "blue",
    products: [
      cord,
      { name: "Margen", description: "Entiende cuánto deja cada proyecto después de sus costos.", feature: "Rentabilidad por proyecto" },
      { name: "Balance", description: "Planea tus gastos y compara el presupuesto con la realidad.", feature: "Control de presupuesto" },
      { name: "Caja", description: "Anticipa los pagos que vienen y el dinero disponible.", feature: "Proyección de efectivo" },
      { name: "Gasto", description: "Revisa las solicitudes de gasto antes de autorizarlas.", feature: "Aprobación de gastos" },
      { name: "Viático", description: "Organiza anticipos, comprobantes y gastos de viaje.", feature: "Viáticos" },
      { name: "Escenario", description: "Compara escenarios antes de comprometer tu presupuesto.", feature: "Planeación financiera" },
      { name: "Cuenta", description: "Reúne movimientos de tus cuentas en un mismo espacio.", feature: "Control de cuentas" },
      { name: "Reporte", description: "Prepara reportes financieros sin copiar datos entre archivos.", feature: "Reportes financieros" },
    ],
  },
  {
    id: "nomina", label: "Nómina", action: "Organizar tu equipo", tone: "lavender",
    products: [
      { name: "Equipo", description: "Ten a la mano la información y los documentos de tu equipo.", feature: "Expedientes de personal" },
      { name: "Quincena", description: "Prepara incidencias y revisa la nómina antes de pagar.", feature: "Gestión de nómina" },
      { name: "Turno", description: "Coordina horarios y ausencias sin cruzar hojas de cálculo.", feature: "Turnos y asistencia" },
      { name: "Bienvenida", description: "Acompaña cada ingreso con tareas y documentos claros.", feature: "Onboarding de personal" },
      { name: "Vacación", description: "Gestiona solicitudes de vacaciones y disponibilidad del equipo.", feature: "Vacaciones y permisos" },
      { name: "Talento", description: "Da seguimiento a candidatos y entrevistas en un solo lugar.", feature: "Reclutamiento" },
      { name: "Objetivo", description: "Alinea metas y conversaciones de seguimiento con tu equipo.", feature: "Gestión de objetivos" },
      { name: "Aprende", description: "Organiza la capacitación y el progreso de cada persona.", feature: "Capacitación interna" },
      { name: "Beneficio", description: "Presenta los beneficios disponibles para cada integrante.", feature: "Beneficios del equipo" },
    ],
  },
  {
    id: "ventas", label: "Ventas", action: "Cerrar más oportunidades", tone: "terracotta",
    products: [
      cord,
      flouvia,
      { name: "Contacto", description: "Recuerda lo que hablaste con cada cliente y cuándo volver.", feature: "Seguimiento de clientes" },
      { name: "Señal", description: "Ordena las solicitudes que llegan a tu equipo de ventas.", feature: "Gestión de prospectos" },
      { name: "Agenda", description: "Coordina las reuniones comerciales sin perder seguimientos.", feature: "Agenda comercial" },
      { name: "Embudo", description: "Identifica en qué etapa se detienen tus oportunidades.", feature: "Análisis de ventas" },
      { name: "Oferta", description: "Mantén actualizadas las versiones de cada propuesta comercial.", feature: "Gestión de propuestas" },
      { name: "Cartera", description: "Consulta las cuentas y oportunidades de cada ejecutivo.", feature: "Cartera de clientes" },
      { name: "Renueva", description: "Prepara la conversación antes de que venza un contrato.", feature: "Renovaciones comerciales" },
    ],
  },
  {
    id: "operacion", label: "Operación", action: "Poner orden al día a día", tone: "amber",
    products: [
      flouvia,
      { name: "Existencia", description: "Consulta qué tienes, dónde está y cuándo reponerlo.", feature: "Control de inventario" },
      { name: "Orden", description: "Sigue las compras de tu empresa desde la solicitud hasta la entrega.", feature: "Gestión de compras" },
      { name: "Mesa", description: "Organiza las solicitudes de ayuda y asigna quién las resuelve.", feature: "Atención al cliente" },
      { name: "Entrega", description: "Consulta el estado de cada pedido hasta su entrega.", feature: "Seguimiento de pedidos" },
      { name: "Proceso", description: "Documenta cómo se trabaja y qué necesita cada tarea.", feature: "Procesos internos" },
      { name: "Recurso", description: "Coordina equipos, espacios y recursos compartidos.", feature: "Asignación de recursos" },
      { name: "Proveedor", description: "Centraliza los datos y documentos de tus proveedores.", feature: "Gestión de proveedores" },
      { name: "Calidad", description: "Registra revisiones e incidencias para darles seguimiento.", feature: "Control de calidad" },
    ],
  },
  {
    id: "legal", label: "Legal", action: "Formalizar tus acuerdos", tone: "lavender",
    products: [
      { name: "Acuerdo", description: "Centraliza contratos y encuentra la versión que necesitas.", feature: "Gestión de contratos" },
      { name: "Trazo", description: "Sigue el recorrido de un documento hasta reunir sus firmas.", feature: "Flujos de firma" },
      { name: "Vigencia", description: "Ten presentes las fechas de renovación de tus acuerdos.", feature: "Control de vencimientos" },
      { name: "Archivo", description: "Organiza los documentos de cada asunto y de cada cliente.", feature: "Expedientes digitales" },
      { name: "Cláusula", description: "Reúne cláusulas y plantillas para preparar nuevos contratos.", feature: "Biblioteca de contratos" },
      { name: "Asunto", description: "Consulta responsables, documentos y avances de cada asunto.", feature: "Seguimiento legal" },
      { name: "Poder", description: "Mantén organizada la información de representantes y poderes.", feature: "Documentación corporativa" },
      { name: "Revisión", description: "Coordina comentarios y aprobaciones sobre cada documento.", feature: "Revisión de documentos" },
      { name: "Obligación", description: "Organiza compromisos y fechas clave de tus contratos.", feature: "Seguimiento de obligaciones" },
    ],
  },
  {
    id: "agencias", label: "Agencias", action: "Encontrar un equipo experto", tone: "blue",
    products: [
      flouvia,
      { name: "Estudio Norte", description: "Ejemplo de un estudio que diseña sitios y experiencias digitales para empresas.", feature: "Diseño y desarrollo web" },
      { name: "Trama", description: "Ejemplo de un equipo que conecta sistemas y automatiza procesos internos.", feature: "Automatización a medida" },
      { name: "Forma", description: "Ejemplo de un estudio que define la identidad y comunicación de una marca.", feature: "Identidad de marca" },
      { name: "Escala", description: "Ejemplo de una agencia que acompaña la operación y mejora de tiendas online.", feature: "E-commerce" },
      { name: "Mapa", description: "Ejemplo de un equipo que investiga cómo las personas usan un producto digital.", feature: "Investigación y diseño UX" },
      { name: "Contexto", description: "Ejemplo de una agencia que crea contenido para explicar productos y servicios.", feature: "Contenido B2B" },
      { name: "Taller", description: "Ejemplo de un equipo que desarrolla aplicaciones a la medida de una operación.", feature: "Desarrollo de aplicaciones" },
      { name: "Dato", description: "Ejemplo de una consultora que organiza datos y construye reportes de negocio.", feature: "Analítica de negocio" },
    ],
  },
];
