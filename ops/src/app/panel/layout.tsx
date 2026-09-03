import { requireOps } from '@/lib/auth';
import Sidebar from './Sidebar';
import CommandPalette from '@/components/CommandPalette';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOps();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Sidebar userEmail={user.email} level={user.level} />
      <CommandPalette />
      <div className="flex flex-col min-h-screen lg:pl-[248px]">
        <main className="flex-1 w-full relative">
          {children}
        </main>
      </div>
    </div>
  );
}
