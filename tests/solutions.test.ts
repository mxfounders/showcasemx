import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { emptySolution,getSolutionCategories,readSolutionData,solutionErrors,isSolutionId } from '../src/lib/solutions/model';
import { POST } from '../src/app/api/solutions/route';
import { DELETE,PATCH } from '../src/app/api/solutions/[id]/route';
const full={name:'Test solution',kind:'Software',category:'Cobros',problem:'Ayuda a organizar cobros y facturas pendientes.',audience:'Pequeñas empresas y equipos de finanzas.',website:'https://example.com',contactEmail:'founder@example.com',industries:[] as string[],companySizes:[] as string[]};
test('drafts allow incomplete fields; submissions require complete valid information',()=>{assert.ok(readSolutionData(emptySolution));assert.ok(Object.keys(solutionErrors(emptySolution)).length);assert.deepEqual(solutionErrors(full),{});assert.equal(readSolutionData({...full,kind:'admin'}),null);assert.equal(readSolutionData({...full,problem:'a'.repeat(1501)}),null);for(const website of ['javascript:alert(1)','https://user:password@example.com','invalid'])assert.ok(solutionErrors({...full,website}).website);});
test('client metadata cannot set identity or workflow through solution fields',()=>{assert.deepEqual(readSolutionData({...full,owner_id:'someone',status:'published'}),full);assert.equal(isSolutionId('../other'),false);});
test('solution endpoints require authentication and same origin',async()=>{const id='00000000-0000-4000-8000-000000000001',request=(origin:string,method='POST')=>new NextRequest(`http://localhost:3000/api/solutions/${id}`,{method,headers:{origin,'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify({id})}:{})});assert.equal((await POST(request('https://other.example'))).status,403);assert.equal((await POST(request('http://localhost:3000'))).status,401);assert.equal((await PATCH(request('http://localhost:3000'),{params:Promise.resolve({id})})).status,401);assert.equal((await DELETE(request('https://other.example','DELETE'),{params:Promise.resolve({id})})).status,403);assert.equal((await DELETE(request('http://localhost:3000','DELETE'),{params:Promise.resolve({id})})).status,401);});

test('multiple categories validate, deduplicate and preserve legacy solutions',()=>{
 assert.deepEqual(getSolutionCategories(full),['Cobros']);
 const value=readSolutionData({...full,categories:['Finanzas','Cobros','Finanzas']});
 assert.deepEqual(value?.categories,['Finanzas','Cobros']);assert.equal(value?.category,'Finanzas');
 assert.deepEqual(solutionErrors(value!),{});
 assert.ok(solutionErrors({...full,categories:[]}).category);
 for(const categories of [['unknown'],[1],Array(8).fill('Cobros'),'Cobros'])assert.equal(readSolutionData({...full,categories}),null);
 const {category,...rest}=full;assert.ok(category);assert.deepEqual(readSolutionData({...rest,categories:['Cobros','Ventas']})?.categories,['Cobros','Ventas']);
});

test('decision fields are optional, bounded and evidence links cannot execute scripts',()=>{
 const details={...full,scope:'Incluye configuración inicial.',pricing:'Desde 1000 MXN al mes.',implementation:'Una semana.',integrations:'API disponible.',support:'Correo en horario laboral.',evidence:'Demo pública del producto.',evidenceUrl:'https://example.com/demo'};
 assert.equal(readSolutionData(details)?.pricing,details.pricing);
 assert.deepEqual(solutionErrors(details),{});
 assert.deepEqual(readSolutionData(full),full);
 for(const patch of [{pricing:'x'.repeat(401)},{support:42},{evidence:'x'.repeat(801)},{evidenceUrl:'x'.repeat(501)}])assert.equal(readSolutionData({...details,...patch}),null);
 for(const evidenceUrl of ['javascript:alert(1)','data:text/html,test','https://user:pass@example.com','invalid'])assert.ok(solutionErrors({...details,evidenceUrl}).evidenceUrl);
 assert.deepEqual(solutionErrors({...details,evidenceUrl:''}),{});
});

test('hideSiteImage is a real boolean opt-out, absent by default so no existing ficha changes',()=>{
 assert.equal(readSolutionData(full)?.hideSiteImage,undefined);
 assert.equal(readSolutionData({...full,hideSiteImage:true})?.hideSiteImage,true);
 assert.equal(readSolutionData({...full,hideSiteImage:false})?.hideSiteImage,false);
 for(const value of ['true',1,null])assert.equal(readSolutionData({...full,hideSiteImage:value}),null);
});

test('industries/companySizes are declared fields with a real tri-state: absent, empty (any) or a closed set',()=>{
 const {industries,companySizes,...withoutMarket}=full;
 // Never answered: absent from input stays absent on the record, and submitting is blocked.
 assert.equal(readSolutionData(withoutMarket)?.industries,undefined);
 assert.equal(readSolutionData(withoutMarket)?.companySizes,undefined);
 assert.ok(solutionErrors(withoutMarket).industries);assert.ok(solutionErrors(withoutMarket).companySizes);
 // Declared to fit any: an explicit [] is a real, valid answer and submits cleanly.
 assert.deepEqual(solutionErrors(full),{});
 // Declared to specific values: deduplicated, order-preserving, validated against the closed lists.
 const declared=readSolutionData({...full,industries:['Retail','Agencias','Retail'],companySizes:['pyme','micro']});
 assert.deepEqual(declared?.industries,['Retail','Agencias']);assert.deepEqual(declared?.companySizes,['pyme','micro']);
 assert.deepEqual(solutionErrors({...full,industries:['Retail'],companySizes:['pyme']}),{});
 // Unknown values or the wrong shape reject the whole submission, same as categories.
 for(const industries of [['Marte'],[1],'Retail',Array(8).fill('Retail')])assert.equal(readSolutionData({...full,industries}),null);
 for(const companySizes of [['gigante'],[1],'pyme',Array(5).fill('pyme')])assert.equal(readSolutionData({...full,companySizes}),null);
});
