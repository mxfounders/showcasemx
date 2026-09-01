import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { readContact,canTransition,contactStatuses,companySizes,timelines,consentVersion } from '../src/lib/contacts/model';
import { comparisonKeys } from '../src/lib/library/model';
import { authReturnTo } from '../src/lib/auth/return-to';
import { POST } from '../src/app/api/contacts/route';
const details={name:'Ana Pérez',company:'Ejemplo SA',size:companySizes[1],timeline:timelines[0],budget:'',need:'Necesitamos ordenar la cobranza de nuestra empresa.'};
test('contact context is bounded and cannot overwrite identity or routing',()=>{
 assert.deepEqual(readContact({...details,buyer_email:'forged@example.com',recipient_id:'other',status:'closed'}),details);
 for(const patch of [{name:' '},{company:''},{size:'fake'},{timeline:'fake'},{need:'corto'},{need:'x'.repeat(2001)},{budget:'x'.repeat(201)},{name:42}])assert.equal(readContact({...details,...patch}),null);
 assert.equal(consentVersion,'contact-v1');
});
test('contact transitions distinguish buyers and recipients and make withdrawal terminal',()=>{
 for(const current of Object.keys(contactStatuses) as (keyof typeof contactStatuses)[]){
  assert.equal(canTransition(current,'conversation','buyer'),false);
  assert.equal(canTransition(current,'closed','buyer'),false);
  assert.equal(canTransition(current,'withdrawn','recipient'),false);
  assert.equal(canTransition('withdrawn',current,'buyer'),false);
  assert.equal(canTransition('withdrawn',current,'recipient'),false);
 }
 assert.equal(canTransition('new','withdrawn','buyer'),true);
 assert.equal(canTransition('conversation','withdrawn','buyer'),true);
 assert.equal(canTransition('closed','withdrawn','buyer'),false);
 assert.equal(canTransition('new','conversation','recipient'),true);
 assert.equal(canTransition('new','closed','recipient'),true);
 assert.equal(canTransition('closed','conversation','recipient'),true);
});
test('comparison selection is limited, unique and constrained to the private list',()=>{
 const keys=['catalog:cord','catalog:flouvia'];
 assert.deepEqual(comparisonKeys(keys,keys),keys);
 for(const value of [keys[0],[],[keys[0]],[keys[0],keys[0]],[...keys,keys[0],keys[1]],['catalog:cord','catalog:fake']])assert.equal(comparisonKeys(value,keys),null);
 assert.equal(comparisonKeys(keys,['catalog:cord']),null);
});
test('contact auth returns only to allowed local request routes',()=>{
 const id='00000000-0000-4000-8000-000000000001';
 assert.equal(authReturnTo('/account/contacts/new?solution='+id),'/account/contacts/new?solution='+id);
 assert.equal(authReturnTo('/account/contacts/'+id),'/account/contacts/'+id);
 for(const value of ['/account/contacts/new?solution=../x','//evil.test/account/contacts','/account/contacts/../settings','/account/opportunities?redirect=https://evil.test'])assert.equal(authReturnTo(value),'/account');
});
test('contact mutation rejects cross-origin and absent sessions',async()=>{
 const url='http://localhost:3000/api/contacts';
 for(const [origin,status] of [['https://evil.test',403],['http://localhost:3000',401]] as const){
 const r=new NextRequest(url,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});
 assert.equal((await POST(r)).status,status);
 }
});
