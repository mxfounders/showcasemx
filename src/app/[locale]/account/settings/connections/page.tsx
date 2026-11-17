import { requireFounder, solutionsSql } from '@/lib/solutions/server';
import { googleConfig } from '@/lib/auth/google';
import { GoogleConnection } from '@/components/settings/google-connection';
import { AssistantTokens, type AssistantTokenView } from '@/components/settings/assistant-tokens';
import { ArrowRightIcon, SparklesIcon } from '@/components/icons/gota';
import Link from '@/i18n/navigation';
import { listTokens, type TokenEvent } from '@/lib/assistant/tokens';
import { mcpEndpoint } from '@/lib/assistant/endpoint';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export default async function Connections(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ google?: string }>;
}) {
  const searchParams = await props.searchParams;
  const dictionary = await getDictionary((await props.params).locale);
  const dict = dictionary.settings.connections;
  const card = dictionary.assistant.card;
  const account = await requireFounder(),
    sql = solutionsSql();
  const [identity] =
    await sql`SELECT email FROM auth_google_identities WHERE account_id=${account.id}`;
  // The assistant's tokens are their own query: if it fails, Google still shows.
  let tokens: AssistantTokenView[] = [],
    events: TokenEvent[] = [],
    twoStep = false,
    tokensFailed = false;
  try {
    const [listed, [row]] = await Promise.all([
      listTokens(account.id),
      sql`SELECT totp_confirmed_at FROM auth_accounts WHERE id=${account.id}`,
    ]);
    tokens = listed.tokens.map(token => ({
      id: token.id,
      name: token.name,
      hint: token.hint,
      status: token.status,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
    }));
    events = listed.events;
    twoStep = Boolean(row?.totp_confirmed_at);
  } catch {
    tokensFailed = true;
  }
  const when = (value: string) =>
    new Date(value).toLocaleString(dictionary.settings.dateLocale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  return (
    <section className="space-y-6">
      {searchParams.google === 'error' && (
        <p
          role="alert"
          className="rounded-2xl border border-[#E8C9BE] bg-[#FBF0EC] px-5 py-4 text-sm text-[#A94E35]"
        >
          {dict.linkError}
        </p>
      )}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-medium text-stone-900">Google</h2>
        <p className="mb-6 text-sm leading-relaxed text-stone-500">{dict.googleDesc}</p>
        <GoogleConnection
          linked={!!identity}
          email={identity ? String(identity.email) : undefined}
          available={!!googleConfig()}
          dict={dict.google}
        />
      </div>

      <div
        id="asistentes"
        className="scroll-mt-24 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-medium text-stone-900">
              <SparklesIcon aria-hidden="true" className="size-5 text-[#365DC4]" />
              {card.title}
            </h2>
            <p className="text-sm leading-relaxed text-stone-500">{card.description}</p>
          </div>
          <Link
            href="/account/settings/connections/assistant"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#365DC4] hover:underline"
          >
            {card.guide}
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </Link>
        </div>
        {tokensFailed ? (
          <p role="alert" className="text-sm text-[#A94E35]">
            {card.loadError}
          </p>
        ) : (
          <AssistantTokens
            tokens={tokens}
            twoStep={twoStep}
            mcpUrl={await mcpEndpoint()}
            dict={card}
            dateLocale={dictionary.settings.dateLocale}
          />
        )}
      </div>

      {!tokensFailed && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-medium text-stone-900">{card.activity.title}</h2>
          <p className="mb-5 max-w-xl text-sm leading-relaxed text-stone-500">
            {card.activity.description}
          </p>
          {events.length ? (
            <div
              className="-mx-1 overflow-x-auto px-1"
              tabIndex={0}
              role="region"
              aria-label={card.activity.title}
            >
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs text-stone-500">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      {card.activity.when}
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      {card.activity.token}
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      {card.activity.action}
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      {card.activity.solution}
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      {card.activity.result}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {events.map(event => (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap py-2.5 pr-4 text-stone-500">
                        {when(event.createdAt)}
                      </td>
                      <td className="py-2.5 pr-4">{event.tokenName}</td>
                      <td className="py-2.5 pr-4">
                        {card.activity.tools[event.tool as keyof typeof card.activity.tools] ??
                          event.tool}
                      </td>
                      <td className="py-2.5 pr-4">
                        {event.solutionName === null
                          ? card.activity.noSolution
                          : event.solutionName || card.activity.unnamed}
                      </td>
                      <td
                        className={`py-2.5 ${event.outcome === 'ok' ? 'text-[#416B50]' : 'text-[#A94E35]'}`}
                      >
                        {event.outcome === 'ok' ? card.activity.ok : card.activity.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-stone-500">{card.activity.empty}</p>
          )}
        </div>
      )}
    </section>
  );
}
