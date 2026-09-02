"use client";

import { SaveProjectButton } from '@/components/library/save-project-button';
import { projectKey } from '@/lib/library/model';
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { actionButtonStyle, brandColors } from "@/lib/brand-colors";
import { ArrowDownLeft, ArrowUpRight, Check, Plus, X } from "lucide-react";
import { previewCategories, type PreviewProduct, type PreviewCategory } from "@/lib/catalog-preview";

function ProductVisual({ variant, color }: { variant: number; color: string }) {
  return (
    <div aria-hidden="true" className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl sm:h-40" style={{ backgroundColor: color }}>
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#78716c_0.6px,transparent_0.6px)] [background-size:12px_12px]" />
      <div className="relative w-[88%] max-w-64 rounded-xl border border-white/80 bg-white/85 p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.22)] transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transform-none">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1"><i className="size-1 rounded-full bg-stone-300" /><i className="size-1 rounded-full bg-stone-300" /><i className="size-1 rounded-full bg-stone-300" /></div>
          <div className="h-1 w-8 rounded-full bg-stone-200" />
        </div>
        {variant === 0 ? (
          <div className="flex h-14 items-end gap-2">
            {[32, 52, 42, 72, 60, 88, 100].map((height, i) => <div key={i} className="flex-1 rounded-t-sm bg-stone-800" style={{ height: `${height}%`, opacity: 0.2 + i * 0.12 }} />)}
          </div>
        ) : variant === 1 ? (
          <div className="flex h-14 items-center justify-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full border border-stone-300"><ArrowDownLeft className="size-5 text-stone-700" /></div>
            <div className="space-y-2"><div className="h-2 w-20 rounded bg-stone-700" /><div className="h-1.5 w-14 rounded bg-stone-200" /></div>
          </div>
        ) : variant === 2 ? (
          <div className="flex h-14 gap-2">
            {[0, 1, 2].map(i => <div key={i} className="flex-1 rounded-md bg-stone-100 p-2"><div className="mb-2 h-1 w-6 rounded bg-stone-300" /><div className="h-4 rounded border border-stone-200 bg-white" />{i !== 1 && <div className="mt-1 h-2 rounded bg-white" />}</div>)}
          </div>
        ) : (
          <div className="flex h-14 flex-col justify-between">
            {[0, 1, 2].map(i => <div key={i} className="flex items-center gap-2"><span className="flex size-3 items-center justify-center rounded-full bg-stone-800"><Check className="size-2 text-white" /></span><div className="h-1.5 flex-1 rounded bg-stone-200" /><div className="h-1 w-6 rounded bg-stone-300" /></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryExplorer({ categories = previewCategories, selected, onCategoryChange, results, query, onClear, dict }: { categories?: PreviewCategory[]; selected: number; onCategoryChange: (index: number) => void; results: PreviewProduct[] | null; query: string; onClear: () => void; dict?: any }) {
  const displayed = selected;
  const [detail, setDetail] = useState<PreviewProduct | null>(null);
  const detailKey = detail ? projectKey(detail) : null;
  const gridRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const category = categories[displayed];
  const palette = brandColors[category.tone];
  const products = results ?? category.products;
  const realCount = products.filter(product => product.website).length;
  const availableSlots = results === null ? Math.max(0, 9 - products.length) : 0;

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(grid.children, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.38, stagger: 0.035, ease: "power3.out", clearProps: "opacity,transform", overwrite: true });
    });
    return () => media.revert();
  }, [displayed, results]);



  useEffect(() => {
    if (detail) dialogRef.current?.showModal();
  }, [detail]);

  function selectCategory(index: number) { onCategoryChange(index); }

  return (
    <section id="catalogo" tabIndex={-1} aria-label="Explorar soluciones por categoría" className="scroll-mt-24 px-4 pb-8 sm:px-6 focus:outline-none">
      <div className="mx-auto max-w-[1600px] p-3 sm:p-5 xl:p-7">
        <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-6">
          <div ref={navRef} role="group" aria-label="Categorías" style={{ gridTemplateRows: `repeat(${categories.length}, minmax(0, 1fr))` }} className="flex gap-2.5 overflow-x-auto pb-2 lg:sticky lg:top-20 lg:self-start lg:grid lg:h-[min(800px,calc(100svh-104px))] lg:overflow-visible lg:pb-0" onKeyDown={event => {
            const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
            if (!keys.includes(event.key)) return;
            event.preventDefault();
            const index = event.key === "Home" ? 0 : event.key === "End" ? categories.length - 1 : (selected + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + categories.length) % categories.length;
            selectCategory(index);
            navRef.current?.querySelectorAll("button")[index]?.focus();
          }}>
            {categories.map((item, index) => (
              <button key={item.id} type="button" aria-pressed={results === null && selected === index} aria-controls="category-products" onClick={() => selectCategory(index)} className={`group relative flex min-h-24 w-40 shrink-0 flex-col justify-between rounded-2xl border p-4 text-left transition-[background-color,color,border-color,box-shadow] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800 lg:min-h-0 lg:w-full ${results === null && selected === index ? "border-transparent text-white shadow-md" : "border-black/[0.04] text-stone-800 hover:border-stone-400"}`} style={{ backgroundColor: results === null && selected === index ? brandColors[item.tone].solid : brandColors[item.tone].soft, color: results === null && selected === index ? "#ffffff" : brandColors[item.tone].solid }}>
                <span className="flex w-full items-center justify-between text-[11px] tabular-nums"><span>{String(index + 1).padStart(2, "0")} <span className="ml-2 opacity-65">{item.products.length} {item.products.length === 1 ? (dict?.option || "opción") : (dict?.options || "opciones")}</span></span><ArrowUpRight aria-hidden="true" className={`size-4 transition-[transform,opacity] duration-300 motion-reduce:transition-none ${results === null && selected === index ? "opacity-100" : "-translate-x-1 translate-y-1 opacity-0 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"}`} /></span>
                <span className="text-[18px] font-medium tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="min-w-0">
            {results !== null && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-600"><p role="status">{results.length} {results.length === 1 ? (dict?.solution || "solución") : (dict?.solutions || "soluciones")} {dict?.solutionFor || "para"} “{query}”</p><button type="button" onClick={onClear} style={actionButtonStyle} className="action-button rounded-full px-4 py-2">{dict?.clearBtn || "Limpiar búsqueda"}</button></div>}
            {results?.length === 0 && <div className="rounded-3xl border border-dashed border-stone-300 p-8 sm:p-12"><h2 className="text-2xl font-medium tracking-tight">{dict?.emptyTitle || "Todavía no tenemos una solución para eso."}</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-stone-500">{dict?.emptyDesc || "El catálogo está creciendo. Prueba con cobros, tienda online o automatización, o explora otra categoría."}</p></div>}
            <div id="category-products" role="region" aria-label={results !== null ? "Resultados de búsqueda" : `Soluciones de ${category.label}`} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3" ref={gridRef}>
              {products.map((product, index) => (
                <button key={product.detailUrl ?? `${category.id}-${product.name}`} type="button" onClick={() => setDetail(product)} aria-label={`${product.website ? (dict?.seeSolution || "Conocer solución") : (dict?.seeExample || "Ver ejemplo")}: ${product.name}`} className="group flex h-[328px] min-w-0 flex-col rounded-[20px] border border-stone-200/80 bg-white p-3.5 text-left shadow-[0_2px_6px_rgba(0,0,0,0.015)] transition-[box-shadow,border-color] duration-300 hover:border-stone-300 hover:shadow-[0_12px_28px_-12px_rgba(0,0,0,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800 sm:h-[340px]">
                  {product.website ? (
                    <div className="relative flex h-36 shrink-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl sm:h-40" style={{ backgroundColor: palette.soft, color: palette.solid }}>
                      {product.ogImage ? <Image src={product.ogImage} alt={`Portada de ${product.name}`} fill sizes="(min-width: 1600px) 400px, (min-width: 1280px) 30vw, (min-width: 640px) 45vw, 90vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none" /> : <>
                        <span className="text-[38px] font-semibold tracking-[-0.06em]">{product.name}</span>
                        <span className="text-xs">{new URL(product.website).hostname}</span>
                      </>}
                      <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium">{product.offering}</span>
                    </div>
                  ) : <ProductVisual variant={index % 4} color={palette.soft} />}
                  <div className="flex items-center gap-2.5 px-1 pt-4">
                    {product.favicon ? <Image src={product.favicon} alt="" width={32} height={32} unoptimized className="size-8 shrink-0 rounded-[9px] object-contain" /> : <span aria-hidden="true" style={{ backgroundColor: palette.solid }} className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-sm font-semibold text-white">{product.name.slice(0, 1)}</span>}
                    <span className="text-[20px] font-semibold tracking-[-0.03em] text-stone-900">{product.name}</span>
                    <ArrowUpRight aria-hidden="true" className="ml-auto size-4 text-stone-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" />
                  </div>
                  <p className="line-clamp-2 px-1 pt-2 text-[13px] leading-relaxed text-stone-500">{product.description}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 px-1 pt-3 text-[11px] text-stone-400"><span className="truncate">{product.website ? `${dict?.byLabel || "Por"} ${product.provider}` : product.feature}</span><span className="inline-flex shrink-0 items-center gap-1 text-stone-600">{product.website ? (dict?.seeSolution || "Conocer solución") : (dict?.seeExample || "Ver ejemplo")} <Plus aria-hidden="true" className="size-3" /></span></div>
                </button>
              ))}
              {Array.from({ length: availableSlots }, (_, index) => (
                <Link key={`available-${category.id}-${index}`} href="/account/solutions/new" aria-label={`Postular una solución para ${category.label}, espacio ${index + 1}`} className="group flex h-[328px] min-w-0 flex-col justify-between rounded-[20px] border border-dashed border-stone-300 bg-stone-200/45 p-5 text-left transition-[background-color,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-200/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800 motion-reduce:transform-none sm:h-[340px]">
                  <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-stone-400"><span>{dict?.availableSpace || "Espacio disponible"}</span><span className="tabular-nums">{String(products.length + index + 1).padStart(2, "0")}</span></span>
                  <span><span className="block max-w-[14rem] text-xl font-medium tracking-[-0.03em] text-stone-500">{dict?.applySpaceTitle || "Tu solución puede estar aquí."}</span><span className="mt-4 inline-flex items-center gap-2 text-sm text-stone-500 transition-colors group-hover:text-stone-900">{dict?.applySpaceBtn || "Postular en"} {category.label}<Plus aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:rotate-90 motion-reduce:transform-none" /></span></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-stone-500">
          <span role="status">{results !== null ? (dict?.realResultsLabel || "Resultados del catálogo real") : category.action} <span aria-hidden="true" className="mx-2 text-stone-300">/</span> {realCount} {realCount === 1 ? (dict?.realSolutionsCount || "solución real") : (dict?.realSolutionsCountPlural || "soluciones reales")}{availableSlots > 0 && <> · {availableSlots} {availableSlots === 1 ? (dict?.availableSlotsCount || "espacio disponible") : (dict?.availableSlotsCountPlural || "espacios disponibles")}</>}</span>
          {products.length > realCount && <span>{dict?.fictionalNotice || "Los ejemplos son ficticios · No son proveedores disponibles"}</span>}
        </div>
      </div>

      <dialog ref={dialogRef} aria-labelledby="preview-product-name" aria-describedby="preview-product-description" onClose={() => setDetail(null)} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); dialogRef.current?.close(); } }} onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close(); }} className="w-[calc(100%-2rem)] max-w-md rounded-3xl border border-stone-200 bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/35 backdrop:backdrop-blur-sm">
        {detail && <div className="p-7">
          <div className="mb-6 flex items-center justify-between"><span className="text-xs text-stone-500">{detail.website ? `${detail.offering} · ${dict?.byLabel || "Por"} ${detail.provider}` : (dict?.previewTitle || "Producto ficticio · Vista previa")}</span><button type="button" autoFocus onClick={() => dialogRef.current?.close()} aria-label="Cerrar ficha" style={actionButtonStyle} className="action-button rounded-full p-2 focus-visible:outline focus-visible:outline-2"><X className="size-5" /></button></div>
          <h2 id="preview-product-name" className="text-3xl font-semibold tracking-tight">{detail.name}</h2>
          <p id="preview-product-description" className="mt-4 leading-relaxed text-stone-600">{detail.description}</p>
          <p className="mt-6 border-t border-stone-100 pt-5 text-sm leading-relaxed text-stone-500">{detail.website ? (dict?.previewNoticeReal || "Descripción basada en el sitio del proveedor. Consulta allí el alcance, disponibilidad y condiciones. Su inclusión no implica certificación independiente de shwcs.") : (dict?.previewNoticeMock || "Este ejemplo muestra cómo se presentarán las soluciones del catálogo. Aún no representa una aplicación disponible ni un fundador real.")}</p>
          {detailKey && <div className="mt-5"><SaveProjectButton key={detailKey} projectKey={detailKey} /></div>}
          {detail.detailUrl && <Link href={detail.detailUrl} className="mt-6 mr-3 inline-flex rounded-full border border-stone-300 px-5 py-3 text-sm">{dict?.viewFullBtn || "Ver ficha completa"}</Link>}
          {detail.website ? <a href={detail.website} target="_blank" rel="noopener noreferrer" style={actionButtonStyle} className="mt-6 inline-flex items-center gap-2 rounded-full action-button px-5 py-3 text-sm font-medium">{dict?.visitSiteBtn || "Visitar sitio oficial"} <ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (abre en una pestaña nueva)</span></a> : <button type="button" onClick={() => dialogRef.current?.close()} style={actionButtonStyle} className="mt-6 rounded-full action-button px-5 py-3 text-sm font-medium">{dict?.keepExploringBtn || "Seguir explorando"}</button>}
        </div>}
      </dialog>
    </section>
  );
}
