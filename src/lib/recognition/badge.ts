import { badgeWordmark, isotype, wordmarkOnDark, wordmarkOnLight } from './badge-assets';

/**
 * The badges (GET /api/badge/[id]) in two layouts:
 *
 * - `card`: horizontal, 56px tall, for a founder's footer or press page (the size people
 *   expect from «Featured on» badges).
 * - `seal`: a 132×156 shield, the version shown on the listing itself and for pages that
 *   want a single strong mark.
 *
 * Everything is inside the file — the wordmark and isotype as embedded PNGs, text in the
 * system font, gradients defined locally — so it works in an <img> on any site and the
 * visitor's browser never loads anything else. Each SVG is its own document, so the
 * gradient ids cannot collide with the host page.
 */
export type BadgeVariant = 'featured' | 'verified' | 'award';
export type BadgeTheme = 'light' | 'dark';
export type BadgeLayout = 'card' | 'seal';
export type BadgeTone = 'featured' | 'verified' | 'gold' | 'silver' | 'bronze' | 'editorial';

const font = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/** Metal and ink: gradient top → bottom, the emblem's own color and the text on it. */
const tones: Record<BadgeTone, { from: string; to: string; ring: string; ink: string }> = {
  featured: { from: '#FFFFFF', to: '#EFEDEA', ring: '#365DC4', ink: '#1C1917' },
  verified: { from: '#5279DD', to: '#2443A0', ring: '#DCE6FF', ink: '#FFFFFF' },
  gold: { from: '#E9C46A', to: '#A47321', ring: '#FFF4D6', ink: '#FFFFFF' },
  silver: { from: '#C9D0D8', to: '#6D7783', ring: '#F4F6F8', ink: '#FFFFFF' },
  bronze: { from: '#DA9C6F', to: '#8E5233', ring: '#FBE7D8', ink: '#FFFFFF' },
  editorial: { from: '#36302B', to: '#0F0D0C', ring: '#E9C46A', ink: '#FFFFFF' },
};
export const toneForRank = (rank: number | null | undefined): BadgeTone =>
  rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'gold';

const surfaces = {
  light: { from: '#FFFFFF', to: '#FAFAF9', border: '#E2E0DD', muted: '#78716C', rule: '#E7E5E4' },
  dark: { from: '#1F1C1A', to: '#121010', border: '#3A3532', muted: '#A8A29E', rule: '#3A3532' },
};

