import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireOps } from '@/lib/auth';
import BitacoraClient from './BitacoraClient';

export const metadata: Metadata = { title: 'Bitácora' };

export default async function BitacoraPage() {
  const user = await requireOps();
  if (user.level !== 'admin') notFound();
  return <BitacoraClient />;
}
