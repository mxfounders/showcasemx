import { timingSafeEqual } from 'node:crypto';
export function authorizedCron(value:string|null){const expected=process.env.CRON_SECRET;if(!expected||expected.length<32||!value)return false;const a=Buffer.from(value),b=Buffer.from(`Bearer ${expected}`);return a.length===b.length&&timingSafeEqual(a,b);}
