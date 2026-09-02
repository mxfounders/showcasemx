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
 privacidad:{title:'Política de privacidad',intro:'El marco normativo bajo el cual shwcs recopila, procesa, protege y audita la información en nuestra plataforma B2B.',sections:[
  ['Bases legales y tipología de datos', [
    'shwcs opera bajo los principios de minimización y transparencia. Procesamos datos bajo tres bases legales: consentimiento explícito, necesidad contractual (para proveer la plataforma) e interés legítimo (para garantizar la seguridad del sistema).',
    'Recopilamos datos de identidad y acceso mediante protocolos OAuth (como Google), limitándonos estrictamente al correo electrónico y un identificador único seguro. No almacenamos, procesamos ni tenemos visibilidad de credenciales externas ni de otros servicios vinculados a tu proveedor de identidad.',
    'A nivel operativo, recopilamos la información corporativa, descripciones y activos digitales que decides integrar a tu perfil, tus listas de guardados, y los metadatos de interacción con el sistema.'
  ]],
  ['Infraestructura y subprocesadores', [
    'Toda la información es procesada mediante infraestructuras de grado empresarial. Utilizamos bases de datos en la nube (ej. Neon) y proveedores de correos transaccionales que cumplen con estándares de encriptación en tránsito (TLS) y en reposo (AES-256).',
    'Al utilizar shwcs, reconoces que la información puede ser enrutada, procesada o almacenada en servidores distribuidos geográficamente por nuestros subprocesadores. Exigimos acuerdos de confidencialidad y medidas de seguridad estrictas a nuestra cadena de suministro tecnológico, pero shwcs no se hace responsable por eventos de fuerza mayor o vulneraciones originadas en la infraestructura subyacente.'
  ]],
  ['Privacidad transaccional y terceros', [
    'La arquitectura de shwcs separa estrictamente la información pública de la privada. Los borradores, el contenido en revisión, tus notas analíticas y tus listas (salvo que declares lo contrario) residen en silos de acceso exclusivo para tu cuenta.',
    'El componente de contacto es un conducto pasivo. Al iniciar una solicitud de conexión con un proyecto listado, otorgas tu consentimiento explícito, inequívoco e irrevocable para transmitir tu información de perfil, correo y el contexto del mensaje al destinatario.',
    'A partir del momento de la entrega, el tratamiento de dicha información queda sujeto a las políticas de privacidad, medidas de seguridad y prácticas del destinatario final. shwcs carece de autoridad técnica o legal para auditar, controlar o revocar el uso que el tercero dé a tu información.'
  ]],
  ['Auditoría y telemetría', [
    'Desplegamos instrumentación telemétrica para garantizar el rendimiento, prevenir abusos (ej. rate limiting) y generar métricas de visibilidad para los fundadores. Este procesamiento utiliza contadores técnicos efímeros y funciones hash irreversibles.',
    'Nuestra telemetría está diseñada bajo el principio de "Privacy by Design", rechazando la recolección pasiva mediante cookies de rastreo transversal (third-party tracking cookies) y omitiendo la construcción de perfiles individuales de consumo ocultos.'
  ]],
  ['Derechos de privacidad globales', [
    'Sin importar tu jurisdicción, shwcs te otorga control absoluto sobre tus datos (alineado con marcos como GDPR, CCPA y ARCO). Tienes derecho a acceder, rectificar, restringir el procesamiento o solicitar la eliminación total de tus registros operativos.',
    'La mayoría de estos derechos pueden ejercerse directamente desde el panel de control de tu cuenta (edición, revocación de visibilidad de listas, eliminación de solicitudes). Para la supresión técnica completa (Right to be Forgotten), las solicitudes se procesan vía nuestro canal de contacto y se ejecutan respetando los tiempos de latencia de nuestros respaldos cifrados.'
  ]],
  ['Ámbito estrictamente corporativo', [
    'shwcs es un directorio B2B (Business-to-Business) diseñado exclusivamente para profesionales y entidades comerciales. El servicio no está dirigido a consumidores ni a menores de 18 años, y procederemos a la eliminación inmediata de cualquier cuenta que incumpla este parámetro.'
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
 cookies:{title:'Cookies y medición',intro:'El acceso usa cookies necesarias para mantener y proteger tu sesión.',sections:[['Sesión','La cookie de acceso es HttpOnly, SameSite y Secure en producción. El flujo de Google utiliza una cookie temporal de seguridad que caduca en diez minutos.'],['Métricas agregadas','El contador de visitas y clics de fichas no crea una cookie analítica ni un identificador de visitante. Puede omitir eventos por bloqueadores, límites técnicos o preferencias DNT/GPC.'],['Servicios externos','Los sitios, demos y redes que abras tienen sus propias políticas. shwcs no controla sus cookies.']]}

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
