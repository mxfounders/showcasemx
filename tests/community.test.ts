import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { listPublicationDetails } from '../src/lib/library/model';
import { communityComment,communityScore,communityReport,escapeLikeTerm } from '../src/lib/library/community-model';
import { POST as communityPost } from '../src/app/api/community/route';
test('publication is opt-in; legacy inputs and private metadata never become public copy',()=>{
 assert.deepEqual(listPublicationDetails({purpose:'Confidential budget',note:'Private note'}),{visibility:'private',categories:[],publicDescription:'',curatorName:''});
 const valid={visibility:'public',categories:['Finanzas','Finanzas','Cobros'],publicDescription:' Para equipos ',curatorName:' Alias ',publishConfirmed:true};
 assert.deepEqual(listPublicationDetails(valid),{visibility:'public',categories:['Finanzas','Cobros'],publicDescription:'Para equipos',curatorName:'Alias'});
 for(const override of [{publishConfirmed:false},{publishConfirmed:'true'},{categories:[]},{categories:['Unknown']},{categories:'Finanzas'},{curatorName:' '},{curatorName:'a'.repeat(61)},{publicDescription:'a'.repeat(401)},{visibility:'unlisted'}])assert.equal(listPublicationDetails({...valid,...override}),null);
 assert.equal(listPublicationDetails({...valid,visibility:'private',publishConfirmed:false})?.visibility,'private');
});
test('community ranking is explicit and interaction counts are weighted consistently',()=>{
 assert.equal(communityScore(0,0,0),0);
 assert.equal(communityScore(2,3,4),20);
});
test('public comments trim content and enforce the public limits',()=>{
 assert.deepEqual(communityComment({name:'  André  ',comment:'  Buena selección.  '}),{name:'André',comment:'Buena selección.'});
 for(const input of [null,{}, {name:'',comment:'hola'},{name:'a'.repeat(61),comment:'hola'},{name:'André',comment:''},{name:'André',comment:'a'.repeat(501)}])assert.equal(communityComment(input),null);
});
test('community reports require a known reason and enough context, trimmed',()=>{
 assert.deepEqual(communityReport({reason:'spam',details:'  Enlaces a otra tienda no relacionada.  '}),{reason:'spam',details:'Enlaces a otra tienda no relacionada.'});
 for(const input of [null,{},{reason:'spam',details:'corto'},{reason:'other',details:'a'.repeat(2001)},{reason:'unknown',details:'Suficiente contexto aquí.'},{reason:123,details:'Suficiente contexto aquí.'}])assert.equal(communityReport(input),null);
});
test('escapeLikeTerm neutralizes LIKE wildcards so a search term matches itself literally',()=>{
 assert.equal(escapeLikeTerm('50% off'),'50\\% off');
 assert.equal(escapeLikeTerm('a_b'),'a\\_b');
 assert.equal(escapeLikeTerm('back\\slash'),'back\\\\slash');
 assert.equal(escapeLikeTerm('nomina'),'nomina');
});
test('community mutations reject foreign origins and anonymous participation before storage',async()=>{
 const body={action:'like',listId:'00000000-0000-4000-8000-000000000001'};
 const foreign=await communityPost(new NextRequest('https://shwcs.example/api/community',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal(foreign.status,403);
 const anonymous=await communityPost(new NextRequest('https://shwcs.example/api/community',{method:'POST',headers:{origin:'https://shwcs.example','content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal(anonymous.status,401);
});
