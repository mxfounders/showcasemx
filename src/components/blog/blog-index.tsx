'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Grid2X2, List } from 'lucide-react';
import { ExpandingSearch } from '@/components/search/expanding-search';
import { blogPosts, blogTones, formatBlogDate } from '@/lib/blog';

type View = 'grid' | 'list';
const categories = ['Todos', ...Array.from(new Set(blogPosts.map((post) => post.category)))] as const;

export function BlogIndex() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Todos');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [view, setView] = useState<View>('grid');
  const posts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return blogPosts
      .filter((post) => category === 'Todos' || post.category === category)
      .filter((post) => !normalized || `${post.title} ${post.excerpt} ${post.category}`.toLocaleLowerCase('es').includes(normalized))
      .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'es') : sort === 'oldest' ? a.publishedAt.localeCompare(b.publishedAt) : b.publishedAt.localeCompare(a.publishedAt));
  }, [category, query, sort]);

  return <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-16">
    <h1 className="sr-only">Blog de shwcs</h1>
    <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12">
      <aside className="lg:sticky lg:top-28 lg:h-fit">
        <p className="border-b border-stone-200 pb-4 text-sm font-medium">Filtrar y ordenar</p>
        <label className="mt-5 block text-xs uppercase tracking-[0.16em] text-stone-400" htmlFor="blog-sort">Orden</label>
        <details className="group relative mt-2 w-fit lg:w-full">
          <summary id="blog-sort" className="selector-dropdown-trigger min-w-48 justify-between [&::-webkit-details-marker]:hidden lg:w-full"><span>{sort === 'newest' ? 'Más recientes' : sort === 'oldest' ? 'Más antiguos' : 'Título A–Z'}</span><ChevronDown aria-hidden="true" className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" /></summary>
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_18px_45px_-20px_rgba(41,37,36,0.35)]">
            {([['newest', 'Más recientes'], ['oldest', 'Más antiguos'], ['title', 'Título A–Z']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={sort === value} onClick={(event) => { setSort(value); event.currentTarget.closest('details')?.removeAttribute('open'); }} className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4] ${sort === value ? 'selector-menu-active' : ''}`}>{label}{sort === value && <Check aria-hidden="true" className="size-4" />}</button>)}
          </div>
        </details>
        <p className="mt-7 text-xs uppercase tracking-[0.16em] text-stone-400">Categoría</p>
        <div className="mt-2 flex flex-wrap gap-1 lg:block">
          {categories.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className="selector-tab block w-auto text-left lg:w-full">{item}</button>)}
        </div>
      </aside>

      <section>
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <p className="text-sm text-stone-400">{posts.length} {posts.length === 1 ? 'artículo' : 'artículos'}</p>
          <div className="ml-auto hidden selector-tabs w-fit rounded-full bg-stone-100 p-1 sm:flex" aria-label="Vista">
            <button type="button" aria-label="Cuadrícula" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className="selector-tab flex items-center gap-2"><Grid2X2 className="h-4 w-4"/><span>Cuadrícula</span></button>
            <button type="button" aria-label="Lista" aria-pressed={view === 'list'} onClick={() => setView('list')} className="selector-tab flex items-center gap-2"><List className="h-4 w-4"/><span>Lista</span></button>
          </div>
          <ExpandingSearch label="Buscar artículos" placeholder="Buscar artículos" value={query} onChange={setQuery} />
        </div>

        {posts.length ? <div className={view === 'grid' ? 'mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3' : 'mt-6 space-y-4'}>
          {posts.map((post, index) => {
            const tone = blogTones[post.tone];
            return <Link key={post.slug} href={`/blog/${post.slug}`} className={`action-button group flex min-h-[470px] flex-col overflow-hidden rounded-[26px] border border-stone-200 bg-white ${view === 'list' ? 'sm:grid sm:min-h-56 sm:grid-cols-[250px_1fr]' : 'md:min-h-[510px]'}`}>
              <div className={`relative flex min-h-52 overflow-hidden p-6 ${view === 'list' ? 'sm:min-h-48' : 'md:min-h-56'}`} style={{ background: tone.background, color: tone.foreground }}>
                <span className="text-xs font-medium uppercase tracking-[0.18em] opacity-75">{post.category}</span>
                <span className="absolute bottom-2 right-5 text-[6.5rem] font-semibold leading-none tracking-[-0.08em] opacity-20">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="flex items-center gap-2 text-xs text-stone-400"><time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time><span>·</span><span>{post.readingMinutes} min</span></div>
                <h2 className="mt-4 text-2xl font-semibold leading-[1.05] tracking-[-0.035em]">{post.title}</h2>
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-stone-500">{post.excerpt}</p>
                <span className="mt-auto flex items-center justify-between pt-7 text-sm font-medium text-[#365DC4]">Leer artículo <ArrowRight className="h-4 w-4 button-arrow" /></span>
              </div>
            </Link>;
          })}
        </div> : <div className="mt-5 rounded-[26px] border border-dashed border-stone-300 px-6 py-20 text-center"><p className="text-lg font-medium">No encontramos artículos.</p><button type="button" onClick={() => { setQuery(''); setCategory('Todos'); }} className="mt-3 text-sm text-[#365DC4]">Limpiar filtros →</button></div>}
      </section>
    </div>
  </div>;
}
