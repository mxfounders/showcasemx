import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { validProjectKey,projectKey,listDetails } from '../src/lib/library/model';
import { authReturnTo } from '../src/lib/auth/return-to';
import { previewCategories } from '../src/lib/catalog-preview';
import { GET,POST } from '../src/app/api/library/route';
test('stable project identity across categories excludes examples and arbitrary sites',()=>{
 const keys=previewCategories.flatMap(c=>c.products).map(p=>projectKey(p));
 assert.ok(keys.filter(key=>key==='catalog:flouvia').length>1);
 assert.equal(projectKey({}),null);
 assert.equal(validProjectKey('catalog:example'),false);
 assert.equal(validProjectKey('solution:../draft'),false);
 const id='00000000-0000-4000-8000-000000000001';
 assert.equal(projectKey({detailUrl:'/soluciones/'+id}),'solution:'+id);
 assert.equal(projectKey({catalogId:'cord',detailUrl:'/soluciones/'+id}),'catalog:cord');
});
test('list names and purpose are trimmed and bounded',()=>{
 assert.deepEqual(listDetails({name:' Cobros ',purpose:' Comparar opciones '}),{name:'Cobros',purpose:'Comparar opciones'});
 for(const data of [{name:' ',purpose:''},{name:'x'.repeat(101),purpose:''},{name:'Good',purpose:'x'.repeat(401)},{name:42,purpose:''}])assert.equal(listDetails(data),null);
});
test('save intent survives auth without accepting arbitrary redirects',()=>{
 assert.equal(authReturnTo('/account/saved?project=catalog%3Acord'),'/account/saved?project=catalog%3Acord');
 for(const value of ['https://evil.test','//evil.test','/account/../api/auth/logout','/account/saved?project=catalog:fake'])assert.equal(authReturnTo(value),'/account');
});
test('private library endpoints reject unauthenticated and cross-origin requests',async()=>{
 const url='http://localhost:3000/api/library';
 assert.equal((await GET(new NextRequest(url+'?project=catalog:cord'))).status,401);
 for(const [origin,status] of [['https://evil.test',403],['http://localhost:3000',401]] as const){
 const request=new NextRequest(url,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({action:'save',projectKey:'catalog:cord'})});
 assert.equal((await POST(request)).status,status);
 }
});
