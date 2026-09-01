// Read-only preflight. Values/tokens are never printed. Not an external delivery test.
require('dotenv').config({path:'.env.local',quiet:true});
const fs=require('node:fs');
let originReady=false;try{const url=new URL(process.env.AUTH_APP_ORIGIN||'');originReady=url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash;}catch{}
const checks={database:!!(process.env.NEON_DATABASE_URL||process.env.DATABASE_URL||process.env.POSTGRES_URL),email:originReady&&['RESEND_API_KEY','AUTH_EMAIL_FROM'].every(k=>!!process.env[k]),google:originReady&&['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'].every(k=>!!process.env[k]),cron:!!process.env.CRON_SECRET&&process.env.CRON_SECRET.length>=32,verifiedContactGate:process.env.AUTH_REQUIRE_VERIFIED_EMAIL==='true',productionProject:fs.existsSync('.vercel/project.json'),legalReview:process.env.LAUNCH_LEGAL_REVIEWED==='true'};
for(const [name,ready] of Object.entries(checks))console.log(`${ready?'OK':'PENDING'} ${name}`);
console.log('Also verify provider delivery, OAuth callback, migrations, reviewer assignments, cron cadence and production smoke tests.');
if(Object.values(checks).some(value=>!value))process.exitCode=1;
