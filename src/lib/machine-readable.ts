import { getSolutionCategories, safeSolutionUrl, type SolutionData } from '@/lib/solutions/model';
import { siteOrigin } from '@/lib/seo';
import {
  categories,
  collections,
  companySizes,
  industries,
  localizedCapabilityLabel,
  localizedComplianceOptions,
  localizedIntegrationOptions,
  localizedLinkKind,
  localizedOfferingOptions,
  localizedPriceBandOptions,
  localizedPricingModelOptions,
  localizedSetupTimeOptions,
} from '@/lib/taxonomy';

/**
 * Plain-text views of shwcs for assistants and crawlers (/llms.txt and
 * /soluciones/<id>.md, SHCWS-106). Spanish, the catalog's source language. They
 * only ever see what a visitor sees: published_data without the private email,
 * and they say what the listing did not declare instead of filling it in.
 */

/** A published listing as the public page reads it: never the private contact email. */
export type PublicSolutionData = Omit<SolutionData, 'contactEmail'>;

type Option = { value: string; label: string };
const labelOf = (options: readonly Option[], value: string) =>
  options.find(option => option.value === value)?.label ?? value;
const day = (value: string | Date) => new Date(value).toISOString().slice(0, 10);
const text = (value?: string) => (value ?? '').replace(/\r\n/g, '\n').trim();

export function solutionMarkdownUrl(id: string) {
  return `${siteOrigin}/soluciones/${id}.md`;
}

export function solutionMarkdown({
  id,
  data,
  publishedAt,
  domainVerified,
  reviews,
  generatedAt,
}: {
  id: string;
  data: PublicSolutionData;
  publishedAt: string | null;
  domainVerified: boolean;
  /** Public reviews only (published, verified author, not the owner), as the catalog counts them. */
  reviews?: { count: number; rating: number | null };
  generatedAt: Date;
}) {
  const out: string[] = [];
  const missing: string[] = [];
  // Lines may be any falsy placeholder (`&&` chains, unsafe links): only non-blank text counts.
  type Line = string | false | 0 | null | undefined;
  const section = (title: string, lines: Line[], missingName?: string) => {
    const body = lines.filter(
      (line): line is string => typeof line === 'string' && line.trim() !== '',
    );
    if (body.length) out.push(`## ${title}`, '', ...body, '');
    else if (missingName) missing.push(missingName);
  };
  const list = (values: string[]) => values.map(value => `- ${value}`).join('\n');

  const kind = data.kind ? labelOf(localizedOfferingOptions('es'), data.kind) : '';
  const website = safeSolutionUrl(data.website);
  const demo = safeSolutionUrl(data.demoUrl ?? '');
  const evidenceUrl = safeSolutionUrl(data.evidenceUrl ?? '');

  out.push(`# ${text(data.name)}`, '');
  if (text(data.problem)) out.push(`> ${text(data.problem).replace(/\n+/g, ' ')}`, '');
  out.push(
    `- Ficha en shwcs: ${siteOrigin}/es/soluciones/${id}`,
    ...(website ? [`- Sitio oficial: ${website}`] : []),
    ...(demo ? [`- Demo: ${demo}`] : []),
    ...(kind ? [`- Tipo: ${kind}`] : []),
    `- Categorías: ${getSolutionCategories(data).join(', ')}`,
    `- Publicada en shwcs: ${publishedAt ? day(publishedAt) : 'fecha desconocida'}`,
    `- Dominio comprobado con registro TXT: ${domainVerified ? 'sí' : 'no'}`,
    reviews && reviews.count > 0 && reviews.rating != null
      ? `- Reseñas públicas: ${reviews.rating.toFixed(1)} de 5 en ${reviews.count} ${reviews.count === 1 ? 'reseña' : 'reseñas'}`
      : '- Reseñas públicas: ninguna todavía',
    `- Datos generados: ${day(generatedAt)}`,
    '',
  );

  section('Para quién', [text(data.audience)], 'cliente ideal');
  section('Cuándo no encaja', [text(data.notFor)], 'cuándo no encaja');
  section(
    'Qué puede hacer',
    [list((data.capabilities ?? []).map(id => localizedCapabilityLabel(id, 'es')))],
    'capacidades',
  );
  section(
    'Industrias',
    [
      data.industries === undefined
        ? ''
        : data.industries.length === 0
          ? 'Cualquier industria.'
          : list(data.industries.map(value => labelOf(industries, value))),
    ],
    'industrias',
  );
  section(
    'Tamaño de empresa',
    [
      data.companySizes === undefined
        ? ''
        : data.companySizes.length === 0
          ? 'Cualquier tamaño.'
          : list(data.companySizes.map(value => labelOf(companySizes, value))),
    ],
    'tamaño de empresa',
  );
  section('Alcance', [text(data.scope)], 'alcance');
  section(
    'Precio',
    [
      data.pricingModel?.length &&
        `- Modelo: ${data.pricingModel.map(value => labelOf(localizedPricingModelOptions('es'), value)).join(', ')}`,
      data.priceBand && `- Rango: ${labelOf(localizedPriceBandOptions('es'), data.priceBand)}`,
      text(data.pricing),
    ],
    'precio',
  );
  section(
    'Implementación',
    [
      data.setupTime &&
        `- Tiempo de arranque: ${labelOf(localizedSetupTimeOptions('es'), data.setupTime)}`,
      text(data.implementation),
    ],
    'implementación',
  );
  section(
    'Integraciones',
    [
      data.integrationKeys?.length &&
        list(data.integrationKeys.map(value => labelOf(localizedIntegrationOptions('es'), value))),
      data.integrationKeys?.length === 0 && 'Declara que no se conecta con otras herramientas.',
      text(data.integrations),
    ],
    'integraciones',
  );
  section('Soporte', [text(data.support)], 'soporte');
  section('Normativas declaradas por el proyecto', [
    data.compliance?.length &&
      list(data.compliance.map(value => labelOf(localizedComplianceOptions('es'), value))),
  ]);
  section(
    'Evidencia declarada',
    [text(data.evidence), evidenceUrl && `Fuente: ${evidenceUrl}`],
    'evidencia',
  );
  section('Creadores', [
    list(
      (data.founders ?? [])
        .filter(person => text(person.name))
        .map(person =>
          [
            `**${text(person.name)}**`,
            text(person.role),
            ...person.links.flatMap(link => {
              const url = safeSolutionUrl(link.url);
              return url ? [`${localizedLinkKind(link.label, 'es')}: ${url}`] : [];
            }),
          ]
            .filter(Boolean)
            .join(' · '),
        ),
    ),
  ]);
  section('Enlaces del proyecto', [
    list(
      (data.projectLinks ?? []).flatMap(link => {
        const url = safeSolutionUrl(link.url);
        return url ? [`${localizedLinkKind(link.label, 'es')}: ${url}`] : [];
      }),
    ),
  ]);
  if (missing.length) out.push('## Sin declarar', '', missing.join(', ') + '.', '');
  out.push(
    '---',
    '',
    `Información declarada por el proyecto y aprobada en la revisión editorial de shwcs. La revisión no certifica calidad, seguridad ni resultados. Criterios: ${siteOrigin}/es/criterios`,
    '',
  );
  return out.join('\n');
}

