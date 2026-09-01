import { NextRequest,NextResponse } from 'next/server';
export function failure(error:string,status:number){return NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});}
export async function solutionBody(request:NextRequest):Promise<Record<string,unknown>|null>{
 if(!request.headers.get('content-type')?.includes('application/json'))return null;
 const reader=request.body?.getReader();if(!reader)return null;let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();return null;}chunks.push(value);}const body:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));return body&&typeof body==='object'&&!Array.isArray(body)?body as Record<string,unknown>:null;}catch{return null;}
}
