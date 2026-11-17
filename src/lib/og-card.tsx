import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { brandColors, type BrandTone } from '@/lib/brand-colors';

/**
 * The card a shared link shows (SHCWS-99): the §3 look (stone background, white card,
 * one brand accent) with the official wordmark PNG (§35), never the name typed in a font.
 * Text only: no remote images, so rendering never depends on a third party.
 */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = 'image/png';

let wordmark: Promise<string> | null = null;
const loadWordmark = () =>
  (wordmark ??= readFile(join(process.cwd(), 'public/brand/shwcs-logo-1.png')).then(
    buffer => `data:image/png;base64,${buffer.toString('base64')}`,
  ));

const clip = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

export async function ogCard({
  eyebrow,
  title,
  subtitle,
  footer,
  tone = 'blue',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  footer?: string;
  tone?: BrandTone;
}) {
  const accent = brandColors[tone];
  const logo = await loadWordmark().catch(() => null);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#f5f5f4',
        padding: 48,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: 40,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 14, background: accent.solid }} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '48px 64px 56px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              background: accent.soft,
              color: accent.solid,
              fontSize: 26,
              padding: '8px 20px',
              borderRadius: 999,
            }}
          >
            {clip(eyebrow, 60)}
          </div>
          <div
            style={{
              marginTop: 36,
              fontSize: title.length > 40 ? 60 : 76,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
              color: '#1c1917',
            }}
          >
            {clip(title, 90)}
          </div>
          {subtitle && (
            <div style={{ marginTop: 24, fontSize: 30, lineHeight: 1.35, color: '#57534e' }}>
              {clip(subtitle, 150)}
            </div>
          )}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} height={44} width={142} alt="" />
            ) : (
              <div />
            )}
            {footer && <div style={{ fontSize: 26, color: accent.solid }}>{footer}</div>}
          </div>
        </div>
      </div>
    </div>,
    ogSize,
  );
}
