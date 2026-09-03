import type { Metadata } from 'next';
import DomainsClient from './DomainsClient';

export const metadata: Metadata = { title: 'Dominios' };

export default function DomainsPage() {
  return <DomainsClient />;
}
