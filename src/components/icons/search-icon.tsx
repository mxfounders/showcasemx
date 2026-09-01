import type { SVGProps } from 'react';

// Shared drawing keeps every search entry point on the same motion treatment.
export function SearchIcon({className='',...props}:SVGProps<SVGSVGElement>){
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`search-icon ${className}`} {...props}><g className="search-icon__drawing"><circle cx="10.8" cy="10.8" r="7.5"/><path d="m16.1 16.1 4.7 4.7"/></g></svg>;
}
