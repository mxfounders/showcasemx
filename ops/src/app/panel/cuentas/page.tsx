import type { Metadata } from 'next';
import CuentasClient from './CuentasClient';

export const metadata: Metadata = { title: 'Cuentas' };

export default function CuentasPage() {
  return <CuentasClient />;
}
