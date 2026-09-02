const fs = require('node:fs');
const { randomBytes } = require('node:crypto');

const path = '.env.local';
let source = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const created = [];
for (const name of ['CRON_SECRET', 'NEWSLETTER_UNSUBSCRIBE_SECRET']) {
  const present = new RegExp(`^${name}=.+$`, 'm').test(source);
  if (present) continue;
  if (source && !source.endsWith('\n')) source += '\n';
  source += `${name}=${randomBytes(32).toString('hex')}\n`;
  created.push(name);
}
fs.writeFileSync(path, source, { mode: 0o600 });
console.log(created.length ? `Created ${created.join(' and ')} in .env.local without printing their values.` : 'Local secrets already configured; nothing changed.');
