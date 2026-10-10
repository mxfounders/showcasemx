'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { requestElevation } from '@/lib/client';
import { toast } from '@/lib/toast';
import { Button } from '../ui/Button';
import { useSession } from '../shell/SessionContext';

/** Admin-only CSV export: modo seguro is requested first when needed, then the file downloads. */
export function ExportButton({ kind, label = 'Exportar CSV' }: { kind: string; label?: string }) {
  const { level } = useSession();
  const [busy, setBusy] = useState(false);
  if (level !== 'admin') return null;

  async function run(retried = false): Promise<void> {
    setBusy(true);
    try {
      const response = await fetch(`/api/export/${kind}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (response.status === 403 && !retried) {
        const data = await response.json().catch(() => ({}));
        if (data.code === 'elevation_required' && (await requestElevation())) return run(true);
        toast(data.error ?? 'No autorizado.', 'error');
        return;
      }
      if (response.status === 401) {
        window.location.assign('/login?reason=expired');
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast(data.error ?? 'No se pudo exportar.', 'error');
        return;
      }
      const blob = await response.blob();
      const name =
        /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ??
        `shwcs-${kind}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      toast('Exportación lista', 'success', 'Quedó registrada en la bitácora.');
    } catch {
      toast('No se pudo conectar.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button tone="secondary" icon={Download} loading={busy} onClick={() => run()}>
      {label}
    </Button>
  );
}