export function escapeXml(value: string) {
  return value.replace(
    /[<>&'"]/g,
    char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!,
  );
}

/** Rough width of uppercase text in the system font, with its tracking. */
const textWidth = (text: string, size: number, tracking: number) =>
  Math.ceil(text.length * (size * 0.66 + tracking));

/** A <text>, squeezed with textLength only when it would not fit. */
function text(
  value: string,
  attrs: { x: number; y: number; size: number; weight: number; tracking: number; fill: string },
  options: { anchor?: 'middle'; max?: number; opacity?: number } = {},
) {
  const width = textWidth(value, attrs.size, attrs.tracking);
  const squeeze =
    options.max && width > options.max
      ? ` textLength="${options.max}" lengthAdjust="spacingAndGlyphs"`
      : '';
  return `<text x="${attrs.x}" y="${attrs.y}"${options.anchor ? ` text-anchor="${options.anchor}"` : ''} font-family="${font}" font-size="${attrs.size}" font-weight="${attrs.weight}" letter-spacing="${attrs.tracking}" fill="${attrs.fill}"${options.opacity ? ` fill-opacity="${options.opacity}"` : ''}${squeeze}>${escapeXml(value)}</text>`;
}

/** A scalloped rosette: the classic seal outline, drawn as a smoothed star polygon. */
function rosette(cx: number, cy: number, radius: number, fill: string, points = 18) {
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 ? radius * 0.9 : radius;
    coords.push(
      `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return `<polygon points="${coords.join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="${(radius * 0.14).toFixed(2)}" stroke-linejoin="round"/>`;
}

/**
 * A laurel wreath around a center: two branches rising from the bottom and opening at the
 * top, each a thin stem with leaves that shrink towards the tip. The mark of an award.
 */
function laurel(cx: number, cy: number, radius: number, fill: string, opacity = 0.9) {
  const parts: string[] = [];
  const count = 7;
  for (const side of [-1, 1]) {
    // SVG angles (y down): 90° is the bottom. Left runs 112°→238°, right mirrors it.
    const from = side < 0 ? 112 : 68,
      to = side < 0 ? 238 : -58;
    const point = (degrees: number, r = radius) => {
      const a = (degrees * Math.PI) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };
    const [sx, sy] = point(from),
      [ex, ey] = point(to);
    parts.push(
      `<path d="M${sx.toFixed(2)} ${sy.toFixed(2)}A${radius} ${radius} 0 0 ${side < 0 ? 1 : 0} ${ex.toFixed(2)} ${ey.toFixed(2)}" fill="none" stroke="${fill}" stroke-opacity="${opacity}" stroke-width="${(radius * 0.045).toFixed(2)}" stroke-linecap="round"/>`,
    );
    for (let k = 0; k < count; k++) {
      const t = k / (count - 1);
      const degrees = from + (to - from) * t;
      // Alternate just outside and inside the stem, like a real branch.
      const [x, y] = point(degrees, radius * (k % 2 ? 0.95 : 1.06));
      const tilt = side < 0 ? degrees + 90 - 28 : degrees - 90 + 28;
      const scale = 1 - t * 0.38;
      parts.push(
        `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${(radius * 0.21 * scale).toFixed(2)}" ry="${(radius * 0.085 * scale).toFixed(2)}" transform="rotate(${tilt.toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})" fill="${fill}" fill-opacity="${opacity}"/>`,
      );
    }
  }
  return parts.join('');
}

const check = (cx: number, cy: number, size: number, color: string, width: number) =>
  `<path d="M${cx - size * 0.42} ${cy + size * 0.02}l${size * 0.29} ${size * 0.28}L${cx + size * 0.44} ${cy - size * 0.3}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

function star(cx: number, cy: number, r: number, color: string) {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * i) / 5 - Math.PI / 2;
    const radius = i % 2 ? r * 0.45 : r;
    points.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return `<polygon points="${points.join(' ')}" fill="${color}" stroke="${color}" stroke-width="${(r * 0.12).toFixed(2)}" stroke-linejoin="round"/>`;
}

function defs(tone: BadgeTone) {
  const t = tones[tone];
  return `<defs><linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.from}"/><stop offset="1" stop-color="${t.to}"/></linearGradient><linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
}

/** The emblem of a badge, centered on (cx, cy) at a given size: the part people remember. */
function emblem(
  variant: BadgeVariant,
  tone: BadgeTone,
  rank: number | null | undefined,
  cx: number,
  cy: number,
  size: number,
) {
  const t = tones[tone];
  const r = size / 2;
  if (variant === 'featured')
    return `<image href="${isotype}" x="${cx - r}" y="${cy - r}" width="${size}" height="${size}"/>`;
  if (variant === 'verified')
    return `${rosette(cx, cy, r * 0.94, 'url(#metal)')}<circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="${size * 0.03}"/>${check(cx, cy, r * 0.95, '#fff', size * 0.09)}`;
  // Awards: a medal with its ribbons; the weekly one carries the place, the pick a star.
  const ribbon = `<path d="M${cx - r * 0.55} ${cy + r * 0.45}l-${r * 0.25} ${r * 0.62}l${r * 0.27} -${r * 0.08}l${r * 0.17} ${r * 0.2}l${r * 0.2} -${r * 0.62}zM${cx + r * 0.55} ${cy + r * 0.45}l${r * 0.25} ${r * 0.62}l-${r * 0.27} -${r * 0.08}l-${r * 0.17} ${r * 0.2}l-${r * 0.2} -${r * 0.62}z" fill="${t.to}"/>`;
  const center = rank
    ? `<text x="${cx}" y="${(cy + r * 0.19).toFixed(1)}" text-anchor="middle" font-family="${font}" font-size="${(r * 0.78).toFixed(1)}" font-weight="800" letter-spacing="-0.5" fill="#fff">#${rank}</text>`
    : star(cx, cy - r * 0.08, r * 0.38, tone === 'editorial' ? t.ring : '#fff');
  return `${ribbon}<circle cx="${cx}" cy="${cy - r * 0.08}" r="${r * 0.78}" fill="url(#metal)"/><circle cx="${cx}" cy="${cy - r * 0.08}" r="${r * 0.66}" fill="none" stroke="${t.ring}" stroke-opacity="0.75" stroke-width="${size * 0.025}"/>${center}`;
}

