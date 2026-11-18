import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EyeIcon, EyeOffIcon, LockIcon } from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import { isUuid } from '@/lib/http';
import { briefsAvailable, getBrief, shortlistCandidates } from '@/lib/data/briefs';
import { param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DescriptionList } from '@/components/ui/DescriptionList';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Field';
import { SearchField } from '@/components/ui/SearchField';
import { ActionButton } from '@/components/actions/ActionButton';
import { ShortlistComposer } from './ShortlistComposer';

export const metadata: Metadata = { title: 'Necesidad' };

/**
 * One buyer brief (SHCWS-60): what the buyer asked for, which listings it reached, who
 * proposed and when (never what), and the team's two actions: hide it, or send the buyer
 * a short list. Both are audited in the same statement (ops/src/app/api/briefs).
 */
export default async function NecesidadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const { id } = await params;
  if (!isUuid(id) || !(await briefsAvailable())) notFound();
  const brief = await getBrief(id);
  if (!brief) notFound();
  const query = param(await searchParams, 'buscar');
  const open = !brief.hiddenAt && !brief.closedAt;
  const expired = new Date(brief.expiresAt) <= new Date();
  const candidates =
    open && !brief.shortlist ? await shortlistCandidates(brief.id, brief.buyer.id, query) : [];

  return (
    <>
      <PageHeader
        back={{ href: '/panel/necesidades', label: 'Necesidades' }}
        title="Necesidad"
        description={
          <>
            Publicada <RelativeTime value={brief.createdAt} /> por{' '}
            <Link
              href={`/panel/cuentas/${brief.buyer.id}`}
              className="text-accent-fg hover:underline"
            >
              {brief.buyer.name || brief.buyer.email}
            </Link>
            {brief.buyer.verified ? '' : ' (correo sin confirmar)'}.
          </>
        }
        meta={
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
            <LockIcon aria-hidden className="size-3.5" /> El comprador autorizó que el equipo la lea
            ({brief.consentVersion}). Las propuestas y conversaciones siguen privadas.
          </span>
        }
        actions={
          brief.hiddenAt ? (
            <ActionButton
              label="Volver a mostrar"
              icon={<EyeIcon />}
              endpoint="/api/briefs"
              payload={{ action: 'unhide', id: brief.id }}
              confirm={{
                title: 'Volver a mostrar la necesidad',
                description: 'Los fundadores que encajan la vuelven a ver en su cuenta.',
              }}
              success="Necesidad visible"
            />
          ) : (
            <ActionButton
              label="Ocultar"
              icon={<EyeOffIcon />}
              tone="danger"
              endpoint="/api/briefs"
              payload={{ action: 'hide', id: brief.id }}
              confirm={{
                title: 'Ocultar la necesidad',
                description:
                  'Los fundadores dejan de verla y no reciben más propuestas. El comprador ve que la ocultó el equipo y el motivo que escribas.',
                destructive: true,
                fieldLabel: 'Motivo (lo ve el comprador)',
                templates: [
                  'Publicidad o spam: no describe una necesidad real.',
                  'Incluye datos de contacto o de terceros que no deben publicarse.',
                  'No es una necesidad B2B que el catálogo pueda atender.',
                ],
              }}
              success="Necesidad oculta"
            />
          )
        }
      />
      {brief.hiddenAt && (
        <Alert tone="terracotta" className="mb-6" title="Oculta">
          {brief.hiddenReason} {brief.hiddenBy ? `— ${brief.hiddenBy}` : ''}
        </Alert>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Lo que pidió" />
            <CardBody>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
                {brief.problem}
              </p>
              <DescriptionList
                className="mt-6"
                items={[
                  { label: 'Categorías', value: brief.categories.join(', ') },
                  {
                    label: 'Capacidades',
                    value: brief.capabilities.length ? brief.capabilities.join(', ') : null,
                  },
                  { label: 'Tamaño', value: brief.companySize },
                  { label: 'Industria', value: brief.industry },
                  { label: 'País', value: brief.country },
                  { label: 'Plazo', value: brief.timeline },
                  { label: 'Presupuesto', value: brief.budget || null },
                  {
                    label: 'Estado',
                    value: brief.hiddenAt
                      ? 'Oculta'
                      : brief.closedAt
                        ? 'Cerrada por el comprador'
                        : expired
                          ? 'Vencida'
                          : 'Abierta',
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Lista corta"
              description="Hasta tres fichas publicadas y una nota. El comprador la ve en su cuenta y recibe un correo; los proyectos sugeridos no reciben aviso. Una por necesidad."
            />
            <CardBody>
              {brief.shortlist ? (
                <div className="space-y-3 text-sm">
                  <p className="text-[13px] text-muted">
                    Enviada <RelativeTime value={brief.shortlist.createdAt} />
                    {brief.shortlist.createdBy ? ` por ${brief.shortlist.createdBy}` : ''}.
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {brief.shortlist.listings.map(listing => (
                      <li key={listing.id}>
                        <Link href={`/panel/postulaciones/${listing.id}`}>
                          <Badge tone="blue">{listing.name ?? 'Ficha eliminada'}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3.5 text-fg-2">
                    {brief.shortlist.note}
                  </p>
                </div>
              ) : !open ? (
                <p className="text-[13px] text-muted">
                  {brief.hiddenAt
                    ? 'Vuelve a mostrarla para enviar una lista corta.'
                    : 'El comprador la cerró: ya no se le envía una lista corta.'}
                </p>
              ) : (
                <div className="space-y-4">
                  <SearchField name="buscar" placeholder="Buscar fichas publicadas por nombre" />
                  <ShortlistComposer briefId={brief.id} options={candidates} />
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={`Llegó a ${brief.matches.length} fichas`}
              description="Fichas publicadas que encajan por categoría, capacidades, industria y tamaño."
            />
            <CardBody>
              {brief.matches.length === 0 ? (
                <p className="text-[13px] text-muted">
                  Ninguna ficha publicada encaja todavía. Una lista corta es la forma de atenderla.
                </p>
              ) : (
                <ul className="space-y-2 text-[13.5px]">
                  {brief.matches.map(match => (
                    <li key={match.solutionId} className="flex justify-between gap-3">
                      <Link
                        href={`/panel/postulaciones/${match.solutionId}`}
                        className="truncate text-fg hover:underline"
                      >
                        {match.name ?? 'Ficha retirada'}
                      </Link>
                      <span className="shrink-0 text-muted">
                        <RelativeTime value={match.matchedAt} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title={`Propuestas (${brief.proposals.length})`}
              description="Quién propuso y cuándo. El contenido es del fundador para el comprador: ops no lo lee."
            />
            <CardBody>
              {brief.proposals.length === 0 ? (
                <p className="text-[13px] text-muted">Sin propuestas todavía.</p>
              ) : (
                <ul className="space-y-2 text-[13.5px]">
                  {brief.proposals.map(proposal => (
                    <li key={proposal.solutionId} className="flex justify-between gap-3">
                      <span className="truncate text-fg">{proposal.name ?? 'Ficha eliminada'}</span>
                      <span className="shrink-0 text-muted">
                        {proposal.chosenAt ? (
                          <Badge tone="sage">Elegida</Badge>
                        ) : (
                          <RelativeTime value={proposal.createdAt} />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
