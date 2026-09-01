// Opt-in: only creates temporary accounts and deletes all their data in finally.
const assert=require('node:assert/strict'),fs=require('fs'),{randomUUID,createHash}=require('crypto');
if(process.env.RUN_MEDIA_INTEGRATION!=='1'){console.log('Set RUN_MEDIA_INTEGRATION=1 with the local app running.');process.exit(0);}
const {neon}=require('@neondatabase/serverless'),sharp=require('sharp'),e=require('dotenv').parse(fs.readFileSync('.env.local'));
const sql=neon(e.NEON_DATABASE_URL||e.DATABASE_URL||e.POSTGRES_URL),origin='http://localhost:3000',tag=randomUUID(),password='Temporary media testing phrase';
const emails=['media-owner','media-other','media-reviewer'].map(name=>name+'-'+tag+'@example.invalid'),accounts=[],cookies=[],solution=randomUUID(),foreign=randomUUID();
const request=(route,method='GET',data,who=0,rawType)=>fetch(origin+route,{method,headers:{origin,...(who>=0&&cookies[who]?{cookie:cookies[who]}:{}),...(data!==undefined?{'content-type':rawType||'application/json'}:{})},...(data!==undefined?{body:rawType?data:JSON.stringify(data)}:{})});
async function status(response,expected){const r=await response;assert.equal(r.status,expected,`${r.url} expected ${expected}, got ${r.status}`);return r;}
async function page(route,who=0){return (await status(request(route,'GET',undefined,who),200)).text();}
async function upload(id,who=0){const r=await status(request(`/api/solutions/${id}/media`,'POST',await sharp({create:{width:960,height:540,channels:3,background:'#E4EBFC'}}).png().toBuffer(),who,'image/png'),200);return (await r.json()).asset.id;}
(async()=>{try{
 for(const email of emails){await status(request('/api/auth/register','POST',{email,password},-1),200);const login=await status(request('/api/auth/login','POST',{email,password},-1),200);cookies.push(login.headers.get('set-cookie').split(';')[0]);const [account]=await sql`SELECT id FROM auth_accounts WHERE email=${email}`;accounts.push(account.id);}
 await sql`INSERT INTO solution_reviewers(account_id) VALUES(${accounts[2]})`;
 await sql`UPDATE auth_accounts SET name='Media Owner Test',profile='founder' WHERE id=${accounts[0]}`;
 for(const [id,who] of [[solution,0],[foreign,1]])await status(request('/api/solutions','POST',{id},who),200);
 const base='/api/solutions/'+solution,media=base+'/media';
 await status(request(media,'GET',undefined,-1),401);await status(request(media,'GET',undefined,1),404);
 await status(request(media,'POST',Buffer.from('x'),1,'image/png'),404);
 await status(request(media,'POST',Buffer.from('<svg/>'),0,'image/svg+xml'),415);
 await status(request(media,'POST',Buffer.from('not an image'),0,'image/png'),400);
 await status(request(media,'POST',Buffer.alloc(2*1024*1024+1),0,'image/png'),413);
 const first=await upload(solution),other=await upload(foreign,1),asset=media+'/'+first;
 await status(request(asset,'GET',undefined,-1),404);await status(request(asset,'GET',undefined,1),404);await status(request(asset,'GET',undefined,2),404);
 const raw=await status(request(asset),200);assert.equal(raw.headers.get('content-type'),'image/webp');assert.equal(raw.headers.get('cache-control'),'private, no-store');assert.equal((await sharp(Buffer.from(await raw.arrayBuffer())).metadata()).format,'webp');
 let data={name:'Media project '+tag,kind:'Software',category:'Cobros',problem:'Public solution for accounts receivable and collections.',audience:'Equipos financieros',website:'https://example.com',contactEmail:emails[0],founders:[{name:'Public Founder',role:'Founder',bio:'Public biography',links:[{label:'LinkedIn',url:'https://www.linkedin.com/in/example'}]}],projectLinks:[{label:'GitHub',url:'https://github.com/example'}],notFor:'No incluye nómina.',demoUrl:'https://example.com/demo',screenshots:[{id:first,caption:'Pantalla inicial de cobros'}]},version=0;
 async function patch(action,expected=200,who=0,extras={}){const r=await status(request(base,'PATCH',{action,version,step:3,data,...extras},who),expected);const result=await r.json();if(expected===200)version=result.version;return result;}
 await patch('save',409,0,{data:{...data,screenshots:[{id:other,caption:'Foreign media'}]}});
 await patch('save',400,0,{question:'forged'});await patch('save',400,0,{question:'identity'});
 await patch('save',200,0,{step:1,question:'founders'});const [position]=await sql`SELECT editor_question FROM founder_solutions WHERE id=${solution}`;assert.equal(position.editor_question,'founders');await status(request(asset,'DELETE'),409);
 const preview=await page('/account/solutions/'+solution+'/preview');assert.ok(preview.includes('Vista previa privada'));assert.ok(preview.includes(data.notFor));
 await status(request('/account/solutions/'+solution+'/preview','GET',undefined,1),404);
 await patch('submit');await status(request(asset,'GET',undefined,2),200);await status(request(asset,'GET',undefined,-1),404);
 await status(request(media,'POST',Buffer.from('x'),0,'image/png'),409);
 await patch('review',403,1,{decision:'published',message:'Información revisada para prueba.'});
 await patch('review',200,2,{decision:'published',message:'Información revisada para prueba.'});
 await status(request(asset,'GET',undefined,-1),200);
 const publicPage=await page('/soluciones/'+solution,-1);assert.ok(publicPage.includes('Pantalla inicial de cobros'));assert.ok(publicPage.includes('Ver demo o recorrido'));assert.ok(publicPage.includes('Public Founder'));assert.ok(publicPage.includes('https://github.com/example')); assert.ok(!publicPage.includes(emails[0]));
 const [dated]=await sql`SELECT published_at FROM founder_solutions WHERE id=${solution}`;assert.ok(dated.published_at);
 const replacement=await upload(solution);
 await status(request(media+'/'+replacement,'GET',undefined,2),404); // unsubmitted upload stays private even for reviewer
 data={...data,problem:'PRIVATE REVISION SECRET to check approved snapshot isolation',screenshots:[{id:replacement,caption:'Nueva pantalla en revisión'}]};
 await patch('save');await status(request(media+'/'+replacement,'GET',undefined,-1),404);await status(request(asset,'DELETE'),409);
 assert.ok(!(await page('/soluciones/'+solution,-1)).includes('PRIVATE REVISION SECRET'));
 // A buyer board must use the approved cover, not an unpublished replacement.
 const board=randomUUID();
 for(const payload of [{action:'save',projectKey:'solution:'+solution},{action:'create-list',id:board,name:'Private visual board '+tag,purpose:''},{action:'add-to-list',listId:board,projectKey:'solution:'+solution}])await status(request('/api/library','POST',payload,1),200);
 for(const route of ['/account/lists','/account/lists/'+board,'/account/saved']){const html=await page(route,1);assert.ok(html.includes(asset));assert.ok(!html.includes(replacement));assert.ok(!html.includes('PRIVATE REVISION SECRET'));}
 assert.ok(!(await page('/account/lists',0)).includes('Private visual board '+tag));
 await status(request('/account/lists/'+board,'GET',undefined,0),404);

 await patch('submit');await patch('review',200,2,{decision:'published',message:'Actualización revisada para prueba.'});
 await status(request(media+'/'+replacement,'GET',undefined,-1),200);await status(request(asset,'GET',undefined,-1),404);await status(request(asset,'DELETE'),200);
 const disposable=await upload(solution);
 const race=await Promise.all([request(base,'PATCH',{action:'save',version,step:3,data:{...data,screenshots:[{id:disposable,caption:'Concurrent screenshot'}]}}),request(media+'/'+disposable,'DELETE')]);
 assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 const [saved]=await sql`SELECT data,version FROM founder_solutions WHERE id=${solution}`;version=saved.version;data=saved.data;
 for(const image of data.screenshots)assert.equal((await sql`SELECT id FROM solution_media WHERE id=${image.id}`).length,1);
 const library=await (await status(request(media),200)).json();assert.ok(library.assets.every(a=>a.content_base64===undefined));
 // A preference changes presentation, never account identity, profile, or reviewer privileges.
 assert.ok((await page('/account')).includes('Tus proyectos'));
 await status(request('/api/account/dashboard','POST',{mode:'admin'}),400);
 await status(request('/api/account/dashboard','POST',{mode:'buyer',owner_id:accounts[1],profile:'reviewer'}),200);
 let home=await page('/account');assert.ok(home.includes('Tus listas'));assert.ok(!home.includes('Tus proyectos'));
 const [profile]=await sql`SELECT profile,dashboard_mode FROM auth_accounts WHERE id=${accounts[0]}`;assert.equal(profile.profile,'founder');assert.equal(profile.dashboard_mode,'buyer');
 const [untouched]=await sql`SELECT dashboard_mode FROM auth_accounts WHERE id=${accounts[1]}`;assert.equal(untouched.dashboard_mode,null);assert.equal((await sql`SELECT account_id FROM solution_reviewers WHERE account_id=${accounts[0]}`).length,0);
 await status(request('/api/account/dashboard','POST',{mode:'both'}),200);home=await page('/account');assert.ok(home.includes('Tus listas'));assert.ok(home.includes('Tus proyectos'));assert.ok(!home.includes(emails[1]));
 assert.ok(!(await page('/account',1)).includes(data.name));
 assert.ok((await page('/account/solutions')).includes(data.name));
 console.log('PASS: media decoding/limits, owner-only upload/library, reviewer scope, private preview, approved-only public assets, publication date, protected deletion, foreign asset rejection, concurrent save/delete safety; adaptive dashboard persistence, profile/permissions separation and account privacy.');
}catch(error){console.log(error instanceof assert.AssertionError?error.stack:'Integration failed (connection details omitted).');process.exitCode=1;}
finally{await sql`DELETE FROM auth_accounts WHERE email=ANY(${emails})`;const keys=[...emails.map(v=>'email:'+createHash('sha256').update(v).digest('hex')),...accounts.flatMap(v=>['solution-media','dashboard-mode','library'].map(scope=>scope+':'+createHash('sha256').update(v).digest('hex')))];await sql`DELETE FROM auth_rate_limits WHERE key=ANY(${keys})`;console.log('Cleaned temporary media accounts and their cascading data.');}})();
