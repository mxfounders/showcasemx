import { requireOps } from '@/lib/auth';
import { navCounts } from '@/lib/data/counts';
import { Sidebar } from '@/components/shell/Sidebar';
import { SessionProvider } from '@/components/shell/SessionContext';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { Shortcuts } from '@/components/shell/Shortcuts';
import { ElevationDialog } from '@/components/shell/ElevationDialog';
import { SessionGuard } from '@/components/shell/SessionGuard';
import { Toaster } from '@/components/ui/Toaster';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOps();
  const counts = await navCounts();

  return (
    <SessionProvider
      initial={{
        email: user.email,
        name: user.name,
        level: user.level,
        elevatedUntil: user.elevatedUntil,
        idleExpiresAt: user.idleExpiresAt,
        expiresAt: user.expiresAt,
        serverNow: new Date().toISOString(),
      }}
    >
      <a
        href="#contenido"
        className="sr-only z-[200] rounded-lg bg-surface px-3 py-2 text-sm font-medium shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <Sidebar counts={counts} />
      <main id="contenido" tabIndex={-1} className="min-h-dvh outline-none lg:pl-[264px]">
        <div className="mx-auto w-full max-w-[1320px] px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          {children}
        </div>
      </main>
      <CommandPalette />
      <Shortcuts />
      <ElevationDialog />
      <SessionGuard />
      <Toaster />
    </SessionProvider>
  );
}
