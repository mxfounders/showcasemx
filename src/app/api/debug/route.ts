import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({
    url: process.env.shwcs_POSTGRES_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || 'NOT_FOUND'
  });
}
