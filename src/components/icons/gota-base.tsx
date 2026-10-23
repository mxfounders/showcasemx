import { createElement, useId, type ReactElement, type SVGProps } from 'react';

/**
 * Gota, Flouvia's icon set, as React components. `npm run gota:sync` draws every icon the app
 * imports from './gota' with Gota's own engine, in each style the code asks for, and writes one
 * module per icon to ./gota/; this file only puts a drawing in an <svg>. No engine ships to the
 * browser, and each page loads only its own icons.
 *
 * The props are Gota's (`variant`, `weight`, `enclosure`, `slash`), so moving to
 * `@flouvia/gota/react/icons` at its v1 only changes the import path. Each icon accepts the ones
 * the code uses with it: writing a new one (say `weight="bold"`) fails the typecheck until
 * `npm run gota:sync` draws it. It works in Server and Client Components (it only uses `useId`)
 * and draws at 24 px by default, like the set it replaced; a `size-*` class or `size` sets the
 * box. The stroke lives inside the drawing, so `strokeWidth`, `stroke` and `fill` are not props.
 */
export type GotaIconProps<Variants = unknown> = Omit<
  SVGProps<SVGSVGElement>,
  'ref' | 'children' | 'dangerouslySetInnerHTML' | 'fill' | 'stroke' | 'strokeWidth'
> & { size?: number | string } & Variants;

/** Any Gota icon, for props and lists that hold one (`icon: GotaIcon`). */
export type GotaIcon = (props: GotaIconProps) => ReactElement;

export type GotaVariant = {
  variant?: 'outline' | 'fill';
  weight?: 'light' | 'regular' | 'bold' | number;
  enclosure?: 'circle' | 'square' | null;
  slash?: boolean;
};

/** Where a drawing's masks take this instance's id (badges, cut-outs of the fill). */
export const GOTA_ID = '__gota__';

/** The key of a drawing: its style, then whatever differs from regular, plain and unslashed. */
export function gotaKey({
  variant = 'outline',
  weight = 'regular',
  enclosure,
  slash,
}: GotaVariant) {
  return [variant, weight !== 'regular' && weight, enclosure, slash && 'slash']
    .filter(Boolean)
    .join('/');
}

export function GotaSvg({
  drawings,
  variant,
  weight,
  enclosure,
  slash,
  size = 24,
  ...props
}: GotaIconProps<GotaVariant> & { drawings: Record<string, string> }) {
  const id = `gota${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const key = gotaKey({ variant, weight, enclosure, slash });
  let html = drawings[key];
  if (html === undefined) {
    if (process.env.NODE_ENV !== 'production')
      console.error(`Gota: no "${key}" drawing for this icon; run npm run gota:sync.`);
    html = drawings.outline;
  }
  return createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': props['aria-label'] || props['aria-labelledby'] ? undefined : true,
    ...props,
    dangerouslySetInnerHTML: {
      __html: html.includes(GOTA_ID) ? html.replaceAll(GOTA_ID, id) : html,
    },
  });
}
