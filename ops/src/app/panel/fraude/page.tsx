import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ClientsIcon,
  FlagIcon,
  ShieldAlertIcon,
  ShieldIcon,
  UndoIcon,
} from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import {
  FRAUD_WINDOWS,
  fraudBoard,
  type FlagRow,
  type FraudAccountInfo,
  type FraudBoard,
  type FraudTargetInfo,
} from '@/lib/data/fraud';
import type { SignalCode, TargetFinding, TargetSignal } from '@/lib/fraud';
import { deviceLabel } from '@/lib/device';
import { fmtDateTime, fmtDuration, fmtNumber } from '@/lib/format';
import { FRAUD_SIGNAL, INTERACTION_KIND } from '@/lib/labels';
import { choice, hrefWith, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented, Tabs } from '@/components/ui/Tabs';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { ActionButton } from '@/components/actions/ActionButton';

export const metadata: Metadata = { title: 'Fraude' };

const TABS = ['fichas', 'cuentas', 'marcadas'] as const;
const ENDPOINT = '/api/fraud';
const FLAG_TEMPLATES = [
  'Cuentas creadas juntas que solo interactúan con esta ficha.',
  'Ráfaga de interacciones desde cuentas nuevas sin otra actividad.',
  'Correos desechables usados para inflar una ficha.',
];

