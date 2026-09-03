import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { solutionScore } from '../src/lib/solutions/ranking';
import { POST as solutionSocialPost } from '../src/app/api/solutions/social/route';
test('solution ranking weighs comments over saves over likes, then a small views signal',()=>{
 assert.equal(solutionScore(0,0,0,0),0);
 assert.equal(solutionScore(1,0,0,0),1);
 assert.equal(solutionScore(0,1,0,0),2);
 assert.equal(solutionScore(0,0,1,0),3);
 assert.equal(solutionScore(0,0,0,10),1);
 assert.equal(solutionScore(2,3,4,10),2+3*2+4*3+10*0.1);
});
test('solution social mutations reject foreign origins and anonymous participation before storage',async()=>{
 const body={action:'like',solutionId:'00000000-0000-4000-8000-000000000001'};
 const foreign=await solutionSocialPost(new NextRequest('https://shwcs.example/api/solutions/social',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal(foreign.status,403);
 const anonymous=await solutionSocialPost(new NextRequest('https://shwcs.example/api/solutions/social',{method:'POST',headers:{origin:'https://shwcs.example','content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal(anonymous.status,401);
});
