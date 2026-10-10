import type { Metadata } from 'next';
import Link from 'next/link';
import { Bookmark, EyeOff, Flag, Heart, List, MessageSquare, MessagesSquare } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { communityOverview } from '@/lib/data/community';
import { fmtNumber } from '@/lib/format';
import { choice, hrefWith, pageParam, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { SearchField } from '@/components/ui/SearchField';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Stat } from '@/components/ui/Stat';
import { ActionButton } from '@/components/actions/ActionButton';

export const metadata: Metadata = { title: 'Comunidad' };

export default async function ComunidadPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const view = choice(params, 'vista', ['listas', 'comentarios', 'fichas'] as const, 'listas');
  const page = pageParam(params);
  const data = await communityOverview(param(params, 'q'), page);
  const comments = view === 'comentarios' ? data.listComments : data.solutionComments;

  return (
    <>
      <PageHeader
        title="Comunidad"
        description="Listas públicas, comentarios y la actividad social real. Nada se siembra: todo empieza en cero."
      />
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Listas públicas"
          value={data.stats.publicLists}
          icon={<List aria-hidden className="size-4" />}
        />
        <Stat
          label="Comentarios"
          value={data.stats.listComments + data.stats.solutionComments}
          hint={`${fmtNumber(data.stats.listComments)} en listas · ${fmtNumber(data.stats.solutionComments)} en fichas`}
          icon={<MessageSquare aria-hidden className="size-4" />}
        />
        <Stat
          label="Me gusta"
          value={data.stats.listLikes + data.stats.solutionLikes}
          hint={`${fmtNumber(data.stats.solutionLikes)} a fichas`}
          icon={<Heart aria-hidden className="size-4" />}
        />
        <Stat
          label="Listas guardadas"
          value={data.stats.savedLists}
          icon={<Bookmark aria-hidden className="size-4" />}
        />
      </section>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Tabs
          label="Vista"
          items={[
            {
              label: 'Listas públicas',
              href: hrefWith('/panel/comunidad', params, { vista: null }),
              active: view === 'listas',
              icon: List,
            },
            {
              label: 'Comentarios en listas',
              href: hrefWith('/panel/comunidad', params, { vista: 'comentarios' }),
              active: view === 'comentarios',
              icon: MessagesSquare,
            },
            {
              label: 'Comentarios en fichas',
              href: hrefWith('/panel/comunidad', params, { vista: 'fichas' }),
              active: view === 'fichas',
              icon: MessageSquare,
            },
          ]}
        />
        <SearchField placeholder="Buscar listas, firmas o comentarios…" className="lg:w-80" />
      </div>

      {view === 'listas' ? (
        data.lists.items.length === 0 ? (
          <Card>
            <EmptyState
              icon={List}
              title="Sin listas públicas"
              description="Cuando alguien publique una lista aparecerá aquí."
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.lists.items.map(list => (
              <Card key={list.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{list.name}</p>
                    <p className="text-[12.5px] text-muted">
                      Firma «{list.curatorName || 'sin firma'}» ·{' '}
                      <Link
                        href={`/panel/cuentas/${list.ownerId}`}
                        className="hover:text-accent-fg"
                      >
                        {list.ownerEmail}
                      </Link>
                    </p>
                  </div>
                  {list.openReports > 0 && (
                    <Badge tone="terracotta" icon={Flag}>
                      {list.openReports}
                    </Badge>
                  )}
                </div>
                {list.publicDescription && (
                  <p className="mt-2 line-clamp-3 text-[13.5px] text-fg-2">
                    {list.publicDescription}
                  </p>
                )}
                {list.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {list.categories.map(category => (
                      <Badge key={category} tone="lavender">
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <p className="num flex items-center gap-3 text-[12.5px] text-muted">
                    <span>{list.itemCount} proyectos</span>
                    <span className="flex items-center gap-1">
                      <Heart aria-hidden className="size-3.5" />
                      {list.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bookmark aria-hidden className="size-3.5" />
                      {list.saveCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare aria-hidden className="size-3.5" />
                      {list.commentCount}
                    </span>
                    <span>
                      · <RelativeTime value={list.updatedAt} />
                    </span>
                  </p>
                  <ActionButton
                    label="Volver privada"
                    icon={<EyeOff />}
                    tone="ghost"
                    size="xs"
                    endpoint="/api/community"
                    payload={{ action: 'unpublish_list', listId: list.id }}
                    success="La lista ya no es pública"
                    confirm={{
                      title: `Volver privada «${list.name}»`,
                      description:
                        'Su enlace deja de funcionar para otros. Sus notas privadas no se tocan.',
                      destructive: true,
                      confirmLabel: 'Volver privada',
                    }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )
      ) : comments.items.length === 0 ? (
        <Card>
          <EmptyState icon={MessageSquare} title="Sin comentarios" />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {comments.items.map(comment => (
              <li key={comment.id} className="flex gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] text-muted">
                    <span className="font-medium text-fg">{comment.authorName}</span> ·{' '}
                    {comment.authorEmail ?? 'cuenta eliminada'} · en{' '}
                    <Link
                      href={
                        comment.kind === 'solution'
                          ? `/panel/postulaciones/${comment.targetId}?tab=comentarios`
                          : `/panel/comunidad?q=${encodeURIComponent(comment.targetName)}`
                      }
                      className="font-medium text-fg-2 hover:text-accent-fg"
                    >
                      {comment.targetName}
                    </Link>{' '}
                    · <RelativeTime value={comment.createdAt} />
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-fg-2">
                    {comment.body}
                  </p>
                </div>
                <ActionButton
                  label="Borrar"
                  tone="ghost"
                  size="xs"
                  endpoint="/api/community"
                  payload={{
                    action:
                      comment.kind === 'solution' ? 'delete_solution_comment' : 'delete_comment',
                    commentId: comment.id,
                  }}
                  success="Comentario borrado"
                  confirm={{
                    title: 'Borrar este comentario',
                    description:
                      'Se elimina de la vista pública. El texto queda copiado en la bitácora.',
                    destructive: true,
                    confirmLabel: 'Borrar',
                  }}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Pagination
        page={page}
        hasMore={view === 'listas' ? data.lists.hasMore : comments.hasMore}
        hrefFor={target => hrefWith('/panel/comunidad', params, { page: target })}
      />
    </>
  );
}
