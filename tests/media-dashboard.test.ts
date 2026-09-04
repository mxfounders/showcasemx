import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {readSolutionData,solutionErrors,emptySolution} from '../src/lib/solutions/model';
import {solutionChecklist,needsPublicationReview} from '../src/lib/solutions/completeness';
import {isDashboardMode,resolveDashboardMode} from '../src/lib/dashboard/model';
const complete={...emptySolution,name:'Example',kind:'Software',category:'Cobros',problem:'Organiza cuentas por cobrar y facturación.',audience:'Equipos de finanzas',website:'https://example.com',contactEmail:'founder@example.invalid',industries:[] as string[],companySizes:[] as string[]};
test('media metadata rejects foreign shapes, duplicate IDs and excessive captions; old solutions remain valid',()=>{
 const image={id:randomUUID(),caption:'Vista de cobros'};
 assert.deepEqual(readSolutionData({...complete,screenshots:[{...image,owner_id:'forged'}]})?.screenshots,[image]);
 for(const screenshots of [[image,image],[{id:'../private',caption:'A'}],[{...image,caption:3}],[{...image,caption:'x'.repeat(181)}],Array.from({length:5},()=>({...image,id:randomUUID()}))])assert.equal(readSolutionData({...complete,screenshots}),null);
 assert.ok(readSolutionData(complete));assert.ok(readSolutionData({...complete,screenshots:[{...image,caption:''}]}));
 assert.ok(solutionErrors({...complete,screenshots:[{...image,caption:''}]}).screenshots);
 for(const demoUrl of ['javascript:alert(1)','https://u:p@example.com','invalid'])assert.ok(solutionErrors({...complete,demoUrl}).demoUrl);
 assert.equal(readSolutionData({...complete,notFor:'x'.repeat(501)}),null);
});
test('completeness reports information gaps without blocking valid minimal submissions',()=>{
 assert.deepEqual(solutionErrors(complete),{});
 assert.deepEqual(solutionChecklist(complete).filter(x=>x.done).map(x=>x.key),['basics','fit','market']);
 const data={...complete,founders:[{name:'Team',role:'',bio:'',links:[]}],projectLinks:[{label:'Sitio web' as const,url:'https://example.com'}],scope:'Alcance',notFor:'No cubre nómina',screenshots:[{id:randomUUID(),caption:'Vista de cobros'}],demoUrl:'https://example.com/demo',pricing:'A medida',implementation:'Una semana',integrations:'Sin integraciones',support:'Correo',evidence:'Caso público',evidenceUrl:'https://example.com/caso'};
 assert.ok(solutionChecklist(data).every(item=>item.done));
 const now=Date.parse('2026-08-30T12:00:00Z');
 for(const date of [null,undefined,'invalid','2026-01-01'])assert.equal(needsPublicationReview(date,now),true);
 assert.equal(needsPublicationReview(new Date(now-90*86400000).toISOString(),now),false);
 assert.equal(needsPublicationReview(new Date(now-90*86400000-1).toISOString(),now),true);
});
test('dashboard respects explicit preference independently of profile and falls back for existing accounts',()=>{
 assert.equal(resolveDashboardMode('buyer','founder',true),'buyer');
 assert.equal(resolveDashboardMode(null,'both',false),'both');
 assert.equal(resolveDashboardMode(null,'exploring',true),'founder');
 assert.equal(resolveDashboardMode(null,null,false),'buyer');
 for(const mode of ['admin','reviewer','__proto__',null,42])assert.equal(isDashboardMode(mode),false);
});
