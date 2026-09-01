// Opt-in integration test. Creates only temporary accounts and removes all fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),{randomUUID,createHash}=require('node:crypto');
if(process.env.RUN_COMMUNITY_SOCIAL_INTEGRATION!=='1'){console.log('Set RUN_COMMUNITY_SOCIAL_INTEGRATION=1 against a local running app.');process.exit(0);}
const {neon}=require('@neondatabase/serverless'),env=require('dotenv').parse(fs.readFileSync('.env.local'));
const sql=neon(env.NEON_DATABASE_URL||env.DATABASE_URL||env.POSTGRES_URL),origin='http://localhost:3000',tag=randomUUID();
const emails=['owner','reader','intruder'].map(role=>`community-social-${role}-${tag}@example.invalid`),accounts=[],sessions=[],list=randomUUID(),comment=randomUUID();
async function post(route,data,who=-1){return fetch(origin+route,{method:'POST',headers:{origin,'content-type':'application/json',...(who>=0?{cookie:sessions[who]}:{})},body:JSON.stringify(data)});}
async function social(data,status,who){const response=await post('/api/community',data,who),text=await response.text();assert.equal(response.status,status,`${data.action}: ${text}`);return status===200?JSON.parse(text):null;}
(async()=>{try{
 for(const email of emails){assert.equal((await post('/api/auth/register',{email,password:'Temporary community social passphrase'})).status,200);const login=await post('/api/auth/login',{email,password:'Temporary community social passphrase'});assert.equal(login.status,200);sessions.push(login.headers.get('set-cookie').split(';')[0]);accounts.push((await sql`SELECT id FROM auth_accounts WHERE email=${email}`)[0].id);}
 let response=await post('/api/library',{action:'create-list',id:list,name:'Social '+tag,purpose:'private',visibility:'public',categories:['Finanzas'],publicDescription:'Lista para probar interacción real',curatorName:'Curador temporal',publishConfirmed:true},0);assert.equal(response.status,200);
 await social({action:'like',listId:list},409,0);await social({action:'save',listId:list},409,0);
 assert.equal((await post('/api/community',{action:'like',listId:list})).status,401);
 assert.deepEqual(await social({action:'like',listId:list},200,1),{ok:true,active:true,count:1});
 assert.deepEqual(await social({action:'save',listId:list},200,1),{ok:true,active:true,count:1});
 const payload={action:'comment',listId:list,commentId:comment,name:'Alias temporal',comment:'Pregunta pública útil'};
 const created=await social(payload,200,1);assert.equal(created.created,true);const retry=await social(payload,200,1);assert.equal(retry.created,false);
 let counts=(await sql`SELECT (SELECT count(*)::int FROM community_list_likes WHERE list_id=${list}) likes,(SELECT count(*)::int FROM community_saved_lists WHERE list_id=${list}) saves,(SELECT count(*)::int FROM community_list_comments WHERE list_id=${list}) comments`)[0];assert.deepEqual([counts.likes,counts.saves,counts.comments],[1,1,1]);
 let html=await (await fetch(`${origin}/comunidad/${list}`,{headers:{cookie:sessions[1]}})).text();assert.ok(html.includes('Alias temporal'));assert.ok(html.includes('Pregunta pública útil'));assert.ok(!html.includes(emails[1]));
 html=await (await fetch(`${origin}/account/community`,{headers:{cookie:sessions[1]}})).text();assert.ok(html.includes(`/comunidad/${list}`));
 await social({action:'delete-comment',listId:list,commentId:comment},404,2);await social({action:'delete-comment',listId:list,commentId:comment},200,0);
 response=await post('/api/library',{action:'update-list',listId:list,version:0,name:'Social '+tag,purpose:'private',visibility:'private',categories:[],publicDescription:'',curatorName:'',publishConfirmed:false},0);assert.equal(response.status,200);
 assert.equal((await fetch(`${origin}/comunidad/${list}`)).status,404);await social({action:'comment',listId:list,commentId:randomUUID(),name:'No visible',comment:'No debe entrar'},404,1);
 html=await (await fetch(`${origin}/account/community`,{headers:{cookie:sessions[1]}})).text();assert.ok(!html.includes(`/comunidad/${list}`));assert.ok(!html.includes('Social '+tag));
 console.log('PASS: auth, self-interaction protection, atomic toggles, idempotent comments, public alias privacy, curator moderation, saved-list account view and immediate privacy revocation.');
}catch(error){console.error(error instanceof assert.AssertionError?error.stack:'Integration failed (connection details omitted).');process.exitCode=1;}finally{
 await sql`DELETE FROM auth_accounts WHERE email=ANY(${emails})`;const keys=accounts.flatMap(id=>['community','community-comment'].map(scope=>scope+':'+createHash('sha256').update(String(id)).digest('hex')));await sql`DELETE FROM auth_rate_limits WHERE key=ANY(${keys})`;console.log('Temporary social fixtures removed.');
}})();
