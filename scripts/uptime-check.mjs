// External uptime probe (SHCWS-6), run every 15 minutes by .github/workflows/uptime.yml
// from outside Vercel, so it still speaks when a deployment is disabled (402).
//
//   node scripts/uptime-check.mjs                      # production URLs
//   node scripts/uptime-check.mjs https://example.test # any URLs, e.g. to test the alert
//
// A URL is down when it fails twice in a row, 60 s apart (UPTIME_RETRY_MS overrides):
// HTTP 4xx/5xx (402 included), a network error or no answer within 15 s. Redirects count
// as up (ops' /login may redirect). Writes `down` and `report` to $GITHUB_OUTPUT when run
// in Actions and exits 1 while something is down, which also makes GitHub email the
// workflow's owner.
import { appendFileSync } from 'node:fs';

const defaults = ['https://shwcs.site/api/health', 'https://ops.shwcs.site/login'];
const urls = process.argv.slice(2).filter(Boolean);
const targets = urls.length ? urls : defaults;
const retryMs = Number(process.env.UPTIME_RETRY_MS ?? 60_000);

async function probe(url) {
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      cache: 'no-store',
      headers: { 'user-agent': 'shwcs-uptime/1.0' },
      signal: AbortSignal.timeout(15_000),
    });
    return response.status < 400 ? null : `HTTP ${response.status}`;
  } catch (error) {
    return error?.name === 'TimeoutError' ? 'sin respuesta en 15 s' : 'error de red';
  }
}

const first = await Promise.all(targets.map(probe));
const suspects = targets.filter((_, index) => first[index]);
if (suspects.length) await new Promise(resolve => setTimeout(resolve, retryMs));
const second = await Promise.all(suspects.map(probe));
const down = suspects
  .map((url, index) => ({ url, reason: second[index] }))
  .filter(item => item.reason);

const when = new Date().toISOString();
const report = down.length
  ? [
      `El vigía externo detectó una caída (${when}). Cada URL falló dos veces seguidas, con ${Math.round(retryMs / 1000)} s de diferencia:`,
      '',
      ...down.map(item => `- ${item.url}: ${item.reason}`),
      '',
      'Revisa el estado del proyecto en Vercel (un 402 suele ser DEPLOYMENT_DISABLED) y Neon.',
    ].join('\n')
  : `Todo responde (${when}): ${targets.join(', ')}`;
console.log(report);

if (process.env.GITHUB_OUTPUT) {
  const delimiter = `REPORT_${Date.now()}`;
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `down=${down.length ? 'true' : 'false'}\nreport<<${delimiter}\n${report}\n${delimiter}\n`,
  );
}
if (down.length) process.exitCode = 1;
