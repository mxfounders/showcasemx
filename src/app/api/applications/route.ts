import { NextResponse } from 'next/server';
// Legacy unowned intake is retired. Existing rows remain untouched; ownership
// must never be inferred by matching an unverified email address.
export async function POST(){return NextResponse.json({error:'Ahora puedes postular y dar seguimiento desde tu cuenta.',url:'/account/solutions/new'},{status:410});}
