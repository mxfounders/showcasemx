import type { Metadata } from 'next';
import MensajesClient from './MensajesClient';

export const metadata: Metadata = { title: 'Mensajes' };

export default function MensajesPage() {
  return <MensajesClient />;
}
