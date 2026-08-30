"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { actionButtonStyle, brandColors } from "@/lib/brand-colors";
import { ArrowDownLeft, ArrowUpRight, Check, Plus, X } from "lucide-react";
import { previewCategories, type PreviewProduct } from "@/lib/catalog-preview";

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

export function CategoryExplorer({ selected, onCategoryChange, results, query, onClear }: { selected: number; onCategoryChange: (index: number) => void; results: PreviewProduct[] | null; query: string; onClear: () => void }) {
  const displayed = selected;
  const [detail, setDetail] = useState<PreviewProduct | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const category = previewCategories[displayed];
  const palette = brandColors[category.tone];
  const products = results ?? category.products;
  const realCount = products.filter(product => product.website).length;

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
          <div ref={navRef} role="group" aria-label="Categorías" style={{ gridTemplateRows: `repeat(${previewCategories.length}, minmax(0, 1fr))` }} className="flex gap-2.5 overflow-x-auto pb-2 lg:sticky lg:top-20 lg:self-start lg:grid lg:h-[min(800px,calc(100svh-104px))] lg:overflow-visible lg:pb-0" onKeyDown={event => {
            const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
            if (!keys.includes(event.key)) return;
            event.preventDefault();
            const index = event.key === "Home" ? 0 : event.key === "End" ? previewCategories.length - 1 : (selected + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + previewCategories.length) % previewCategories.length;
            selectCategory(index);
            navRef.current?.querySelectorAll("button")[index]?.focus();
          }}>
            {previewCategories.map((item, index) => (
              <button key={item.id} type="button" aria-pressed={results === null && selected === index} aria-controls="category-products" onClick={() => selectCategory(index)} className={`group relative flex min-h-24 w-40 shrink-0 flex-col justify-between rounded-2xl border p-4 text-left transition-[background-color,color,border-color,box-shadow] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800 lg:min-h-0 lg:w-full ${results === null && selected === index ? "border-transparent text-white shadow-md" : "border-black/[0.04] text-stone-800 hover:border-stone-400"}`} style={{ backgroundColor: results === null && selected === index ? brandColors[item.tone].solid : brandColors[item.tone].soft, color: results === null && selected === index ? "#ffffff" : brandColors[item.tone].solid }}>
                <span className="flex w-full items-center justify-between text-[11px] tabular-nums"><span>{String(index + 1).padStart(2, "0")} <span className="ml-2 opacity-65">{item.products.length} opciones</span></span><ArrowUpRight aria-hidden="true" className={`size-4 transition-[transform,opacity] duration-300 motion-reduce:transition-none ${results === null && selected === index ? "opacity-100" : "-translate-x-1 translate-y-1 opacity-0 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"}`} /></span>
                <span className="text-[18px] font-medium tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="min-w-0">
            {results !== null && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-600"><p role="status">{results.length} {results.length === 1 ? "solución" : "soluciones"} para “{query}”</p><button type="button" onClick={onClear} style={actionButtonStyle} className="action-button rounded-full px-4 py-2">Limpiar búsqueda</button></div>}
            {results?.length === 0 && <div className="rounded-3xl border border-dashed border-stone-300 p-8 sm:p-12"><h2 className="text-2xl font-medium tracking-tight">Todavía no tenemos una solución para eso.</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-stone-500">El catálogo está creciendo. Prueba con cobros, tienda online o automatización, o explora otra categoría.</p></div>}
            <div id="category-products" role="region" aria-label={results !== null ? "Resultados de búsqueda" : `Soluciones de ${category.label}`} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3" ref={gridRef}>
              {products.map((product, index) => (
                <button key={`${category.id}-${product.name}`} type="button" onClick={() => setDetail(product)} aria-label={`${product.website ? "Conocer solución" : "Ver ejemplo"}: ${product.name}`} className="group flex h-[328px] min-w-0 flex-col rounded-[20px] border border-stone-200/80 bg-white p-3.5 text-left shadow-[0_2px_6px_rgba(0,0,0,0.015)] transition-[box-shadow,border-color] duration-300 hover:border-stone-300 hover:shadow-[0_12px_28px_-12px_rgba(0,0,0,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800 sm:h-[340px]">
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
                  <p className="px-1 pt-2 text-[13px] leading-relaxed text-stone-500">{product.description}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 px-1 pt-3 text-[11px] text-stone-400"><span className="truncate">{product.website ? `Por ${product.provider}` : product.feature}</span><span className="inline-flex shrink-0 items-center gap-1 text-stone-600">{product.website ? "Conocer solución" : "Ver ejemplo"} <Plus aria-hidden="true" className="size-3" /></span></div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-stone-500">
          <span role="status">{results !== null ? "Resultados del catálogo real" : category.action} <span aria-hidden="true" className="mx-2 text-stone-300">/</span> {realCount} {realCount === 1 ? "solución real" : "soluciones reales"} · {products.length - realCount} ejemplos</span>
          <span>Los ejemplos son ficticios · Software y servicios identificados</span>
        </div>
      </div>

      <dialog ref={dialogRef} aria-labelledby="preview-product-name" aria-describedby="preview-product-description" onClose={() => setDetail(null)} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); dialogRef.current?.close(); } }} onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close(); }} className="w-[calc(100%-2rem)] max-w-md rounded-3xl border border-stone-200 bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/35 backdrop:backdrop-blur-sm">
        {detail && <div className="p-7">
          <div className="mb-6 flex items-center justify-between"><span className="text-xs text-stone-500">{detail.website ? `${detail.offering} · Por ${detail.provider}` : "Producto ficticio · Vista previa"}</span><button type="button" autoFocus onClick={() => dialogRef.current?.close()} aria-label="Cerrar ficha" style={actionButtonStyle} className="action-button rounded-full p-2 focus-visible:outline focus-visible:outline-2"><X className="size-5" /></button></div>
          <h2 id="preview-product-name" className="text-3xl font-semibold tracking-tight">{detail.name}</h2>
          <p id="preview-product-description" className="mt-4 leading-relaxed text-stone-600">{detail.description}</p>
          <p className="mt-6 border-t border-stone-100 pt-5 text-sm leading-relaxed text-stone-500">{detail.website ? "Descripción basada en el sitio del proveedor. Consulta allí el alcance, disponibilidad y condiciones. Su inclusión no implica certificación independiente de ShowcaseMX." : "Este ejemplo muestra cómo se presentarán las soluciones del catálogo. Aún no representa una aplicación disponible ni un fundador real."}</p>
          {detail.website ? <a href={detail.website} target="_blank" rel="noopener noreferrer" style={actionButtonStyle} className="mt-6 inline-flex items-center gap-2 rounded-full action-button px-5 py-3 text-sm font-medium">Visitar sitio oficial <ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (abre en una pestaña nueva)</span></a> : <button type="button" onClick={() => dialogRef.current?.close()} style={actionButtonStyle} className="mt-6 rounded-full action-button px-5 py-3 text-sm font-medium">Seguir explorando</button>}
        </div>}
      </dialog>
    </section>
  );
}