export function llmsText({
  solutions,
  generatedAt,
}: {
  solutions: { id: string; name: string; problem: string }[];
  generatedAt: Date;
}) {
  const link = (label: string, url: string, note?: string) =>
    `- [${label}](${url})${note ? `: ${note}` : ''}`;
  const short = (value: string) => {
    const clean = value.replace(/\s+/g, ' ').trim();
    return clean.length > 160 ? clean.slice(0, 157) + '…' : clean;
  };
  return [
    '# shwcs',
    '',
    '> Catálogo editorial de software, agencias y servicios B2B. Cada ficha la escribe el proyecto y una persona del equipo editorial de shwcs la revisa antes de publicarla. México es el primer mercado; el catálogo está abierto a cualquier país.',
    '',
    'Cómo leer la información:',
    '',
    '- Las fichas son datos declarados por cada proyecto. La revisión editorial mira claridad y coherencia; no certifica calidad, seguridad ni resultados.',
    '- Lo que un proyecto no declaró aparece como faltante. shwcs no lo inventa.',
    '- Un proyecto puede demostrar con un registro TXT que controla el dominio de su sitio.',
    '- Cada reseña indica qué se comprobó de quien la escribió: correo verificado, correo de empresa o compra comprobada (en México, con un CFDI vigente ante el SAT). El proyecto puede responder, no borrarlas.',
    '- El orden del catálogo refleja interacción de cuentas con correo verificado y pierde peso con el tiempo. No es un ranking de calidad ni una recomendación.',
    `- Generado: ${day(generatedAt)}. Versión en inglés de la interfaz: ${siteOrigin}/en`,
    '',
    '## Fichas publicadas',
    '',
    ...(solutions.length
      ? solutions.map(item => link(item.name, solutionMarkdownUrl(item.id), short(item.problem)))
      : ['Todavía no hay fichas publicadas.']),
    '',
    '## Categorías',
    '',
    ...categories.map(item =>
      link(item.title, `${siteOrigin}/es/explorar/${item.slug}`, item.description),
    ),
    '',
    '## Industrias',
    '',
    ...industries.map(item =>
      link(item.title, `${siteOrigin}/es/industria/${item.slug}`, item.description),
    ),
    '',
    '## Colecciones',
    '',
    ...collections.map(item =>
      link(item.title, `${siteOrigin}/es/colecciones/${item.slug}`, item.description),
    ),
    '',
    '## Sobre shwcs',
    '',
    link('Qué revisamos antes de publicar', `${siteOrigin}/es/criterios`),
    link('Proceso de publicación', `${siteOrigin}/es/proceso`),
    link('Preguntas frecuentes', `${siteOrigin}/es/faq`),
    link('El proyecto', `${siteOrigin}/es/el-proyecto`),
    '',
    '## Optional',
    '',
    link('Blog', `${siteOrigin}/es/blog`),
    link('Listas de la comunidad', `${siteOrigin}/es/comunidad`),
    '',
  ].join('\n');
}
