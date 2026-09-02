require('dotenv').config({path:'.env.local',quiet:true});

async function main(){
  const key=process.env.RESEND_API_KEY;
  const from=process.env.AUTH_EMAIL_FROM||'';
  const match=from.match(/@([^>\s]+)>?$/);
  if(!key||!match)throw new Error('Missing RESEND_API_KEY or valid AUTH_EMAIL_FROM.');
  const response=await fetch('https://api.resend.com/domains',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(`Resend rejected the configured key (HTTP ${response.status}).`);
  const body=await response.json();
  const domains=Array.isArray(body.data)?body.data:[];
  const domain=domains.find(item=>item.name===match[1]);
  if(!domain||domain.status!=='verified')throw new Error('The AUTH_EMAIL_FROM domain is not verified in Resend.');
  console.log('OK Resend key accepted and sender domain verified.');
}
main().catch(error=>{console.error(`PENDING ${error.message}`);process.exitCode=1;});
