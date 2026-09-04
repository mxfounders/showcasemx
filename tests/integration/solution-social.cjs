// Opt-in integration test. Creates only temporary accounts and removes all fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),{randomUUID,createHash}=require('node:crypto');
if(process.env.RUN_SOLUTION_SOCIAL_INTEGRATION!=='1'){console.log('Set RUN_SOLUTION_SOCIAL_INTEGRATION=1 against a local running app.');process.exit(0);}
const {neon}=require('@neondatabase/serverless'),env=require('dotenv').parse(fs.readFileSync('.env.local'));
const sql=neon(env.NEON_DATABASE_URL||env.DATABASE_URL||env.POSTGRES_URL),origin='http://localhost:3000',tag=randomUUID();
const emails=['founder','reader','intruder'].map(role=>`solution-social-${role}-${tag}@example.invalid`),accounts=[],sessions=[],solutionId=randomUUID(),comment=randomUUID();
async function post(route,data,who=-1){return fetch(origin+route,{method:'POST',headers:{origin,'content-type':'application/json',...(who>=0?{cookie:sessions[who]}:{})},body:JSON.stringify(data)});}
async function social(data,status,who){const response=await post('/api/solutions/social',data,who),text=await response.text();assert.equal(response.status,status,`${data.action}: ${text}`);return status===200?JSON.parse(text):null;}
(async()=>{try{
 for(const email of emails){assert.equal((await post('/api/auth/register',{email,password:'Temporary solution social passphrase'})).status,200);const login=await post('/api/auth/login',{email,password:'Temporary solution social passphrase'});assert.equal(login.status,200);sessions.push(login.headers.get('set-cookie').split(';')[0]);accounts.push((await sql`SELECT id FROM auth_accounts WHERE email=${email}`)[0].id);}
 const published={name:'Solution social '+tag,kind:'Software',category:'Cobros',categories:['Cobros'],problem:'Public problem to evaluate',audience:'Equipos financieros',website:'https://example.com',contactEmail:emails[0]};
 await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status) VALUES(${solutionId},${accounts[0]},${JSON.stringify(published)}::jsonb,${JSON.stringify(published)}::jsonb,'published')`;

 // Self-like is blocked, matching the reviewer self-approval guard elsewhere.
 await social({action:'like',solutionId},409,0);
 // Self-comment is blocked too — found missing during Fase 4's review (see
 // CLAUDE.md §55): only the like guard existed before, comment's INSERT had
 // no owner_id<>account.id at all.
 await social({action:'comment',solutionId,commentId:randomUUID(),name:'Fundador',comment:'No debería poder comentar mi propia ficha'},409,0);
 // Anonymous is rejected before touching storage.
 assert.equal((await post('/api/solutions/social',{action:'like',solutionId})).status,401);
 // A reader can like; the toggle is atomic and returns the fresh count.
 assert.deepEqual(await social({action:'like',solutionId},200,1),{ok:true,active:true,count:1});
 assert.deepEqual(await social({action:'like',solutionId},200,1),{ok:true,active:false,count:0});
 assert.deepEqual(await social({action:'like',solutionId},200,1),{ok:true,active:true,count:1});

 // Comments: idempotent by client-supplied id, alias precached from the profile name client-side (server just stores whatever alias is sent).
 const payload={action:'comment',solutionId,commentId:comment,name:'Alias temporal',comment:'Pregunta pública útil'};
 const created=await social(payload,200,1);assert.equal(created.created,true);
 const retry=await social(payload,200,1);assert.equal(retry.created,false);

 let counts=(await sql`SELECT (SELECT count(*)::int FROM solution_likes WHERE solution_id=${solutionId}) likes,(SELECT count(*)::int FROM solution_comments WHERE solution_id=${solutionId}) comments`)[0];
 assert.deepEqual([counts.likes,counts.comments],[1,1]);

 const html=await (await fetch(`${origin}/soluciones/${solutionId}`)).text();
 assert.ok(html.includes('Alias temporal'));assert.ok(html.includes('Pregunta pública útil'));
 assert.ok(!html.includes(emails[1]));assert.ok(!html.includes(emails[0]));

 // The founder who owns the ficha cannot delete a reader's comment — only the author or ops can.
 await social({action:'delete-comment',solutionId,commentId:comment},404,0);
 await social({action:'delete-comment',solutionId,commentId:comment},404,2);
 await social({action:'delete-comment',solutionId,commentId:comment},200,1);

 const after=(await sql`SELECT count(*)::int n FROM solution_comments WHERE solution_id=${solutionId}`)[0];
 assert.equal(after.n,0);

 console.log('PASS: same-origin/session gates, self-like and self-comment blocked, atomic like toggle, idempotent comments, public alias without email, and comment deletion restricted to the author (never the ficha owner).');
}catch(error){console.error(error instanceof assert.AssertionError?error.stack:'Integration failed (connection details omitted).');process.exitCode=1;}finally{
 await sql`DELETE FROM auth_accounts WHERE email=ANY(${emails})`;const keys=accounts.flatMap(id=>['solution-social','solution-comment'].map(scope=>scope+':'+createHash('sha256').update(String(id)).digest('hex')));await sql`DELETE FROM auth_rate_limits WHERE key=ANY(${keys})`;console.log('Temporary social fixtures removed.');
}})();
