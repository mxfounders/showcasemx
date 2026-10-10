import { NextResponse } from 'next/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
// Legacy unowned intake is retired. Existing rows remain untouched; ownership
// must never be inferred by matching an unverified email address.
export async function POST(request: Request) {
  const t = (await getDictionary(requestLocale(request))).solutionEditor.errors;
  return NextResponse.json(
    {
      error: t.applicationsRetired,
      url: '/account/solutions/new',
    },
    { status: 410 },
  );
}
