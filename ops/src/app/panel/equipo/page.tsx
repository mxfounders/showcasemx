import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireOps } from '@/lib/auth';
import EquipoClient from './EquipoClient';

export const metadata: Metadata = { title: 'Equipo' };

export default async function EquipoPage() {
  const user = await requireOps();
  if (user.level !== 'admin') notFound();
  return <EquipoClient />;
}
