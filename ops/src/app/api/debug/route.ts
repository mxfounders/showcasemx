import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    prod: process.env.shwcs_POSTGRES_URL || 'NOT_FOUND',
    main: process.env.POSTGRES_URL || 'NOT_FOUND',
    db: process.env.DATABASE_URL || 'NOT_FOUND'
  });
}
