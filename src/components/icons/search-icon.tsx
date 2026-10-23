import { SearchIcon as GotaSearchIcon, type GotaIconProps } from './gota';

// Every search entry point draws Gota's magnifier with the same gesture (.search-icon in
// globals.css), so they all move alike.
export function SearchIcon({ className = '', ...props }: GotaIconProps) {
  return <GotaSearchIcon className={`search-icon ${className}`} {...props} />;
}
