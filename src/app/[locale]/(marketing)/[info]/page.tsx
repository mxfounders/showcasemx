import { notFound } from 'next/navigation';
import { ChangelogStory } from '@/components/editorial/changelog-story';
import { ProjectStory } from '@/components/editorial/project-story';
import { FaqStory } from '@/components/editorial/faq-story';
import { LegalStory } from '@/components/editorial/legal-story';
import { ProcesoStory } from '@/components/editorial/proceso-story';
import { CriteriosStory } from '@/components/editorial/criterios-story';
import { AplicarStory } from '@/components/editorial/aplicar-story';

const pages:Record<string,{title:string;intro:string;sections:[string,string|string[]][]}>={
 aplicar:{title:'Postula tu proyecto',intro:'Descubre cómo aplicar a shwcs y presentar tu solución.',sections:[]},
 criterios:{title:'Qué revisamos',intro:'Buscamos proyectos que expliquen con claridad qué resuelven y para quién.',sections:[['Información suficiente','Nombre, categorías, problema, cliente ideal, sitio y contacto. Precio, alcance, límites y evidencia ayudan a evaluar el encaje.'],['Evidencia y transparencia','Los casos y resultados se presentan con sus fuentes. Una ficha publicada no equivale a una auditoría de seguridad, solvencia ni resultados. La verificación DNS solo acredita control del dominio en la fecha indicada.'],['Contenido responsable','No aceptamos suplantación, afirmaciones engañosas ni contenido ilícito. Puedes reportar una ficha desde su página. Una publicación puede retirarse tras revisión.']]},
 proceso:{title:'De idea a publicación',intro:'Tu ficha tiene seguimiento desde tu cuenta.',sections:[['1. Prepara tu ficha','Guarda un borrador y añade contexto, creadores, enlaces, capturas y una demo si tienes.'],['2. Envía a revisión','El equipo puede publicar, pedir cambios o rechazar con una explicación. Postular no garantiza publicación ni hay un plazo de respuesta prometido.'],['3. Mantén la información al día','Los cambios en un borrador no alteran la versión pública hasta aprobarse. Revisa tus avisos para consultar decisiones y solicitudes.']]},
 faq:{title:'Preguntas frecuentes',intro:'Lo esencial para descubrir y publicar proyectos.',sections:[['¿Quién puede usar una cuenta?','Una persona puede explorar soluciones y publicar sus proyectos. Comprador y fundador son vistas de trabajo; no permisos editoriales.'],['¿Mis guardados son públicos?','Tus guardados y notas son privados. Las listas solo se comparten si eliges publicarlas. Guardar un proyecto no avisa a su fundador ni crea una solicitud.'],['¿Cómo contacto a un proyecto?','Desde su ficha puedes enviar una solicitud con contexto y consentimiento. Las respuestas se consultan en la cuenta; los avisos por correo dependen de tu verificación, preferencias y disponibilidad del servicio.'],['¿shwcs recomienda contratar?','Publicar facilita evaluar y contactar, pero no garantiza resultados. Confirma condiciones directamente con el proyecto antes de contratar.']]},
 'el-proyecto':{title:'Proyectos que vale la pena conocer',intro:'shwcs conecta empresas con software, agencias y servicios que pueden ayudarles a resolver problemas concretos.',sections:[['Para quien busca','Descubre por necesidad, guarda opciones, compáralas y conversa con sus equipos.'],['Para quien construye','Presenta tu proyecto con contexto y evidencia. Mantén tu ficha clara y responde a quienes quieren conocerla.'],['Cómo presentamos la información','Distinguimos datos declarados, revisión editorial y control comprobado de dominio. El orden del catálogo es editorial; no es una puntuación de calidad.']]},
 blog:{title:'Ideas para elegir mejor',intro:'Notas de shwcs sobre software, servicios y las decisiones que ayudan a una empresa a avanzar.',sections:[['Próximamente','Estamos preparando la primera serie editorial. Publicaremos análisis claros, casos y preguntas útiles; no contenido hecho para llenar espacio.'],['Qué encontrarás','Guías para compradores, aprendizajes de fundadores y contexto para entender qué solución encaja con cada problema.']]},
 changelog:{title:'Lo que cambia en shwcs',intro:'Un registro claro de las mejoras que afectan cómo descubres, evalúas y presentas proyectos.',sections:[['Agosto de 2026','Abrimos guardados y listas, listas públicas de la comunidad, formularios guiados para fundadores, avisos dentro de la cuenta y métricas de fichas.'],['Siguiente actualización','Publicaremos aquí los cambios que ya estén disponibles. Las ideas y funciones en desarrollo seguirán fuera del registro hasta que sean reales.']]},
 privacidad:{title:'Política de privacidad',intro:'shwcs opera como directorio B2B y trata los datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y, en lo aplicable, al Reglamento General de Protección de Datos (GDPR). Responsable del tratamiento: shwcs, contacto hola@shwcs.site.',sections:[
  ['Bases legales y tipología de datos', [
    'shwcs opera bajo los principios de minimización y transparencia. Procesamos datos bajo tres bases legales: consentimiento explícito (registrado digitalmente con versión de la cláusula aceptada), necesidad contractual (para proveer la plataforma) e interés legítimo (para garantizar la seguridad y disponibilidad del sistema).',
    'Recopilamos datos de identidad y acceso mediante protocolos OAuth (como Google), limitándonos estrictamente al correo electrónico y un identificador único seguro. No almacenamos, procesamos ni tenemos visibilidad de credenciales externas ni de otros servicios vinculados a tu proveedor de identidad.',
    'A nivel operativo, recopilamos la información corporativa, descripciones y activos digitales que decides integrar a tu perfil, tus listas de guardados, y los metadatos de interacción con el sistema (rol declarado, sector, eventos de uso de funciones).'
  ]],
  ['Newsletter y comunicaciones por correo electrónico', [
    'Responsable del tratamiento: shwcs (hola@shwcs.site). Finalidad: enviar actualizaciones editoriales, novedades del catálogo y contenido relacionado con software y servicios para empresas en México. No empleamos el correo para publicidad de terceros ni para segmentación de perfiles comerciales.',
    'Base legal: consentimiento explícito. Al suscribirte mediante el formulario del sitio, otorgas un consentimiento libre, específico, informado e inequívoco cuya versión (newsletter-v2 o posterior) y fecha quedan registradas en nuestra base de datos. El consentimiento es revocable en todo momento sin consecuencias.',
    'Datos tratados: únicamente la dirección de correo electrónico y, si los proporcionas voluntariamente, tu nombre, rol (Fundador / Comprador) y sector de actividad. Estos datos no se utilizan para crear perfiles de comportamiento ni se combinan con fuentes externas.',
    'Conservación: los datos se conservan mientras la suscripción esté activa. Si te das de baja, la dirección de correo se marca como no suscrita (unsubscribed_at) y no se eliminan automáticamente del registro histórico de consentimientos por obligaciones de auditoría. Puedes solicitar la supresión completa enviando un correo a hola@shwcs.site.',
    'Subprocesador de envíos: los correos se despachan a través de Resend (resend.com), proveedor con sede en EE. UU. sujeto al marco de privacidad UE-EE. UU. (EU-US Data Privacy Framework). Resend actúa como encargado del tratamiento y recibe únicamente la dirección destinataria, el remitente y el contenido del mensaje; no tiene acceso a otros datos de tu cuenta.',
    'Cómo darte de baja: incluimos un enlace de cancelación al pie de cada correo. También puedes darte de baja en cualquier momento enviando un correo a hola@shwcs.site con el asunto «Baja newsletter». La baja se procesa en un plazo máximo de 48 horas hábiles.',
    'Cómo retirar el consentimiento: el retiro del consentimiento no afecta la licitud del tratamiento anterior. Para revocarlo formalmente, basta con darte de baja según el punto anterior o escribir a hola@shwcs.site.'
  ]],
  ['Infraestructura y subprocesadores', [
    'Toda la información es procesada mediante infraestructuras de grado empresarial. Utilizamos bases de datos en la nube (Neon, con alojamiento en AWS us-east-1) y el proveedor de correo transaccional Resend. Ambos subprocesadores cumplen con estándares de encriptación en tránsito (TLS 1.2+) y en reposo (AES-256).',
    'Al utilizar shwcs, reconoces que la información puede ser enrutada, procesada o almacenada en servidores distribuidos geográficamente por nuestros subprocesadores. Exigimos acuerdos de confidencialidad y medidas de seguridad estrictas a nuestra cadena de suministro tecnológico, pero shwcs no se hace responsable por eventos de fuerza mayor o vulneraciones originadas en la infraestructura subyacente.'
  ]],
  ['Privacidad transaccional y terceros', [
    'La arquitectura de shwcs separa estrictamente la información pública de la privada. Los borradores, el contenido en revisión, tus notas analíticas y tus listas (salvo que declares lo contrario) residen en silos de acceso exclusivo para tu cuenta.',
    'El componente de contacto es un conducto pasivo. Al iniciar una solicitud de conexión con un proyecto listado, otorgas tu consentimiento explícito para transmitir tu información de perfil, correo y el contexto del mensaje al destinatario. A partir de la entrega, el tratamiento queda sujeto a las políticas del destinatario. shwcs carece de autoridad para auditar o revocar ese uso posterior.'
  ]],
  ['Tus derechos ARCO y globales', [
    'Puedes ejercer en todo momento los derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) conforme a la LFPDPPP, así como los derechos ampliados del GDPR (portabilidad, limitación del tratamiento, derecho al olvido). Escríbenos a hola@shwcs.site indicando el derecho que deseas ejercer y, si es posible, el correo asociado a tu cuenta.',
    'Plazo de respuesta: 20 días hábiles para confirmar la recepción y resolver tu solicitud (prorrogable 20 días hábiles adicionales cuando la complejidad lo justifique). Algunos derechos pueden ejercerse directamente desde el panel de tu cuenta (edición de perfil, supresión de listas, eliminación de solicitudes). Para la supresión técnica completa, la solicitud por correo garantiza el borrado en todos los subsistemas incluyendo respaldos cifrados en sus ciclos de rotación.',
    'Si resides en la Unión Europea y consideras que el tratamiento vulnera el GDPR, tienes derecho a presentar una reclamación ante la autoridad de control de tu Estado miembro. En México, puedes acudir al Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI).',
    'shwcs es un directorio B2B diseñado exclusivamente para profesionales y entidades comerciales. El servicio no está dirigido a consumidores finales ni a menores de 18 años. Procederemos a la eliminación inmediata de cualquier cuenta o suscripción que incumpla este parámetro.'
  ]],
  ['Auditoría, telemetría y cambios a esta política', [
    'Desplegamos instrumentación telemétrica para garantizar el rendimiento, prevenir abusos (rate limiting) y generar métricas de visibilidad para los fundadores. Este procesamiento utiliza contadores efímeros y funciones hash irreversibles. No construimos perfiles individuales ni empleamos cookies de rastreo transversal.',
    'Esta política puede actualizarse. Cuando los cambios sean materiales, lo comunicaremos con al menos 15 días de anticipación a los suscriptores activos del newsletter. La versión vigente siempre estará disponible en shwcs.site/privacidad con la fecha de última actualización. Última revisión: septiembre de 2026.'
  ]]
 ]},
 terminos:{title:'Términos de servicio',intro:'Condiciones vinculantes y marco de responsabilidad aplicable a todas las interacciones, cuentas y contratos relacionados con la plataforma shwcs.',sections:[
  ['Naturaleza del servicio y jurisdicción', [
    'shwcs funciona única y exclusivamente como un directorio informativo y conducto de descubrimiento de soluciones tecnológicas. No somos proveedores, distribuidores, brokers, consultores ni agentes de ninguna de las entidades que figuran en el catálogo.',
    'Cualquier uso de la plataforma constituye una aceptación total de estas condiciones. Los usuarios que representen a una empresa garantizan poseer la autoridad legal para vincular a dicha entidad a estos términos.'
  ]],
  ['Limitación exhaustiva de garantías', [
    'Nuestra plataforma se provee "tal cual" (AS-IS) y "según disponibilidad" (AS-AVAILABLE). shwcs renuncia expresamente a cualquier garantía, ya sea explícita o implícita, incluyendo pero sin limitarse a garantías de comerciabilidad, adecuación para un propósito particular, calidad o no infracción.',
    'No garantizamos tiempos de disponibilidad del servidor (uptime), la preservación intacta de la información no guardada, ni que el servicio esté libre de errores, interrupciones o ataques cibernéticos.'
  ]],
  ['Exención de responsabilidad máxima', [
    'Bajo ninguna circunstancia, ni bajo ninguna teoría legal (agravio, contrato, negligencia o responsabilidad estricta), shwcs, sus directivos, empleados o afiliados serán responsables de daños indirectos, incidentales, punitivos, lucro cesante, pérdida de datos, o interrupción de negocios que resulten del uso o la incapacidad de usar la plataforma.',
    'Toda evaluación, auditoría técnica, revisión de solvencia y negociación de acuerdos (SLA, NDA, contratos de servicio) es responsabilidad exclusiva y absoluta entre el comprador y el proveedor. shwcs queda totalmente liberado de cualquier disputa resultante de dichas interacciones.'
  ]],
  ['Propiedad intelectual y restricciones absolutas', [
    'El código fuente, algoritmos, arquitectura de datos, logotipos, diseño de interfaz (UI/UX) y la compilación de la base de datos de shwcs están protegidos por leyes internacionales de propiedad intelectual.',
    'Queda terminantemente prohibida cualquier forma de ingeniería inversa, extracción sistemática de datos (scraping, crawling, spidering), minería de bases de datos, reventa del servicio o la creación de trabajos derivados sin autorización explícita por escrito.'
  ]],
  ['Contenido, licencias y moderación', [
    'Al someter activos, textos, logotipos y descripciones a shwcs, el usuario retiene la titularidad de su propiedad intelectual, pero otorga a shwcs una licencia global, perpetua, libre de regalías y transferible para alojar, ejecutar, modificar (para fines técnicos de visualización) y distribuir dicho contenido en la plataforma.',
    'El usuario asume responsabilidad legal total por la originalidad y los derechos de dicho contenido.',
    'shwcs ejerce una potestad de moderación unilateral. Nos reservamos el derecho inapelable de suspender cuentas, rechazar postulaciones, degradar visibilidad o eliminar fichas de forma inmediata y sin necesidad de justificación si determinamos riesgo legal, suplantación, baja calidad o violación de la filosofía del servicio.'
  ]],
  ['Indemnidad (Hold Harmless)', [
    'El usuario acuerda indemnizar, defender y mantener indemne a shwcs y sus afiliados de y contra cualquier reclamación, daño, obligación, pérdida, responsabilidad, costo o deuda, y gasto (incluyendo honorarios legales) que surja de: (a) su uso y acceso a la plataforma; (b) su violación de cualquier término aquí establecido; o (c) cualquier reclamo derivado de su contenido o sus interacciones con terceros a través de nuestro conducto.'
  ]],
  ['Fuerza mayor y modificaciones', [
    'shwcs no será responsable de ningún retraso o fallo en el rendimiento resultante directa o indirectamente de causas que escapan a nuestro control razonable (huelgas, fallas de internet, catástrofes naturales, actos gubernamentales).',
    'Nos reservamos el derecho exclusivo de alterar, actualizar o modificar estos términos en cualquier instante. La continuación en el uso de los servicios después de cualquier revisión constituye un consentimiento vinculante a las nuevas normativas.'
  ]]
 ]},
 cookies:{title:'Cookies y medición',intro:'shwcs usa exclusivamente cookies técnicas necesarias para el funcionamiento seguro de la sesión. No empleamos cookies analíticas de terceros ni rastreo publicitario.',sections:[
  ['Cookies de sesión', 'La cookie de acceso es HttpOnly, SameSite=Lax y Secure en producción. No puede ser leída por JavaScript del cliente ni compartida entre sitios. El flujo de autenticación con Google utiliza una cookie temporal de seguridad (state) que caduca en diez minutos y se elimina automáticamente al completar el flujo.'],
  ['Métricas agregadas sin identificación', 'El contador de visitas y clics de fichas funciona mediante hashes irreversibles del lado del servidor. No crea cookies analíticas, no genera un identificador de visitante permanente y no construye un perfil de comportamiento. Los contadores respetan señales DNT y GPC. Pueden omitir eventos por bloqueadores de contenido o limitaciones técnicas.'],
  ['Servicios externos', 'Los sitios, demos y redes sociales que abras desde shwcs tienen sus propias políticas de cookies y son responsables de su tratamiento. shwcs no controla, comparte datos con, ni es responsable de las cookies de esos terceros.'],
  ['Sin cookies de publicidad ni retargeting', 'shwcs no usa ni planea usar cookies publicitarias, píxeles de seguimiento (Facebook Pixel, Google Ads, etc.) ni cualquier tecnología de retargeting. No vendemos datos de visitantes a redes publicitarias.']
 ]}



};
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({params}:{params:Promise<{info:string}>}){const {info}=await params;return {title:pages[info]?`${pages[info].title} | shwcs`:'shwcs',robots:['privacidad','terminos'].includes(info)?{index:false,follow:true}:undefined};}

export default async function InfoPage({params}:{params:Promise<{info:string, locale:string}>}) {
  const {info, locale} = await params;
  const page = pages[info];
  if(!page) notFound();
  
  const dict = await getDictionary(locale as Locale);

  if(info==='el-proyecto') return <ProjectStory dict={dict.elProyecto} />;
  if(info==='changelog') return <ChangelogStory dict={dict.changelog} />;
  if(info==='faq') return <FaqStory />;
  if(info==='proceso') return <ProcesoStory />;
  if(info==='criterios') return <CriteriosStory />;
  if(info==='aplicar') return <AplicarStory />;
  
  return <LegalStory page={page} />;
}
