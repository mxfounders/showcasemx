import Link from '@/i18n/navigation';
import { BoardCard } from '@/components/library/board-card';
import type { PublicCollection } from '@/lib/library/community';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * The home's way into Comunidad (SHCWS-114): up to three public lists, most popular
 * first. Only real lists, each already past the three-listing minimum (SHCWS-116); with
 * none, it renders nothing rather than an empty block or invented selections (§23).
 */
export function CommunityStrip({
  collections,
  dict,
}: {
  collections: readonly PublicCollection[];
  dict: Dictionary['community'];
}) {
  if (!collections.length) return null;
  return (
    <section
      aria-labelledby="community-strip"
      className="mx-auto max-w-[1440px] px-5 pb-8 pt-16 sm:px-8 lg:px-12"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="community-strip" className="text-2xl font-semibold tracking-tight text-stone-900">
            {dict.home.title}
          </h2>
          <p className="mt-1.5 text-sm text-stone-500">{dict.home.desc}</p>
        </div>
        <Link
          href="/comunidad"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#365DC4]"
        >
          {dict.home.cta}
          <span className="button-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {collections.slice(0, 3).map(collection => (
          <BoardCard
            key={collection.id}
            board={{
              id: collection.id,
              name: collection.name,
              count: collection.count,
              covers: collection.covers,
              visibility: collection.visibility,
            }}
            href={`/comunidad/${collection.id}`}
            byline={collection.curator}
            stats={{
              likes: collection.likes,
              saves: collection.saves,
              comments: collection.comments,
            }}
            dict={dict}
          />
        ))}
      </div>
    </section>
  );
}