export type BadgeInput = {
  layout?: BadgeLayout;
  variant: BadgeVariant;
  tone: BadgeTone;
  theme: BadgeTheme;
  /** Card: the line above the wordmark. «Publicado en», «#1 de la semana en Ventas»… */
  label: string;
  /** Seal: the two lines under the emblem («De la semana» / «Ventas»). */
  seal: { line1: string; line2?: string };
  /** Awards and verification: when. */
  date?: string;
  rank?: number | null;
  /** Accessible name of the image. */
  title: string;
};

export const sealSize = { width: 132, height: 156 } as const;

/** Rendered width of the card, so the snippet can declare it and the page does not jump. */
export function badgeWidth(label: string, date?: string) {
  const line1 = textWidth(label.toUpperCase(), 8.5, 1.1);
  const line2 = badgeWordmark.width + 2 + (date ? 21 + textWidth(date.toUpperCase(), 9, 0.6) : 0);
  return Math.ceil(Math.max(208, 60 + Math.max(line1, line2) + 18));
}

export function badgeSvg(input: BadgeInput) {
  return input.layout === 'seal' ? sealSvg(input) : cardSvg(input);
}

function cardSvg({ variant, tone, theme, label, date, rank, title }: BadgeInput) {
  const s = surfaces[theme];
  const width = badgeWidth(label, date);
  const wordmark = theme === 'dark' ? wordmarkOnDark : wordmarkOnLight;
  const dateX = 60 + badgeWordmark.width * 0.95 + 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="56" viewBox="0 0 ${width} 56" role="img" aria-label="${escapeXml(title)}"><title>${escapeXml(title)}</title>${defs(tone)}<linearGradient id="surface" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.from}"/><stop offset="1" stop-color="${s.to}"/></linearGradient><rect x="0.5" y="0.5" width="${width - 1}" height="55" rx="12" fill="url(#surface)" stroke="${s.border}"/>${emblem(variant, tone, rank, 31, 28, 36)}${text(label.toUpperCase(), { x: 60, y: 23, size: 8.5, weight: 650, tracking: 1.1, fill: s.muted })}<image href="${wordmark}" x="60" y="28.5" width="${(badgeWordmark.width * 0.95).toFixed(1)}" height="${(badgeWordmark.height * 0.95).toFixed(1)}"/>${
    date
      ? `<rect x="${dateX - 6}" y="32" width="1" height="11" fill="${s.rule}"/>${text(date.toUpperCase(), { x: dateX + 3, y: 41.5, size: 9, weight: 600, tracking: 0.6, fill: s.muted })}`
      : ''
  }</svg>`;
}

/** Outline of the seal: a shield with rounded shoulders and a pointed foot. */
const shield =
  'M14 1H118Q131 1 131 14V117Q131 123.5 125.5 126.5L70.5 153.2Q66 155.4 61.5 153.2L6.5 126.5Q1 123.5 1 117V14Q1 1 14 1Z';
const shieldInset =
  'M16 6H116Q126 6 126 16V115.4Q126 120 122 122.2L69.6 147.6Q66 149.3 62.4 147.6L10 122.2Q6 120 6 115.4V16Q6 6 16 6Z';

/**
 * Vertical rhythm of the seal. Every line of text sits above y≈121, where the inset border
 * is still full width: below it the shield narrows to its point and text would touch the
 * border. The point itself only carries a small diamond.
 */
const sealLayout = {
  mark: 14,
  rule: 36,
  medal: 61,
  line1: 97,
  line2: 108.5,
  date: 119.5,
  tip: 134,
};

function sealSvg({ variant, tone, theme, seal, date, rank, title }: BadgeInput) {
  const t = tones[tone];
  const y = sealLayout;
  const light = tone === 'featured';
  const ink = light ? '#1C1917' : t.ink;
  const wordmark = light ? wordmarkOnLight : wordmarkOnDark;
  const w = badgeWordmark.width * 0.82,
    h = badgeWordmark.height * 0.82;
  const center = 66;
  const medal =
    variant === 'award'
      ? `${laurel(center, y.medal, 22, light ? t.ring : '#fff', 0.85)}${
          rank
            ? text(
                `#${rank}`,
                {
                  x: center,
                  y: y.medal + 7.5,
                  size: 21,
                  weight: 800,
                  tracking: -0.6,
                  fill: '#fff',
                },
                { anchor: 'middle' },
              )
            : star(center, y.medal - 0.5, 11, tone === 'editorial' ? t.ring : '#fff')
        }`
      : variant === 'verified'
        ? `${rosette(center, y.medal, 20, '#fff', 18).replace('fill="#fff"', 'fill="#fff" fill-opacity="0.16"').replace('stroke="#fff"', 'stroke="#fff" stroke-opacity="0.16"')}<circle cx="${center}" cy="${y.medal}" r="14" fill="#fff"/>${check(center, y.medal, 13.5, t.to, 3.2)}`
        : `<image href="${isotype}" x="${center - 17}" y="${y.medal - 17}" width="34" height="34"/>`;
  const line = (
    value: string,
    at: number,
    style: { size: number; weight: number; tracking: number },
    opacity?: number,
  ) =>
    text(
      value.toUpperCase(),
      { x: center, y: at, ...style, fill: ink },
      { anchor: 'middle', max: 104, opacity },
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sealSize.width}" height="${sealSize.height}" viewBox="0 0 132 156" role="img" aria-label="${escapeXml(title)}"><title>${escapeXml(title)}</title>${defs(tone)}<path d="${shield}" fill="url(#metal)"${light ? ` stroke="${theme === 'dark' ? '#3A3532' : '#E2E0DD'}"` : ''}/><path d="${shield}" fill="url(#sheen)"/><path d="${shieldInset}" fill="none" stroke="${light ? '#1C1917' : '#fff'}" stroke-opacity="${light ? 0.1 : 0.32}"/><image href="${wordmark}" x="${(center - w / 2).toFixed(1)}" y="${y.mark}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/><rect x="56" y="${y.rule}" width="20" height="1" rx="0.5" fill="${ink}" fill-opacity="0.3"/>${medal}${line(seal.line1, y.line1, { size: 9, weight: 700, tracking: 1.6 })}${
    seal.line2 ? line(seal.line2, y.line2, { size: 7.5, weight: 600, tracking: 1.1 }, 0.88) : ''
  }${
    date
      ? line(date, seal.line2 ? y.date : y.line2, { size: 6.8, weight: 600, tracking: 1 }, 0.72)
      : ''
  }<rect x="${center - 2.2}" y="${y.tip - 2.2}" width="4.4" height="4.4" transform="rotate(45 ${center} ${y.tip})" fill="${ink}" fill-opacity="0.35"/></svg>`;
}
