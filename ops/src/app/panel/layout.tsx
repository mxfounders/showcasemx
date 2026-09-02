import { redirect } from 'next/navigation';
import { getOpsSession } from '@/lib/auth';
import Sidebar from './Sidebar';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getOpsSession();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen bg-stone-100">
      <Sidebar userEmail={user.email} />
      {/* Main content shifts right of fixed sidebar */}
      <div className="flex-1 min-h-screen flex flex-col ml-60">
        {children}
      </div>
    </div>
  );
}
