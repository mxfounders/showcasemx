import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { solutionScore,rankingHalfLifeDays } from '../src/lib/solutions/ranking';
import { visitorHash } from '../src/lib/solutions/view-visitor';
import { POST as solutionSocialPost } from '../src/app/api/solutions/social/route';
test('solution ranking weighs comments over saves over likes, then a damped, decayed views signal',()=>{
 // Inputs are already decayed, verified-only sums from public.ts — see
 // rankingHalfLifeDays and the CTEs there — not raw counts.
 assert.equal(solutionScore(0,0,0,0),0);
 assert.equal(solutionScore(1,0,0,0),1);
 assert.equal(solutionScore(0,1,0,0),2);
 assert.equal(solutionScore(0,0,1,0),3);
 assert.equal(solutionScore(0,0,0,10),Math.log1p(10)*0.1);
 assert.equal(solutionScore(2,3,4,10),2+3*2+4*3+Math.log1p(10)*0.1);
 // Diminishing returns: doubling views less than doubles the views term.
 assert.ok(solutionScore(0,0,0,20)<solutionScore(0,0,0,10)*2);
 assert.equal(rankingHalfLifeDays,60);
});
test('view visitor hashing is absent without a secret, and rotates daily so days cannot be correlated',()=>{
 assert.equal(visitorHash('203.0.113.4','2026-09-04'),null);
 process.env.VIEW_HASH_SECRET='test-only-view-hash-secret';
 try{
  const first=visitorHash('203.0.113.4','2026-09-04');
  assert.ok(first);assert.equal(typeof first,'string');
  assert.equal(visitorHash('203.0.113.4','2026-09-04'),first);
  assert.notEqual(visitorHash('203.0.113.4','2026-09-05'),first);
  assert.notEqual(visitorHash('203.0.113.5','2026-09-04'),first);
  assert.doesNotMatch(first!,/203\.0\.113\.4/);
 }finally{delete process.env.VIEW_HASH_SECRET;}
});
test('solution social mutations reject foreign origins and anonymous participation before storage',async()=>{
 const body={action:'like',solutionId:'00000000-0000-4000-8000-000000000001'};
 const foreign=await solutionSocialPost(new NextRequest('https://shwcs.example/api/solutions/social',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal(foreign.status,403);
 const anonymous=await solutionSocialPost(new NextRequest('https://shwcs.example/api/solutions/social',{method:'POST',headers:{origin:'https://shwcs.example','content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal(anonymous.status,401);
});
