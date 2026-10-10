import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { THEME_COOKIE, readTheme } from '@/lib/theme';
import './globals.css';

// Self-hosted at build time by next/font: no request ever leaves for Google, so
// the CSP can stay at font-src 'self'.
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: { default: 'Operaciones · shwcs', template: '%s · ops shwcs' },
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
  ],
};

// Applies the OS preference before paint when the operator chose "sistema".
const SYSTEM_THEME_SCRIPT = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');var a=function(){document.documentElement.classList.toggle('dark',m.matches)};a();m.addEventListener('change',function(){if(document.documentElement.dataset.theme==='system')a()})}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const theme = readTheme(cookieStore.get(THEME_COOKIE)?.value);
  const nonce = headerStore.get('x-nonce') ?? undefined;

  return (
    <html
      lang="es"
      data-theme={theme}
      className={`${sans.variable} ${mono.variable}${theme === 'dark' ? ' dark' : ''}`}
      suppressHydrationWarning
    >
      <head>
        {theme === 'system' && (
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
