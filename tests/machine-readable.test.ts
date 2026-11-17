import assert from 'node:assert/strict';
import test from 'node:test';
import { llmsText, solutionMarkdown, type PublicSolutionData } from '../src/lib/machine-readable';

const id = '3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f';
const data: PublicSolutionData = {
  name: 'Cord',
  kind: 'Software',
  category: 'Ventas',
  categories: ['Ventas', 'Cobros'],
  problem: 'Cotiza, factura y cobra\nsin perseguir a nadie.',
  audience: 'Pymes que venden por cotización.',
  website: 'https://cordhq.app/',
  industries: [],
  capabilities: ['cotizaciones-propuestas'],
  priceBand: 'menos-1000',
  founders: [
    {
      name: 'Ana',
      role: 'CEO',
      bio: '',
      links: [{ label: 'LinkedIn', url: 'javascript:alert(1)' }],
    },
  ],
};

test('a listing in Markdown carries its declared data, dates and what it left out', () => {
  const markdown = solutionMarkdown({
    id,
    // The route never selects it, but even if a caller passed it, it must not appear.
    data: { ...data, contactEmail: 'privado@cord.test' } as PublicSolutionData,
    publishedAt: '2026-09-03 10:00:00+00',
    domainVerified: true,
    reviews: { count: 2, rating: 4.5 },
    generatedAt: new Date('2026-11-14T12:00:00Z'),
  });
  assert.ok(markdown.startsWith('# Cord\n'));
  assert.match(markdown, /> Cotiza, factura y cobra sin perseguir a nadie\./);
  assert.match(markdown, /Ficha en shwcs: https:\/\/shwcs\.site\/es\/soluciones\//);
  assert.match(markdown, /Categorías: Ventas, Cobros/);
  assert.match(markdown, /Publicada en shwcs: 2026-09-03/);
  assert.match(markdown, /Datos generados: 2026-11-14/);
  assert.match(markdown, /Dominio comprobado con registro TXT: sí/);
  assert.match(markdown, /4\.5 de 5 en 2 reseñas/);
  assert.match(markdown, /Cualquier industria\./);
  const missing = markdown.split('## Sin declarar\n\n')[1]?.split('\n')[0] ?? '';
  for (const name of ['tamaño de empresa', 'implementación', 'soporte', 'evidencia'])
    assert.ok(missing.includes(name), `${name} should be listed as missing`);
  for (const name of ['cliente ideal', 'industrias', 'capacidades', 'precio'])
    assert.ok(!missing.includes(name), `${name} was declared`);
  assert.ok(!markdown.includes('privado@cord.test'), 'private email leaked');
  assert.ok(!markdown.includes('javascript:'), 'unsafe link leaked');
  assert.match(markdown, /no certifica calidad, seguridad ni resultados/);
});

test('llms.txt explains how to read shwcs and links every published listing as Markdown', () => {
  const text = llmsText({
    solutions: [{ id, name: 'Cord', problem: 'Cotiza y cobra.' }],
    generatedAt: new Date('2026-11-14T12:00:00Z'),
  });
  assert.ok(text.startsWith('# shwcs\n\n> '));
  assert.ok(text.includes(`[Cord](https://shwcs.site/soluciones/${id}.md): Cotiza y cobra.`));
  assert.match(text, /\[.+\]\(https:\/\/shwcs\.site\/es\/explorar\/cobros\)/);
  assert.match(text, /no certifica calidad/);
  assert.match(
    llmsText({ solutions: [], generatedAt: new Date() }),
    /Todavía no hay fichas publicadas\./,
  );
});
