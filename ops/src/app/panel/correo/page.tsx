import type { Metadata } from 'next';
import CorreoClient from './CorreoClient';

export const metadata: Metadata = { title: 'Correo' };

export default function CorreoPage() {
  return <CorreoClient />;
}
