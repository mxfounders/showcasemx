import { redirect } from 'next/navigation';
import { getOpsSession } from '@/lib/auth';

export default async function RootPage() {
  const user = await getOpsSession();
  if (user) redirect('/panel');
  redirect('/login');
}
