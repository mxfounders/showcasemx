import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArrowRightIcon, StarIcon } from '../src/components/icons/gota';
import { GOTA_ID, gotaKey, type GotaVariant } from '../src/components/icons/gota-base';

const generated = ['src', 'ops/src'].map(src => `${src}/components/icons/gota`);

test('a Gota icon draws like the set it replaced: 24 px, decorative unless labelled', () => {
  const html = renderToStaticMarkup(createElement(ArrowRightIcon, { className: 'size-4' }));
  assert.match(html, /^<svg [^>]*width="24" height="24" viewBox="0 0 24 24"/);
  assert.match(html, /class="size-4"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /stroke-width="1.5"/);
  const labelled = renderToStaticMarkup(createElement(ArrowRightIcon, { 'aria-label': 'Next' }));
  assert.doesNotMatch(labelled, /aria-hidden/);
});

test('each instance gives its masks ids of its own', () => {
  const html = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      createElement(StarIcon, { variant: 'fill' }),
      createElement(StarIcon, { variant: 'fill' }),
    ),
  );
  const ids = [...html.matchAll(/<mask id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, 2);
  assert.notEqual(ids[0], ids[1]);
  assert.ok(!html.includes(GOTA_ID));
  for (const id of ids) assert.ok(html.includes(`url(#${id})`));
  assert.match(html, /fill="currentColor"/);
  assert.doesNotMatch(renderToStaticMarkup(createElement(StarIcon)), /<mask/);
});

test('every generated drawing is found under the key its props give', () => {
  for (const dir of generated)
    for (const file of readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts')) {
      const code = readFileSync(`${dir}/${file}`, 'utf8');
      const keys = [...code.matchAll(/^ {2}"([^"]+)": "/gm)].map(m => m[1]);
      assert.ok(keys.includes('outline'), `${file}: outline`);
      for (const key of keys) {
        const [variant, ...rest] = key.split('/') as [GotaVariant['variant'], ...string[]];
        const props: GotaVariant = { variant, slash: rest.includes('slash') };
        for (const part of rest)
          if (part === 'circle' || part === 'square') props.enclosure = part;
          else if (part !== 'slash')
            props.weight = Number.isNaN(Number(part))
              ? (part as GotaVariant['weight'])
              : Number(part);
        assert.equal(gotaKey(props), key, `${dir}/${file}`);
      }
    }
});
