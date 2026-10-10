export const THEME_COOKIE = 'ops-theme';
export type ThemePreference = 'light' | 'dark' | 'system';

export function readTheme(value: string | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}
