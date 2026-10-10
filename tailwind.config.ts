import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

// Brand colors live in src/lib/brand-colors.ts; the CSS variables mapped here are the
// only design tokens defined in src/app/globals.css.
const config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [typography],
} satisfies Config;

export default config;
