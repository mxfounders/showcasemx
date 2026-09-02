import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { notFound } from 'next/navigation';
import { blogPosts, blogTones, formatBlogDate, getBlogPost } from '@/lib/blog';
import { ArticleProgress, CopyArticleLink } from '@/components/blog/article-tools';
import { ArticleFeedback } from '@/components/blog/article-feedback';

export function generateStaticParams() { return blogPosts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  return post ? { title: `${post.title} | shwcs`, description: post.excerpt } : { title: 'Artículo | shwcs' };
}

export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) {
  const post = getBlogPost((await params).slug);
  if (!post) notFound();
  const tone = blogTones[post.tone];
  const postIndex = blogPosts.findIndex((item) => item.slug === post.slug);
  const next = blogPosts[(postIndex + 1) % blogPosts.length];
  const nextTone = blogTones[next.tone];
  return <article className="pb-16 sm:pb-24">
    <ArticleProgress color={tone.background} />
    <header className="px-4 pt-5 sm:px-7 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[28px] px-6 py-6 sm:rounded-[32px] sm:px-10 sm:py-7 lg:px-16 lg:py-8" style={{ background: tone.background, color: tone.foreground }}>
        <div className="flex items-center justify-between gap-4">
          <Link href="/blog" className="action-button inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-4 py-2.5 text-sm"><ArrowLeft className="h-4 w-4" /> Blog</Link>
          <span className="text-xs font-medium uppercase tracking-[0.2em] opacity-70">{post.category}</span>
        </div>
        <div className="mt-10 max-w-4xl sm:mt-12 lg:mt-14">
          <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-4xl lg:text-[3.4rem]">{post.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed opacity-80 sm:text-base">{post.excerpt}</p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-white/25 pt-4 text-xs sm:mt-10 sm:text-sm">
          <div><span className="opacity-65">Por </span><span className="font-medium">shwcs editorial</span></div>
          <div className="flex gap-3 opacity-75"><time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time><span>·</span><span>{post.readingMinutes} min</span></div>
        </div>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1240px] gap-12 px-6 py-16 lg:grid-cols-[250px_minmax(0,760px)] lg:justify-start lg:gap-20 xl:gap-24 lg:py-24">
      <aside className="h-fit lg:sticky lg:top-28">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">En este artículo</p>
        <nav className="mt-5 border-l border-stone-200" aria-label="Contenido del artículo">
          {post.sections.map((section, index) => <a key={section.title} href={`#seccion-${index + 1}`} className="action-button block border-l-2 border-transparent py-2.5 pl-4 text-sm leading-snug text-stone-500 hover:border-[#365DC4] hover:text-stone-900"><span className="mr-2 text-stone-300">0{index + 1}</span>{section.title}</a>)}
        </nav>
        <div className="mt-8"><CopyArticleLink /></div>
      </aside>

      <div>
        <section className="rounded-[28px] bg-[#F4F5F7] p-6 sm:p-9" aria-labelledby="ideas-clave">
          <p id="ideas-clave" className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">Ideas clave</p>
          <ul className="mt-6 space-y-4">{post.takeaways.map((takeaway) => <li key={takeaway} className="flex gap-3 text-base leading-relaxed text-stone-700 sm:text-lg"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: tone.background, color: tone.foreground }}><Check className="h-3.5 w-3.5" /></span>{takeaway}</li>)}</ul>
        </section>

        <div className="mt-16 space-y-20 sm:mt-24 sm:space-y-28">
          {post.sections.map((section, index) => <section id={`seccion-${index + 1}`} key={section.title} className="scroll-mt-32">
            <div className="flex items-start gap-5 border-t border-stone-200 pt-7 sm:gap-8">
              <span className="pt-1 text-sm font-medium" style={{ color: tone.background }}>0{index + 1}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-3xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl mb-8">{section.title}</h2>
                {section.contentHtml ? (
                  <div className="prose prose-lg prose-stone max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[#365DC4] prose-a:no-underline hover:prose-a:underline prose-table:border-collapse prose-th:bg-stone-50 prose-th:px-4 prose-th:py-3 prose-th:border prose-th:border-stone-200 prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-stone-200 prose-img:rounded-2xl" dangerouslySetInnerHTML={{ __html: section.contentHtml }} />
                ) : (
                  <div className="space-y-7">{section.paragraphs?.map((paragraph, paragraphIndex) => <p key={paragraph} className={`${paragraphIndex === 0 ? 'text-xl leading-[1.55] text-stone-700 sm:text-2xl' : 'text-lg leading-8 text-stone-600'}`}>{paragraph}</p>)}</div>
                )}
              </div>
            </div>
          </section>)}
        </div>

        <div className="mt-16 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-t border-stone-200 pt-10 sm:mt-24">
          <ArticleFeedback />
          <a href={`https://x.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=https://shwcs.com/blog/${post.slug}`} target="_blank" rel="noreferrer" className="action-button flex w-fit items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:border-black hover:text-black">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.965H5.078z" /></svg>
            Compartir en X
          </a>
        </div>
      </div>
    </div>

    <footer className="mx-auto max-w-[1240px] px-6">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">Sigue leyendo</p>
      <Link href={`/blog/${next.slug}`} className="action-button group mt-4 grid overflow-hidden rounded-[30px] sm:grid-cols-[1fr_280px]" style={{ backgroundColor: nextTone.background, color: nextTone.foreground }}>
        <div className="flex min-h-64 flex-col p-7 sm:p-10">
          <span className="text-xs font-medium uppercase tracking-[0.18em] opacity-70">{next.category}</span>
          <h2 className="mt-8 max-w-3xl text-3xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">{next.title}</h2>
          <span className="mt-auto flex items-center gap-2 pt-8 text-sm">Leer siguiente <ArrowRight className="h-4 w-4 button-arrow" /></span>
        </div>
        <div className="flex min-h-40 items-end justify-end border-t border-white/20 p-7 sm:min-h-full sm:border-l sm:border-t-0"><span className="text-[7rem] font-semibold leading-none tracking-[-0.08em] opacity-20">{String((postIndex + 1) % blogPosts.length + 1).padStart(2, '0')}</span></div>
      </Link>
    </footer>
  </article>;
}
