import Link from 'next/link';
import Image from 'next/image';

// Bare "/" hits middleware.ts, which 307-redirects to "/{locale}" — Next never
// caches a prefetch that resolves to a redirect, so every logo click turned
// into a cold navigation. Passing locale keeps the prefetch usable.
export function BrandLink({variant='default',locale='es'}:{variant?:'default'|'navbar';locale?:string}) {
  const compact=variant==='navbar';
  return <Link href={`/${locale}`} aria-label="shwcs, volver al inicio" className="inline-flex shrink-0 items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#365DC4]">
    <Image
      src="/brand/shwcs-logo-1.png"
      width={961}
      height={298}
      alt=""
      className={compact?'h-[21px] w-auto':'h-[26px] w-auto'}
    />
  </Link>;
}
