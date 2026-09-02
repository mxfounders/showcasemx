'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { CatalogFilterBar } from './catalog-filter-bar';
import { ProductVisual } from '@/components/product-visual';
import { getAccentStyle } from '@/lib/brand-colors';

type Product = any;

const taxonomy = {
  industria: [
    { value: 'Agencias', label: 'Agencias y consultoras' },
    { value: 'Retail', label: 'Retail & E-commerce' },
    { value: 'Manufactura', label: 'Manufactura y logística' },
    { value: 'Legal', label: 'Despachos legales' },
    { value: 'Salud', label: 'Salud y clínicas' },
    { value: 'Educación', label: 'Educación y EdTech' }
  ],
  problema: [
    { value: 'Cobros', label: 'Cobros y facturación' },
    { value: 'Contratos', label: 'Contratos y firma' },
    { value: 'Nómina', label: 'Nómina y RH' },
    { value: 'Finanzas', label: 'Visibilidad financiera' },
    { value: 'Inventario', label: 'Inventario y supply chain' },
    { value: 'Ventas', label: 'Ventas y CRM' }
  ],
  tamano: [
    { value: 'pyme', label: 'PyMEs y Startups' },
    { value: 'midmarket', label: 'Mid-market' },
    { value: 'enterprise', label: 'Corporativo (Enterprise)' }
  ],
  modelo: [
    { value: 'Software', label: 'SaaS / Software' },
    { value: 'Agencia', label: 'Agencia Especializada' },
    { value: 'Servicio', label: 'Servicio B2B' }
  ]
};

export function CategoryPageLayout({
  title,
  description,
  categorySlug,
  basePath,
  products,
  searchParams
}: {
  title: string;
  description: string;
  categorySlug: string;
  basePath: string;
  products: Product[];
  searchParams: { [key: string]: string | undefined };
}) {
  
  // Dynamic Contextual Filters depending on where the user is
  const filters = useMemo(() => {
    if (basePath === '/explorar') {
      // User is looking at a specific Problem (e.g., Cobros). Allow filtering by Industry and Size.
      return [
        { id: 'industria', label: 'Industria específica', options: taxonomy.industria },
        { id: 'tamano', label: 'Tamaño de empresa', options: taxonomy.tamano },
        { id: 'modelo', label: 'Formato', options: taxonomy.modelo }
      ];
    }
    if (basePath === '/industria') {
      // User is looking at a specific Industry (e.g., Retail). Allow filtering by Problem and Size.
      return [
        { id: 'problema', label: 'Caso de uso', options: taxonomy.problema },
        { id: 'tamano', label: 'Tamaño de empresa', options: taxonomy.tamano },
        { id: 'modelo', label: 'Formato', options: taxonomy.modelo }
      ];
    }
    // Default for /colecciones
    return [
      { id: 'problema', label: 'Caso de uso', options: taxonomy.problema },
      { id: 'modelo', label: 'Formato', options: taxonomy.modelo }
    ];
  }, [basePath]);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    // Cross-filtering engine
    if (searchParams.industria) {
      const term = searchParams.industria.toLowerCase();
      result = result.filter(p => p.categories?.some((c: string) => c.toLowerCase().includes(term)) || p.description.toLowerCase().includes(term));
    }
    if (searchParams.problema) {
      const term = searchParams.problema.toLowerCase();
      result = result.filter(p => p.category?.toLowerCase().includes(term) || p.categories?.some((c: string) => c.toLowerCase().includes(term)) || p.description.toLowerCase().includes(term));
    }
    if (searchParams.tamano) {
      // Mock filtering for size (in reality this would check a 'target_audience' field)
      result = result.filter(p => p.description.toLowerCase().includes(searchParams.tamano!) || p.feature?.toLowerCase().includes(searchParams.tamano!));
    }
    if (searchParams.modelo) {
      result = result.filter(p => p.offering === searchParams.modelo);
    }
    
    // Sorting
    if (searchParams.sort === 'az') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (searchParams.sort === 'newest') {
      result.reverse();
    } 
    
    return result;
  }, [products, searchParams]);

  const palette = getAccentStyle(basePath + '/' + categorySlug);

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-16">
      <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-start md:justify-between md:gap-12 lg:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-[42px] font-semibold tracking-tight leading-[1.05] md:max-w-md lg:max-w-lg shrink-0">
          {title}
        </h1>
        <p className="max-w-lg text-[17px] leading-relaxed text-stone-500 md:pt-2">
          {description}
        </p>
      </div>

      <CatalogFilterBar filters={filters} totalItems={filteredProducts.length} />

      {filteredProducts.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product, index) => (
            <Link 
              key={product.catalogId || product.name} 
              href={product.detailUrl || '#'}
              className="group flex flex-col justify-between rounded-[24px] border border-stone-200 bg-white p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-200/50"
            >
              <div>
                {product.website ? (
                  <div className="relative flex h-36 shrink-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-[16px]" style={{ backgroundColor: palette.backgroundColor, color: palette.color }}>
                    {product.ogImage ? (
                      <Image src={product.ogImage} alt={product.name} fill sizes="(min-width: 640px) 30vw, 90vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <>
                        <span className="text-[28px] font-semibold tracking-[-0.04em]">{product.name}</span>
                        <span className="text-[10px] opacity-80">{new URL(product.website).hostname}</span>
                      </>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[9px] font-medium uppercase tracking-widest text-stone-800 backdrop-blur-md">{product.offering}</span>
                  </div>
                ) : (
                  <ProductVisual variant={index % 4} color={palette.backgroundColor} />
                )}
                
                <div className="flex items-center gap-3 pt-5">
                  {product.favicon ? (
                    <Image src={product.favicon} alt="" width={32} height={32} unoptimized className="size-8 shrink-0 rounded-[8px] object-contain" />
                  ) : (
                    <span aria-hidden="true" style={{ backgroundColor: palette.color }} className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-xs font-semibold text-white">
                      {product.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="text-lg font-semibold tracking-tight text-stone-900">{product.name}</span>
                  <ArrowUpRight aria-hidden="true" className="ml-auto size-4 text-stone-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                
                <p className="line-clamp-2 pt-3 text-[13px] leading-relaxed text-stone-500">{product.description}</p>
              </div>
              
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-[11px] font-medium text-stone-400">
                <span className="truncate pr-4">{product.provider || product.name}</span>
                <span className="inline-flex shrink-0 items-center text-[#365DC4]">Conocer solución</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-stone-300 bg-stone-50 py-32 text-center">
          <p className="text-lg font-medium text-stone-900">No encontramos soluciones</p>
          <p className="mt-2 max-w-sm text-sm text-stone-500">Intenta quitar algunos filtros o explora otras categorías relacionadas.</p>
        </div>
      )}
    </div>
  );
}
