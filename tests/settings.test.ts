import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST as change } from '../src/app/api/account/password/route';
import { PUT as avatar, DELETE as removeAvatar } from '../src/app/api/account/avatar/route';
import { POST as reset } from '../src/app/api/auth/reset-password/route';
import { recoveryConfig } from '../src/lib/auth/recovery';
test('settings mutations reject cross origin and unauthenticated callers',async()=>{
 for(const handler of [change,avatar,removeAvatar]){
  assert.equal((await handler(new NextRequest('http://localhost:3000/api/account',{method:'POST',headers:{origin:'https://other.example'}}))).status,403);
  assert.equal((await handler(new NextRequest('http://localhost:3000/api/account',{method:'POST',headers:{origin:'http://localhost:3000'}}))).status,401);
 }
});
test('reset rejects malformed tokens before password work or storage',async()=>{
 const req=new NextRequest('http://localhost:3000/api/auth/reset-password',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({token:'not-a-token',password:'new password',confirm:'new password'})});
 assert.equal((await reset(req)).status,400);
});
test('recovery never trusts request hosts and requires configured HTTPS origin',()=>{
 const old={RESEND_API_KEY:process.env.RESEND_API_KEY,AUTH_EMAIL_FROM:process.env.AUTH_EMAIL_FROM,AUTH_APP_ORIGIN:process.env.AUTH_APP_ORIGIN};
 try{process.env.RESEND_API_KEY='test';process.env.AUTH_EMAIL_FROM='noreply@example.invalid';for(const value of ['http://example.com','https://example.com/path','https://user:pass@example.com','https://example.com?redirect=evil']){process.env.AUTH_APP_ORIGIN=value;assert.equal(recoveryConfig(),null);}process.env.AUTH_APP_ORIGIN='https://example.com';assert.equal(recoveryConfig()?.origin,'https://example.com');}finally{for(const [key,value] of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
