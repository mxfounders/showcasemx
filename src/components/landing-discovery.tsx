"use client";

import { useMemo, useState } from "react";
import { Hero } from "./hero";
import { CategoryExplorer } from "./category-explorer";
import { previewCategories } from "@/lib/catalog-preview";
import { searchCatalog } from "@/lib/catalog-search";

export function LandingDiscovery() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const results = useMemo(() => query ? searchCatalog(query) : null, [query]);
  function revealCatalog() {
    const catalog = document.getElementById("catalogo");
    catalog?.focus({ preventScroll: true });
    catalog?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  function chooseCategory(index: number) { setSelected(index); setQuery(""); }
  return <>
    <Hero onSearch={value => { setQuery(value.trim()); revealCatalog(); }} onCategory={id => { chooseCategory(previewCategories.findIndex(category => category.id === id)); revealCatalog(); }} />
    <CategoryExplorer selected={selected} onCategoryChange={chooseCategory} query={query} results={results} onClear={() => setQuery("")} />
  </>;
}
