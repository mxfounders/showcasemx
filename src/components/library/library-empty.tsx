import type { ReactNode } from 'react';

/**
 * The empty and no-match state of the buyer's library pages (Guardados, Mis listas):
 * one dashed surface, the same shape as the «Crear lista» tile, instead of text between
 * two rules.
 */
export function LibraryEmpty({
  icon,
  title,
  text,
  children,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[28px] border border-dashed border-stone-300 px-6 py-16 text-center sm:py-20">
      <span
        aria-hidden="true"
        className="mb-6 flex size-14 items-center justify-center rounded-full bg-[#E4EBFC] text-[#365DC4] [&>svg]:size-6"
      >
        {icon}
      </span>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {text && <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-500">{text}</p>}
      {children && <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