function SignalBadges({ codes }: { codes: SignalCode[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {codes.map(code => (
        <Badge
          key={code}
          tone={FRAUD_SIGNAL[code]?.tone ?? 'neutral'}
          title={FRAUD_SIGNAL[code]?.hint}
        >
          {FRAUD_SIGNAL[code]?.label ?? code}
        </Badge>
      ))}
    </div>
  );
}

function describe(signal: TargetSignal, total: number): string {
  const n = signal.accountIds.length;
  switch (signal.code) {
    case 'cohort':
      return `${n} cuentas registradas entre ${fmtDateTime(signal.from)} y ${fmtDateTime(signal.to)}`;
    case 'burst': {
      const span = Date.parse(signal.to ?? '') - Date.parse(signal.from ?? '');
      return `${n} cuentas distintas en ${Number.isFinite(span) && span >= 60_000 ? `${Math.round(span / 60_000)} min` : fmtDuration(Math.max(0, span))}, desde ${fmtDateTime(signal.from)}`;
    }
    case 'fresh':
      return `${n} de ${total} cuentas interactuaron en sus primeras horas`;
    case 'shared_ua':
      return `${n} cuentas con la misma cadena (${deviceLabel(signal.userAgent)})`;
  }
}

function FlagButton({
  account,
  signals,
  target,
}: {
  account: FraudAccountInfo;
  signals: SignalCode[];
  target?: TargetFinding;
}) {
  return (
    <ActionButton
      label="Marcar"
      icon={<FlagIcon />}
      tone="danger"
      endpoint={ENDPOINT}
      payload={{
        action: 'flag',
        accountIds: [account.id],
        signals,
        ...(target ? { targetType: target.targetType, targetId: target.targetId } : {}),
      }}
      success="Cuenta marcada como sospechosa"
      confirm={{
        title: `Marcar ${account.email} como sospechosa`,
        description:
          'Su actividad deja de contar en el orden del catálogo, en Top de la semana y en Populares de comunidad. Lo que hizo sigue visible y la persona no recibe aviso. Se puede deshacer.',
        destructive: true,
        confirmLabel: 'Marcar',
        templates: FLAG_TEMPLATES,
      }}
    />
  );
}

function UnflagButton({ accountId, email }: { accountId: string; email: string | null }) {
  return (
    <ActionButton
      label="Quitar marca"
      icon={<UndoIcon />}
      endpoint={ENDPOINT}
      payload={{ action: 'unflag', accountId }}
      success="Marca retirada"
      confirm={{
        title: `Quitar la marca${email ? ` de ${email}` : ''}`,
        description: 'Su actividad vuelve a contar en el orden.',
        confirmLabel: 'Quitar marca',
      }}
    />
  );
}

function AccountCell({ account }: { account: FraudAccountInfo }) {
  return (
    <>
      <Link
        href={`/panel/cuentas/${account.id}`}
        className="font-medium text-fg hover:text-accent-fg"
      >
        {account.email}
      </Link>
      <div className="mt-1 flex flex-wrap gap-1">
        {account.verified ? (
          <Badge tone="sage">Verificada</Badge>
        ) : (
          <Badge title="Su actividad ya no cuenta en el orden.">Sin verificar</Badge>
        )}
        {account.suspended && <Badge tone="terracotta">Suspendida</Badge>}
        {account.isOps && <Badge tone="blue">Ops</Badge>}
        {account.flaggedAt && (
          <Badge tone="terracotta" icon={ShieldAlertIcon}>
            Marcada
          </Badge>
        )}
      </div>
    </>
  );
}

function TargetCard({
  finding,
  data,
  admin,
}: {
  finding: TargetFinding;
  data: FraudBoard;
  admin: boolean;
}) {
  const target = data.targets[finding.key];
  const codesOf = (accountId: string): SignalCode[] => {
    const own = data.report.accounts.find(a => a.accountId === accountId)?.signals ?? [];
    const here = finding.signals.filter(s => s.accountIds.includes(accountId)).map(s => s.code);
    return [
      ...new Set<SignalCode>([
        ...here,
        ...own.filter(c => c === 'disposable' || c === 'automated_ua'),
      ]),
    ];
  };
  // In sign-up order, so accounts born together read as a block.
  const suspects = finding.suspectAccountIds
    .filter(id => data.accounts[id])
    .sort((a, b) => data.accounts[a].createdAt.localeCompare(data.accounts[b].createdAt));
  const unflagged = suspects.filter(id => !data.accounts[id].flaggedAt);
  const codes = [...new Set(finding.signals.map(s => s.code))];
  return (
    <Card>
      <CardHeader
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta">
            <ShieldAlertIcon aria-hidden className="size-4" />
          </span>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {target ? (
              <Link href={target.href} className="hover:text-accent-fg">
                {target.name}
              </Link>
            ) : (
              '(eliminada)'
            )}
            <Badge>{finding.targetType === 'solution' ? 'Ficha' : 'Lista'}</Badge>
            {target && !target.live && (
              <Badge tone="amber">
                {finding.targetType === 'solution' ? 'No publicada' : 'Privada'}
              </Badge>
            )}
          </span>
        }
        description={`${fmtNumber(finding.accountCount)} cuentas y ${fmtNumber(finding.interactionCount)} interacciones en ${data.days} días`}
        action={
          admin && unflagged.length > 0 && data.available ? (
            <ActionButton
              label={`Neutralizar ${unflagged.length} ${unflagged.length === 1 ? 'cuenta' : 'cuentas'}`}
              icon={<FlagIcon />}
              tone="danger"
              endpoint={ENDPOINT}
              payload={{
                action: 'flag',
                accountIds: unflagged,
                signals: codes,
                targetType: finding.targetType,
                targetId: finding.targetId,
              }}
              success="Cuentas marcadas como sospechosas"
              confirm={{
                title: `Marcar ${unflagged.length} ${unflagged.length === 1 ? 'cuenta' : 'cuentas'} como sospechosas`,
                description:
                  'Su actividad deja de contar en el orden del catálogo, en Top de la semana y en Populares de comunidad, aquí y en cualquier otra ficha o lista. Lo que hicieron sigue visible y nadie recibe aviso. Revisa la lista antes: una ráfaga legítima (un lanzamiento compartido) se ve igual.',
                destructive: true,
                confirmLabel: 'Marcar cuentas',
                templates: FLAG_TEMPLATES,
              }}
            />
          ) : undefined
        }
      />
      <CardBody className="space-y-4 pt-0">
        <ul className="space-y-1.5">
          {finding.signals.map((signal, index) => (
            <li
              key={`${signal.code}-${index}`}
              className="flex flex-wrap items-center gap-2 text-[13px] text-fg-2"
            >
              <Badge
                tone={FRAUD_SIGNAL[signal.code]?.tone ?? 'neutral'}
                title={FRAUD_SIGNAL[signal.code]?.hint}
              >
                {FRAUD_SIGNAL[signal.code]?.label ?? signal.code}
              </Badge>
              {describe(signal, finding.accountCount)}
            </li>
          ))}
        </ul>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-2 text-2xs font-semibold uppercase tracking-[0.07em] text-muted">
              <tr>
                <th className="px-3 py-2">Cuenta</th>
                <th className="px-3 py-2">Registrada</th>
                <th className="px-3 py-2">Hizo aquí</th>
                <th className="px-3 py-2">Señales</th>
                {admin && data.available && <th className="px-3 py-2 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {suspects.map(id => {
                const account = data.accounts[id];
                return (
                  <tr key={id}>
                    <td className="px-3 py-2">
                      <AccountCell account={account} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                      {fmtDateTime(account.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {(finding.kinds[id] ?? [])
                        .map(kind => INTERACTION_KIND[kind] ?? kind)
                        .join(', ')}
                    </td>
                    <td className="px-3 py-2">
                      <SignalBadges codes={codesOf(id)} />
                    </td>
                    {admin && data.available && (
                      <td className="px-3 py-2 text-right">
                        {account.flaggedAt ? (
                          <UnflagButton accountId={id} email={account.email} />
                        ) : (
                          <FlagButton account={account} signals={codesOf(id)} target={finding} />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function SignalLegend() {
  return (
    <Card>
      <CardHeader
        title="Cómo leer las señales"
        description="Salen de datos que el producto ya guarda: fecha de registro, dominio del correo, navegador de sus sesiones y hora de cada interacción. Sin IP. Los guardados de fichas no entran: qué guardó cada persona es privado también para ops, aunque dejan de contar al marcar la cuenta."
      />
      <CardBody>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {Object.entries(FRAUD_SIGNAL).map(([code, signal]) => (
            <div key={code}>
              <dt>
                <Badge tone={signal.tone}>{signal.label}</Badge>
              </dt>
              <dd className="mt-1 text-[13px] text-muted">{signal.hint}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

function FlagsTable({
  rows,
  admin,
  history,
}: {
  rows: FlagRow[];
  admin: boolean;
  history?: boolean;
}) {
  return (
    <Table label={history ? 'Marcas retiradas' : 'Cuentas marcadas'}>
      <THead>
        <TH>Cuenta</TH>
        <TH>Motivo</TH>
        <TH>Señales</TH>
        <TH>Marcada</TH>
        {history ? <TH>Retirada</TH> : admin && <TH align="right">Acción</TH>}
      </THead>
      <TBody>
        {rows.length === 0 ? (
          <EmptyRow colSpan={5}>
            <p className="py-6 text-center text-[13px] text-muted">
              {history ? 'Ninguna marca se ha retirado.' : 'No hay cuentas marcadas.'}
            </p>
          </EmptyRow>
        ) : (
          rows.map(row => (
            <TR key={row.id}>
              <TD>
                {row.email ? (
                  <Link
                    href={`/panel/cuentas/${row.accountId}`}
                    className="font-medium text-fg hover:text-accent-fg"
                  >
                    {row.email}
                  </Link>
                ) : (
                  <span className="text-muted">(cuenta eliminada)</span>
                )}
                {row.target && (
                  <p className="text-[12px] text-muted">
                    Desde{' '}
                    <Link href={row.target.href} className="hover:text-accent-fg">
                      {row.target.name}
                    </Link>
                  </p>
                )}
              </TD>
              <TD className="max-w-md whitespace-pre-line text-fg-2">{row.reason}</TD>
              <TD>
                <SignalBadges codes={row.signals} />
              </TD>
              <TD className="text-muted">
                <RelativeTime value={row.flaggedAt} />
                {row.flaggedBy && <p className="text-[12px]">{row.flaggedBy}</p>}
              </TD>
              {history ? (
                <TD className="text-muted">
                  <RelativeTime value={row.clearedAt} />
                  {row.clearedBy && <p className="text-[12px]">{row.clearedBy}</p>}
                  {row.clearedReason && (
                    <p className="mt-1 text-[12px] text-fg-2">{row.clearedReason}</p>
                  )}
                </TD>
              ) : (
                admin && (
                  <TD align="right">
                    <UnflagButton accountId={row.accountId} email={row.email} />
                  </TD>
                )
              )}
            </TR>
          ))
        )}
      </TBody>
    </Table>
  );
}

export default async function FraudePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireOps();
  const params = await searchParams;
  const tab = choice(params, 'tab', TABS, 'fichas');
  const window = choice(params, 'dias', FRAUD_WINDOWS, '30');
  const data = await fraudBoard(window);
  const admin = user.level === 'admin';
  const { report } = data;
  const unflaggedSuspects = report.accounts.filter(
    a => !data.accounts[a.accountId]?.flaggedAt,
  ).length;

  return (
    <>
      <PageHeader
        title="Interacciones sospechosas"
        description="Señales de multicuentas en me gusta, reseñas y comentarios de fichas y listas. Son motivos para mirar, no veredictos. Marcar una cuenta hace que su actividad deje de contar en el orden; lo que hizo sigue visible. Nada de esto se muestra en el producto."
        actions={
          <Segmented
            label="Periodo"
            items={FRAUD_WINDOWS.map(key => ({
              label: `${key} días`,
              href: hrefWith('/panel/fraude', params, { dias: key === '30' ? null : key }),
              active: window === key,
            }))}
          />
        }
      />

      {!data.available && (
        <Alert tone="amber" title="Falta aplicar db/account-flags.sql" className="mb-5">
          Las señales se calculan, pero no se puede marcar ninguna cuenta hasta aplicar la
          migración.
        </Alert>
      )}
      {data.truncated && (
        <Alert tone="amber" className="mb-5">
          Solo se revisaron las {fmtNumber(data.totals.interactions)} interacciones más recientes
          del periodo. Elige un periodo más corto para verlo completo.
        </Alert>
      )}

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Fichas y listas con señales"
          value={report.targets.length}
          tone="attention"
          icon={<ShieldAlertIcon aria-hidden className="size-4" />}
        />
        <Stat
          label="Cuentas con señales"
          value={report.accounts.length}
          hint={`${fmtNumber(unflaggedSuspects)} sin marcar`}
          icon={<ClientsIcon aria-hidden className="size-4" />}
        />
        <Stat
          label="Cuentas marcadas"
          value={data.flags.length}
          hint="Su actividad no cuenta en el orden"
          icon={<FlagIcon aria-hidden className="size-4" />}
        />
        <Stat
          label="Interacciones revisadas"
          value={data.totals.interactions}
          hint={`${fmtNumber(data.totals.accounts)} cuentas en ${fmtNumber(data.totals.targets)} fichas y listas, ${data.days} días`}
          icon={<ShieldIcon aria-hidden className="size-4" />}
        />
      </section>

      <div className="mb-5">
        <Tabs
          label="Vistas"
          items={[
            {
              label: 'Fichas y listas',
              href: hrefWith('/panel/fraude', params, { tab: null }),
              active: tab === 'fichas',
              count: report.targets.length,
            },
            {
              label: 'Cuentas',
              href: hrefWith('/panel/fraude', params, { tab: 'cuentas' }),
              active: tab === 'cuentas',
              count: report.accounts.length,
            },
            {
              label: 'Marcadas',
              href: hrefWith('/panel/fraude', params, { tab: 'marcadas' }),
              active: tab === 'marcadas',
              count: data.flags.length,
            },
          ]}
        />
      </div>

      {tab === 'fichas' && (
        <div className="space-y-6">
          {report.targets.length === 0 ? (
            <EmptyState
              icon={ShieldIcon}
              title="Sin señales en este periodo"
              description="Ninguna ficha ni lista reúne cuentas creadas juntas, ráfagas, cuentas recién creadas o un mismo navegador repetido."
            />
          ) : (
            report.targets
              .slice(0, 50)
              .map(finding => (
                <TargetCard key={finding.key} finding={finding} data={data} admin={admin} />
              ))
          )}
          <SignalLegend />
        </div>
      )}

      {tab === 'cuentas' && (
        <Table label="Cuentas con señales">
          <THead>
            <TH>Cuenta</TH>
            <TH>Señales</TH>
            <TH align="right">Peso</TH>
            <TH align="right">Interacciones</TH>
            <TH>Dónde</TH>
            <TH>Navegadores</TH>
            {admin && data.available && <TH align="right">Acción</TH>}
          </THead>
          <TBody>
            {report.accounts.length === 0 ? (
              <EmptyRow colSpan={7}>
                <EmptyState
                  compact
                  icon={ClientsIcon}
                  title="Ninguna cuenta con señales en este periodo"
                />
              </EmptyRow>
            ) : (
              report.accounts.slice(0, 200).map(finding => {
                const account = data.accounts[finding.accountId];
                if (!account) return null;
                const places = (finding.suspectOn.length ? finding.suspectOn : finding.targetKeys)
                  .map(key => data.targets[key])
                  .filter((place): place is FraudTargetInfo => Boolean(place));
                return (
                  <TR key={finding.accountId} highlight={!account.flaggedAt && finding.score >= 5}>
                    <TD>
                      <AccountCell account={account} />
                      <p className="mt-1 text-[12px] text-muted">
                        Registrada {fmtDateTime(account.createdAt)}
                      </p>
                    </TD>
                    <TD>
                      <SignalBadges codes={finding.signals} />
                    </TD>
                    <TD align="right">{finding.score}</TD>
                    <TD align="right">{fmtNumber(finding.interactionCount)}</TD>
                    <TD className="text-[12.5px]">
                      {places.slice(0, 3).map(place => (
                        <Link
                          key={place.key}
                          href={place.href}
                          className="block truncate hover:text-accent-fg"
                        >
                          {place.name}
                        </Link>
                      ))}
                      {places.length > 3 && (
                        <span className="text-muted">y {places.length - 3} más</span>
                      )}
                    </TD>
                    <TD className="text-[12.5px] text-muted">
                      {account.devices.join(', ') || '—'}
                    </TD>
                    {admin && data.available && (
                      <TD align="right">
                        {account.flaggedAt ? (
                          <UnflagButton accountId={account.id} email={account.email} />
                        ) : (
                          <FlagButton account={account} signals={finding.signals} />
                        )}
                      </TD>
                    )}
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      )}

      {tab === 'marcadas' && (
        <div className="space-y-6">
          <FlagsTable rows={data.flags} admin={admin} />
          <Card>
            <CardHeader
              title="Marcas retiradas"
              description="Las 50 más recientes. Cada marca y su retiro también están en la bitácora."
            />
            <CardBody>
              <FlagsTable rows={data.history} admin={admin} history />
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
