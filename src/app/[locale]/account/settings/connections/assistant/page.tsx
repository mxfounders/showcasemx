import type { Metadata } from 'next';
import Link from '@/i18n/navigation';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons/gota';
import { requireFounder } from '@/lib/solutions/server';
import { mcpEndpoint } from '@/lib/assistant/endpoint';
import { ASSISTANT_TOOLS } from '@/lib/assistant/tools';
import { actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const dict = await getDictionary((await props.params).locale);
  return { title: `${dict.assistant.guide.metaTitle} | shwcs`, robots: { index: false } };
}

const code =
  'block overflow-x-auto whitespace-pre rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 font-mono text-xs leading-relaxed text-stone-800';

/** «Conecta shwcs a tu asistente» (SHCWS-152): how to add the MCP server to each client. */
export default async function AssistantGuide(props: { params: Promise<{ locale: string }> }) {
  await requireFounder();
  const dict = (await getDictionary((await props.params).locale)).assistant.guide;
  const url = await mcpEndpoint();
  const token = dict.tokenPlaceholder;
  const claudeCode = `claude mcp add --transport http shwcs ${url} \\\n  --header "Authorization: Bearer ${token}"`;
  const desktop = JSON.stringify(
    {
      mcpServers: {
        shwcs: {
          // A pinned version of the bridge; the header goes through an environment variable,
          // which is how mcp-remote documents it (spaces inside arguments break on Windows).
          command: 'npx',
          args: ['-y', 'mcp-remote@0.15.2', url, '--header', 'Authorization:${AUTH_HEADER}'],
          env: { AUTH_HEADER: `Bearer ${token}` },
        },
      },
    },
    null,
    2,
  );
  const cursor = JSON.stringify(
    { mcpServers: { shwcs: { url, headers: { Authorization: `Bearer ${token}` } } } },
    null,
    2,
  );
  const clients = [
    { key: 'claudeCode', snippet: claudeCode },
    { key: 'claudeApp', snippet: desktop },
    { key: 'cursor', snippet: cursor },
    { key: 'chatgpt', snippet: null },
  ] as const;
  return (
    <section className="space-y-6">
      <Link
        href="/account/settings/connections"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#365DC4] hover:underline"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {dict.back}
      </Link>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-stone-900">{dict.title}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-stone-600">{dict.intro}</p>
        <h3 className="mt-8 text-sm font-semibold text-stone-900">{dict.stepsTitle}</h3>
        <ol className="mt-3 max-w-2xl list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-600">
          {dict.steps.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="mt-6 max-w-2xl">
          <p className="text-xs font-semibold text-stone-500">{dict.urlLabel}</p>
          <code className={`mt-2 ${code}`}>{url}</code>
        </div>
        <Link
          href="/account/settings/connections#asistentes"
          style={actionButtonStyle}
          className="action-button mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
        >
          {dict.createToken}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-stone-900">{dict.clientsTitle}</h2>
        <div className="mt-5 space-y-6">
          {clients.map(client => (
            <div key={client.key} className="max-w-2xl">
              <h3 className="text-sm font-semibold text-stone-900">
                {dict.clients[client.key].title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                {dict.clients[client.key].body}
              </p>
              {client.snippet && <code className={`mt-3 ${code}`}>{client.snippet}</code>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-stone-900">{dict.toolsTitle}</h2>
        <dl className="mt-4 max-w-2xl space-y-3 text-sm">
          {ASSISTANT_TOOLS.map(tool => (
            <div key={tool}>
              <dt className="font-mono text-xs font-semibold text-stone-900">{tool}</dt>
              <dd className="mt-0.5 leading-relaxed text-stone-600">{dict.tools[tool]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-stone-900">{dict.safetyTitle}</h2>
        <ul className="mt-4 max-w-2xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-600">
          {dict.safety.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
