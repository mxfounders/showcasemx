import { redirect } from 'next/navigation';
import { getOpsSession } from '@/lib/auth';
import Sidebar from './Sidebar';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getOpsSession();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Sidebar userEmail={user.email} />
      <div className="flex flex-col min-h-screen lg:pl-[248px]">
        {/* We keep main full width in the remaining space */}
        <main className="flex-1 w-full relative">
          {children}
        </main>
      </div>
    </div>
  );
}
