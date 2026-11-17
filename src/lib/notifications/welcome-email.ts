import { escapeHtml } from './email-template';

/**
 * The one welcome email an account gets when it finishes onboarding (SHCWS-153), by the
 * profile it chose. Information about the new account only: it never subscribes anyone
 * to the newsletter, it just says where to do it. Spanish until accounts store a language
 * (SHCWS-25). `categories` are catalog pages that have published listings right now, so
 * the email never points at an empty page (the lesson of SHCWS-40).
 */
export function welcomeEmail({
  profile,
  origin,
  categories,
}: {
  profile: string | null;
  origin: string;
  categories: { title: string; slug: string }[];
}) {
  const link = (path: string, label: string) =>
    `<a href="${escapeHtml(`${origin}/es${path}`)}" style="color:#365DC4;">${escapeHtml(label)}</a>`;
  if (profile === 'founder' || profile === 'both')
    return {
      subject: 'Publica tu proyecto en shwcs en unos minutos',
      heading: 'Publica tu proyecto en unos minutos',
      paragraphs: [
        'Ya tienes cuenta en shwcs. El siguiente paso es tu ficha: unas preguntas cortas sobre qué resuelves, para quién y cómo contactarte. La revisamos antes de publicarla.',
        'Lo que ganas: solicitudes de contacto con el contexto del comprador (te avisamos por correo), reseñas con su nivel de verificación y un orden que no se compra: nadie paga por aparecer más arriba.',
      ],
      button: { label: 'Crear mi ficha', href: `${origin}/es/account/solutions/new` },
    };
  if (profile === 'buyer')
    return {
      subject: 'Cuéntanos qué necesitas resolver',
      heading: 'Encuentra lo que necesitas resolver',
      paragraphs: [
        categories.length
          ? `Empieza por un problema: ${categories
              .slice(0, 3)
              .map(category => link(`/explorar/${category.slug}`, category.title))
              .join(' · ')}.`
          : 'Busca por lo que necesitas resolver: cada ficha explica qué hace, para quién y qué no declaró.',
        `Guarda opciones, compáralas en tus listas y contacta con contexto. Si no encuentras algo, ${link('/contacto?motivo=find', 'cuéntanos qué buscas')}.`,
      ],
      button: { label: 'Buscar en el catálogo', href: `${origin}/es#catalogo` },
    };
  return {
    subject: 'Lo que puedes hacer en shwcs',
    heading: 'Bienvenido a shwcs',
    paragraphs: [
      'shwcs reúne software, agencias y servicios para empresas, con fichas que responden las mismas preguntas y reseñas con su nivel de verificación.',
      `Si quieres enterarte de lo nuevo, ${link('/newsletter', 'suscríbete al newsletter')}; crear tu cuenta no te suscribe.`,
    ],
    button: { label: 'Explorar el catálogo', href: `${origin}/es#catalogo` },
  };
}
