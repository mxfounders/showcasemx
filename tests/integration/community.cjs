// Temporary accounts only. Tests public exposure, revocation and authorization on a local app.
const assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto'),fs=require('node:fs');
if(process.env.RUN_COMMUNITY_INTEGRATION!=='1'){console.log('Set RUN_COMMUNITY_INTEGRATION=1 against a local running app.');process.exit(0);}
const {neon}=require('@neondatabase/serverless'),env=require('dotenv').parse(fs.readFileSync('.env.local'));
const sql=neon(env.NEON_DATABASE_URL||env.DATABASE_URL||env.POSTGRES_URL),origin='http://localhost:3000';
const tag=randomUUID(),emails=[0,1].map(i=>`community-${i}-${tag}@example.invalid`),accounts=[],sessions=[],list=randomUUID(),project=randomUUID();
const secretPurpose='Private-purpose-'+tag,secretNote='Private-note-'+tag,secretDraft='Private-draft-'+tag;
const publicFields={visibility:'public',categories:['Finanzas','Cobros'],publicDescription:'Selección pública de prueba',curatorName:'Comunidad de prueba',publishConfirmed:true};
async function post(route,data,who=0){return fetch(origin+route,{method:'POST',headers:{origin,'content-type':'application/json',...(sessions[who]?{cookie:sessions[who]}:{})},body:JSON.stringify(data)});}
async function action(data,status=200,who=0){const r=await post('/api/library',data,who);assert.equal(r.status,status,JSON.stringify(data.action));return r.json();}
(async()=>{try{
 for(const email of emails){assert.equal((await post('/api/auth/register',{email,password:'Community temporary password'},-1)).status,200);const login=await post('/api/auth/login',{email,password:'Community temporary password'},-1);assert.equal(login.status,200);sessions.push(login.headers.get('set-cookie').split(';')[0]);accounts.push((await sql`SELECT id FROM auth_accounts WHERE email=${email}`)[0].id);}
 const data={name:'Public-project-'+tag,kind:'Software',category:'Finanzas',problem:'Approved public context',audience:'Finance',website:'https://example.invalid',contactEmail:emails[0]};
 await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status) VALUES(${project},${accounts[0]},${JSON.stringify({...data,name:secretDraft})}::jsonb,${JSON.stringify(data)}::jsonb,'published')`;
 await action({action:'create-list',id:list,name:'Community-'+tag,purpose:secretPurpose});
 await action({action:'save',projectKey:'solution:'+project});
 await action({action:'add-to-list',projectKey:'solution:'+project,listId:list});
 await action({action:'update-note',projectKey:'solution:'+project,listId:list,note:secretNote,version:0});
 assert.equal((await sql`SELECT visibility FROM buyer_lists WHERE id=${list}`)[0].visibility,'private');
 assert.equal((await fetch(origin+'/comunidad/'+list)).status,404);
 let html=await (await fetch(origin+'/comunidad?q='+encodeURIComponent(tag))).text();assert.ok(!html.includes(list));
 await action({action:'update-list',listId:list,version:0,name:'Community-'+tag,purpose:secretPurpose,...publicFields,publishConfirmed:false},400);
 await action({action:'update-list',listId:list,version:0,name:'Community-'+tag,purpose:secretPurpose,...publicFields},409,1);
 await action({action:'update-list',listId:list,version:0,name:'Community-'+tag,purpose:secretPurpose,...publicFields});
 await action({action:'update-list',listId:list,version:0,name:'Overwrite',purpose:'',...publicFields},409);
 let response=await fetch(origin+'/comunidad/'+list);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store|private/);html=await response.text();
 for(const secret of [secretPurpose,secretNote,secretDraft,...emails,accounts[0]])assert.ok(!html.includes(secret),'public HTML/RSC leaks '+secret);
 assert.ok(html.includes(data.name));assert.ok(html.includes(publicFields.curatorName));
 html=await (await fetch(origin+'/comunidad?category=Cobros&q='+tag)).text();assert.ok(html.includes(list));assert.ok(!html.includes(secretPurpose));
 html=await (await fetch(origin+'/comunidad?category=Legal&q='+tag)).text();assert.ok(!html.includes(list));
 // Only current published projects appear; library membership alone is not public evidence.
 await sql`UPDATE founder_solutions SET published_data=NULL WHERE id=${project}`;
 html=await (await fetch(origin+'/comunidad/'+list)).text();assert.ok(!html.includes(data.name));assert.ok(!html.includes(secretDraft));
 await action({action:'update-list',listId:list,version:1,name:'Community-'+tag,purpose:secretPurpose,...publicFields,visibility:'private',publishConfirmed:false});
 assert.equal((await fetch(origin+'/comunidad/'+list)).status,404);
 html=await (await fetch(origin+'/comunidad?q='+tag)).text();assert.ok(!html.includes(list));
 assert.equal((await sql`SELECT note FROM buyer_list_items WHERE list_id=${list}`)[0].note,secretNote);
 await action({action:'delete-list',listId:list},404,1);
 await action({action:'delete-list',listId:list});
 assert.equal((await fetch(origin+'/comunidad/'+list)).status,404);
 console.log('PASS: private defaults, consent, owner isolation, version conflicts, public category/search, zero private HTML/RSC fields, withdrawn projects, privacy revocation and deletion.');
 }catch(error){console.error(error instanceof assert.AssertionError?error.message:'Integration failed: '+String(error.code||error.name));process.exitCode=1;}
 finally{await sql`DELETE FROM founder_solutions WHERE id=${project}`;await sql`DELETE FROM auth_accounts WHERE email=ANY(${emails})`;const hash=value=>createHash('sha256').update(value).digest('hex');await sql`DELETE FROM auth_rate_limits WHERE key=ANY(${[...emails.map(e=>'email:'+hash(e)),...accounts.map(id=>'library:'+hash(id))]})`;console.log('Temporary community fixtures removed.');}
})();
