// Opt-in integration test. Uses only newly created @example.invalid accounts and deletes them.
const assert=require('node:assert/strict'),fs=require('fs'),{randomUUID,createHash}=require('crypto'),path=require('path');
if(process.env.RUN_CONTACT_INTEGRATION!=='1'){console.log('Set RUN_CONTACT_INTEGRATION=1 to test the running local app and configured database.');process.exit(0);}
const root=process.cwd(),{neon}=require(root+'/node_modules/@neondatabase/serverless'),env=require(root+'/node_modules/dotenv').parse(fs.readFileSync(path.join(root,'.env.local')));
const sql=neon(env.NEON_DATABASE_URL||env.DATABASE_URL||env.POSTGRES_URL,{fetchOptions:{cache:'no-store'}});
const origin='http://localhost:3000',tag=randomUUID(),emails=['contact-buyer','contact-founder','contact-intruder'].map(role=>role+'-'+tag+'@example.invalid'),password='Temporary contact test passphrase';
const accounts=[],sessions=[],solution=randomUUID(),second=randomUUID(),draft=randomUUID(),list=randomUUID();
async function post(route,data,who=0){return fetch(origin+route,{method:'POST',headers:{origin,'content-type':'application/json',...(sessions[who]?{cookie:sessions[who]}:{})},body:JSON.stringify(data)});}
async function page(route,who=0){const response=await fetch(origin+route,{headers:{cookie:sessions[who]}});return {status:response.status,html:await response.text()};}
async function action(data,status=200,who=0){const response=await post('/api/contacts',data,who);assert.equal(response.status,status,JSON.stringify({action:data.action,status:data.status}));return response.json();}
(async()=>{try{
 for(const email of emails){assert.equal((await post('/api/auth/register',{email,password},-1)).status,200);const login=await post('/api/auth/login',{email,password},-1);assert.equal(login.status,200);sessions.push(login.headers.get('set-cookie').split(';')[0]);const [a]=await sql`SELECT id FROM auth_accounts WHERE email=${email}`;accounts.push(a.id);}
 const published={name:'Integration project '+tag,kind:'Software',category:'Cobros',categories:['Cobros','Finanzas'],problem:'Public problem to evaluate',audience:'Equipos financieros',website:'https://example.com',contactEmail:emails[1],scope:'Public scope',pricing:'Public price',implementation:'Dos semanas',integrations:'API',support:'Correo',evidence:'Demo',evidenceUrl:'https://example.com/demo'};
 for(const id of [solution,second])await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status) VALUES(${id},${accounts[1]},${JSON.stringify({...published,problem:'PRIVATE DRAFT SECRET'})}::jsonb,${JSON.stringify(published)}::jsonb,'published')`;
 await sql`INSERT INTO founder_solutions(id,owner_id,data,status) VALUES(${draft},${accounts[1]},'{}'::jsonb,'draft')`;
 for(const key of ['catalog:cord','catalog:flouvia','solution:'+solution])assert.equal((await post('/api/library',{action:'save',projectKey:key})).status,200);
 assert.equal((await post('/api/library',{action:'create-list',id:list,name:'PRIVATE LIST '+tag,purpose:'Private purchasing plan'})).status,200);
 for(const key of ['catalog:cord','catalog:flouvia','solution:'+solution])assert.equal((await post('/api/library',{action:'add-to-list',listId:list,projectKey:key})).status,200);
 assert.equal((await post('/api/library',{action:'update-note',listId:list,projectKey:'solution:'+solution,note:'PRIVATE BUYER NOTE',version:0})).status,200);
 const compare='/account/lists/'+list+'/compare?'+new URLSearchParams([['project','catalog:cord'],['project','solution:'+solution]]);
 const comparison=await page(compare);assert.equal(comparison.status,200);assert.ok(comparison.html.includes('Public price'));assert.ok(comparison.html.includes('PRIVATE BUYER NOTE'));assert.ok(!comparison.html.includes('PRIVATE DRAFT SECRET'));assert.ok(!comparison.html.includes(emails[1]));
 const unauthorizedComparison=await page(compare,1);assert.equal(unauthorizedComparison.status,404);assert.ok(!unauthorizedComparison.html.includes('PRIVATE BUYER NOTE'));
 const data={action:'create',id:randomUUID(),solutionId:solution,recipientId:accounts[1],name:'Buyer Test',company:'Buyer Company',size:'2–10 personas',timeline:'Este mes',need:'PRIVATE CONTACT NEED for testing scoped access',budget:'1000 MXN al mes',consent:true,consentVersion:'contact-v1',buyer_email:'forged@example.invalid'};
 await action({...data,consent:false},400);await action({...data,consentVersion:'old'},400);await action({...data,recipientId:accounts[2]},409);await action({...data,solutionId:draft},404);await action(data,400,1);
 const request=await action(data);assert.ok(request.id);
 const duplicate=await action({...data,id:randomUUID()});assert.equal(duplicate.id,request.id);
 const concurrent=await Promise.all([action({...data,id:randomUUID(),solutionId:second}),action({...data,id:randomUUID(),solutionId:second})]);assert.equal(concurrent[0].id,concurrent[1].id);
 const [stored]=await sql`SELECT * FROM contact_requests WHERE id=${request.id}`;assert.equal(stored.buyer_id,accounts[0]);assert.equal(stored.recipient_id,accounts[1]);assert.equal(stored.buyer_email,emails[0]);assert.equal(stored.details.buyer_email,undefined);assert.equal(stored.consent_version,'contact-v1');
 assert.equal((await sql`SELECT * FROM contact_events WHERE request_id=${request.id}`).length,1);
 for(const who of [0,1]){const p=await page('/account/contacts/'+request.id,who);assert.equal(p.status,200);assert.ok(p.html.includes(data.need));assert.ok(!p.html.includes('PRIVATE BUYER NOTE'));assert.ok(!p.html.includes('PRIVATE DRAFT SECRET'));}
 assert.equal((await page('/account/opportunities/'+request.id,0)).status,404);assert.equal((await page('/account/opportunities/'+request.id,1)).status,200);assert.equal((await page('/account/opportunities/'+request.id,2)).status,404);
 const hidden=await page('/account/contacts/'+request.id,2);assert.equal(hidden.status,404);assert.ok(!hidden.html.includes(data.need));
 assert.ok((await page('/account/opportunities',1)).html.includes(published.name));assert.ok(!(await page('/account/opportunities',2)).html.includes(published.name));
 const update={action:'update',id:request.id,status:'conversation',version:0,message:'Podemos revisar tu caso en una demo.'};
 await action(update,404,2);await action(update,409,0);await action({...update,message:'breve'},400,1);await action(update,200,1);await action(update,409,1);
 assert.ok((await page('/account/contacts/'+request.id)).html.includes(update.message));
 await action({...update,status:'closed',version:1,message:'Cerramos porque el alcance no encaja.'},200,1);
 await action({...update,version:2,message:'Reabrimos para revisar otro alcance.'},200,1);
 const race=await Promise.all([post('/api/contacts',{...update,version:3,status:'closed',message:'Cierre concurrente del proyecto.'},1),post('/api/contacts',{...update,version:3,status:'withdrawn',message:''},0)]);
 assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 const [after]=await sql`SELECT status,version FROM contact_requests WHERE id=${request.id}`;
 if(after.status==='closed'){await action({...update,version:after.version,message:'Reabrimos para probar el retiro.'},200,1);await action({...update,status:'withdrawn',version:after.version+1,message:''},200,0);}
 const [withdrawn]=await sql`SELECT status,version FROM contact_requests WHERE id=${request.id}`;
 assert.equal(withdrawn.status,'withdrawn');await action({...update,version:withdrawn.version},409,1);
 await sql`UPDATE founder_solutions SET published_data=NULL WHERE id=${solution}`;
 assert.equal((await page('/account/contacts/'+request.id)).status,200);
 await action({...data,id:randomUUID()},404);
 const events=await sql`SELECT * FROM contact_events WHERE request_id=${request.id}`;assert.equal(events.length,withdrawn.version+1);
 console.log('PASS: comparison ownership/current approved fields/private notes; consent, trusted identity/recipient, unpublished and self-contact rejection; deduplication/concurrent create; inbox/detail privacy; response, closure, reopen, stale versions, concurrent withdrawal, immutable terminal state and atomic history.');
}catch(error){console.log(error instanceof assert.AssertionError?error.stack:'Integration failed (connection details omitted).');process.exitCode=1;}
finally{await sql`DELETE FROM auth_accounts WHERE email=ANY(${emails})`;const rateKeys=[...emails.map(email=>'email:'+createHash('sha256').update(email).digest('hex')),...accounts.flatMap(id=>['library','contact-create','contact-update'].map(scope=>scope+':'+createHash('sha256').update(id).digest('hex')))];await sql`DELETE FROM auth_rate_limits WHERE key=ANY(${rateKeys})`;console.log('Cleaned only temporary integration accounts and their cascading data.');}})();
