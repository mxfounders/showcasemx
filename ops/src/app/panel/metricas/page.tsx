import type { Metadata } from 'next';
import MetricasClient from './MetricasClient';

export const metadata: Metadata = { title: 'Métricas' };

export default function MetricasPage() {
  return <MetricasClient />;
}
