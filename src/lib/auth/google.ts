import { createRemoteJWKSet,jwtVerify } from 'jose';
import { randomBytes,createHash } from 'node:crypto';
import { authSql } from './security';
import { hashToken } from './password';
import { authReturnTo } from './return-to';
export const googleCookie='showcasemx_google_state';
export function googleConfig() {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, AUTH_APP_ORIGIN: _origin } = process.env;
  const origin = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : _origin;
  if (!clientId || !clientSecret || !origin) return null;
  try {
    const url = new URL(origin);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || (url.protocol !== 'https:' && !(process.env.NODE_ENV === 'development' && url.protocol === 'http:' && url.hostname === 'localhost'))) return null;
    return { clientId, clientSecret, origin: url.origin, redirectUri: url.origin + '/api/auth/google/callback' };
  } catch {
    return null;
  }
}
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'),{timeoutDuration:8000});
export async function googleIdentity(token:string,nonce:string,clientId:string,verificationKeys=keys){const {payload}=await jwtVerify(token,verificationKeys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:clientId,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email'],maxTokenAge:'10m'});if(payload.nonce!==nonce||(payload.azp!==undefined&&payload.azp!==clientId)||payload.email_verified!==true||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||typeof payload.email!=='string'||payload.email.length>254||!/^\S+@\S+\.\S+$/.test(payload.email))throw Error('Invalid Google identity');return {subject:payload.sub,email:payload.email.toLowerCase(),name:typeof payload.name==='string'?payload.name.slice(0,100):''};}
export async function beginGoogle(next:unknown,link?:{accountId:string;sessionHash:string;passwordHash:string}){const config=googleConfig();if(!config)throw Error('Google unavailable');const state=randomBytes(32).toString('hex'),cookie=randomBytes(32).toString('hex'),nonce=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url');const sql=authSql();await sql`INSERT INTO auth_google_states(state_hash,cookie_hash,nonce,verifier,account_id,session_hash,password_hash_at_issue,return_to,expires_at) VALUES(${hashToken(state)},${hashToken(cookie)},${nonce},${verifier},${link?.accountId??null},${link?.sessionHash??null},${link?.passwordHash??null},${link?'/account/settings/connections':authReturnTo(typeof next==='string'?next:undefined)},now()+interval '10 minutes')`;const query=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'});return {cookie,url:'https://accounts.google.com/o/oauth2/v2/auth?'+query};}
