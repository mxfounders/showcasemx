import type { Metadata } from 'next';
import ComunidadClient from './ComunidadClient';

export const metadata: Metadata = { title: 'Comunidad' };

export default function ComunidadPage() {
  return <ComunidadClient />;
}
