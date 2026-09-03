"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Hero } from "./hero";
import { CategoryExplorer } from "./category-explorer";
import { previewCategories,catalogPriority } from "@/lib/catalog-preview";
import { searchCatalog } from "@/lib/catalog-search";

export function LandingDiscovery({ published = [], dict }: { published?: import("@/lib/solutions/public").PublishedProduct[], dict?: any }) {
  // Real interaction (comments > saves > likes > views) ranks within each category;
  // catalogPriority only breaks ties among products with equal (usually zero) score.
  const categories = useMemo(() => previewCategories.map(category => ({ ...category, products: Array.from(new Map([...category.products.filter(product => process.env.NEXT_PUBLIC_SHOW_DEMO_PROJECTS==='true'&&!product.website), ...published.filter(product => product.categories.includes(category.label))].map(product => [product.website ?? product.name, product])).values()).sort((a,b)=>((b.score??0)-(a.score??0))||(catalogPriority(a)-catalogPriority(b))) })), [published]);
  const params = useSearchParams();
  const urlQuery = (params.get("q") ?? "").slice(0, 200).trim();
  const [query, setQuery] = useState(urlQuery);
  useEffect(() => { setQuery(urlQuery); if (urlQuery) revealCatalog(); }, [urlQuery]);
  const [selected, setSelected] = useState(0);
  const results = useMemo(() => query ? searchCatalog(query, categories) : null, [query, categories]);
  function revealCatalog() {
    const catalog = document.getElementById("catalogo");
    catalog?.focus({ preventScroll: true });
    catalog?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  function chooseCategory(index: number) { setSelected(index); setQuery(""); }
  return <>
    <Hero dict={dict} onSearch={value => { setQuery(value.trim()); revealCatalog(); }} onCategory={id => { chooseCategory(previewCategories.findIndex(category => category.id === id)); revealCatalog(); }} />
    <CategoryExplorer categories={categories} selected={selected} onCategoryChange={chooseCategory} query={query} results={results} onClear={() => setQuery("")} dict={dict?.categoryExplorer} />
  </>;
}
