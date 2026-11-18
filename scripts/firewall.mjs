// Stages the Vercel WAF custom rules in firewall/rules.json (SHCWS-3) as drafts. It never
// publishes: review with `vercel firewall diff` and publish yourself.
//
//   npm run firewall -- --project shwcs --stage log                # every rule only logs
//   npm run firewall -- --project shwcs --stage enforce            # deny / rate limit for real
//   npm run firewall -- --project shwcs-ops --stage log --cwd ops  # the ops project
//   ... --plan pro            # also the rules that only fit on Pro (more than 3, more than 1 rate limit)
//   ... --scope mxfounders    # team, when the CLI's default scope is another one
//   ... --dry-run             # print the commands, run nothing
//
// A rule that already exists (same name) is edited in place, so running a stage again is
// safe. `log` turns deny and challenge into log and makes rate limits log when exceeded;
// bypass stays bypass, since skipping the bot challenge for machines is never harmful.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const config = JSON.parse(
  readFileSync(fileURLToPath(new URL('../firewall/rules.json', import.meta.url)), 'utf8'),
);

/** The `vercel firewall rules add|edit` arguments for one rule at one stage. */
export function ruleArgs(rule, stage, patterns = config.patterns) {
  const args = [];
  rule.groups.forEach((group, index) => {
    if (index > 0) args.push('--or');
    for (const condition of group) {
      const { pattern, ...rest } = condition;
      const value = pattern ? patterns[pattern] : rest.value;
      if (pattern && value === undefined) throw new Error(`Unknown pattern ${pattern}`);
      args.push(
        '--condition',
        JSON.stringify({ ...rest, ...(value === undefined ? {} : { value }) }),
      );
    }
  });
  const log = stage === 'log';
  if (rule.action === 'rate_limit') {
    const limit = rule.rateLimit;
    args.push(
      '--action',
      'rate_limit',
      '--rate-limit-window',
      String(limit.window),
      '--rate-limit-requests',
      String(limit.requests),
      ...limit.keys.flatMap(key => ['--rate-limit-keys', key]),
      '--rate-limit-action',
      log ? 'log' : limit.action,
    );
  } else {
    args.push('--action', log && rule.action !== 'bypass' ? 'log' : rule.action);
  }
  if (rule.description) args.push('--description', rule.description);
  return args;
}

/** Every rule name the project already has, read from `rules list --json`. */
function existingNames(vercel) {
  const names = new Set();
  const walk = value => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      if (typeof value.name === 'string' && ('conditionGroup' in value || 'action' in value))
        names.add(value.name);
      Object.values(value).forEach(walk);
    }
  };
  walk(JSON.parse(vercel(['firewall', 'rules', 'list', '--json'])));
  return names;
}

function main() {
  const argv = process.argv.slice(2);
  const option = name => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? undefined : argv[index + 1];
  };
  const project = option('project');
  const stage = option('stage');
  const plan = option('plan') ?? 'hobby';
  const dryRun = argv.includes('--dry-run');
  const rules = config.projects[project];
  if (!rules || !['log', 'enforce'].includes(stage) || !['hobby', 'pro'].includes(plan)) {
    console.error(
      'Usage: npm run firewall -- --project shwcs|shwcs-ops --stage log|enforce [--plan hobby|pro] [--cwd dir] [--scope team] [--dry-run]',
    );
    process.exit(1);
  }
  const global = [
    '--non-interactive',
    ...(option('cwd') ? ['--cwd', option('cwd')] : []),
    ...(option('scope') ? ['--scope', option('scope')] : []),
  ];
  const vercel = args =>
    execFileSync('vercel', [...args, ...global], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  const selected = plan === 'pro' ? [...rules.hobby, ...rules.pro] : rules.hobby;
  const names = dryRun ? new Set() : existingNames(vercel);

  for (const rule of selected) {
    const args = names.has(rule.name)
      ? ['firewall', 'rules', 'edit', rule.name, ...ruleArgs(rule, stage), '--yes']
      : ['firewall', 'rules', 'add', rule.name, ...ruleArgs(rule, stage), '--yes'];
    if (dryRun) {
      console.log(['vercel', ...args, ...global].map(part => JSON.stringify(part)).join(' '));
      continue;
    }
    process.stdout.write(vercel(args));
  }
  // Rules evaluate top to bottom: keep the file's order (bypass first).
  if (!dryRun) {
    selected.forEach((rule, index) =>
      vercel(['firewall', 'rules', 'reorder', rule.name, '--position', String(index + 1), '--yes']),
    );
    process.stdout.write(vercel(['firewall', 'diff']));
  }
  console.log(
    `\nDrafts staged for ${project} (${stage}). Review the diff, then publish yourself:\n  vercel firewall publish --yes${global.length > 1 ? ' ' + global.slice(1).join(' ') : ''}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
