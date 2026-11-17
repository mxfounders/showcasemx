// Outage probe for sponsored-slot make-goods (SHCWS-179), run by
// .github/workflows/uptime-probe.yml from outside Vercel: the daily cron cannot notice an
// outage, because it runs on the deployment that is down.
//
//   node scripts/outage-probe.mjs <state.json>
//
// Each run checks PROBE_URL once (three tries, 20 s apart, so a single blip is not an
// outage). The first failing run remembers when the site went down; the first run that
// finds it back closes the window at that moment and reports it to REPORT_URL with
// OUTAGE_WEBHOOK_SECRET. A report that cannot be delivered stays in the state file and is
// sent again on the next run, with the same incident id and the same window: the time the
// site came back is fixed when it was seen, so a late report never stretches the outage.
// The state file is carried between runs by the Actions cache. Nothing here decides a
// make-good or a refund; shwcs does, from the windows it receives.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const statePath = process.argv[2] ?? '.outage-probe/state.json';
const probeUrl = process.env.PROBE_URL || 'https://shwcs.site/api/health';
const reportUrl = process.env.REPORT_URL || 'https://shwcs.site/api/internal/outages';
const secret = process.env.OUTAGE_WEBHOOK_SECRET ?? '';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function readState() {
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    return {
      downSince: typeof state.downSince === 'string' ? state.downSince : null,
      pending: Array.isArray(state.pending) ? state.pending : [],
    };
  } catch {
    return { downSince: null, pending: [] };
  }
}

async function siteIsUp() {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(20_000);
    try {
      const response = await fetch(probeUrl, {
        cache: 'no-store',
        headers: { 'User-Agent': 'shwcs-outage-probe/1.0' },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) return true;
    } catch {
      // Timeout or network error: try again.
    }
  }
  return false;
}

async function report(window) {
  try {
    const response = await fetch(reportUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'github',
        incident: window.startedAt,
        startedAt: window.startedAt,
        endedAt: window.endedAt,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    // 400: shwcs refused this window for good (too old, malformed); retrying cannot help.
    if (response.ok || response.status === 400) {
      console.log(`Reported ${window.startedAt} → ${window.endedAt}: HTTP ${response.status}`);
      return true;
    }
    console.log(`Report not accepted yet: HTTP ${response.status}`);
  } catch (error) {
    console.log(`Report failed: ${error instanceof Error ? error.name : 'error'}`);
  }
  return false;
}

const state = await readState();
const now = new Date().toISOString();
const up = await siteIsUp();

if (!up) {
  state.downSince ??= now;
  console.log(`${probeUrl} is down (since ${state.downSince}).`);
} else if (state.downSince) {
  state.pending.push({ startedAt: state.downSince, endedAt: now });
  state.downSince = null;
  console.log(`${probeUrl} is back.`);
}

if (up && state.pending.length) {
  if (!secret) console.log('OUTAGE_WEBHOOK_SECRET is not set: keeping the report.');
  else {
    const left = [];
    for (const window of state.pending) if (!(await report(window))) left.push(window);
    state.pending = left;
  }
}

await mkdir(dirname(statePath), { recursive: true });
await writeFile(statePath, JSON.stringify(state));
// A report still waiting is worth a red run, so someone looks before it gets old.
process.exit(up && state.pending.length ? 1 : 0);
