'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditIcon, SparklesIcon } from '@/components/icons/gota';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';

/** «Nueva campaña» and «Borrador de Nuevo esta semana»: both open the draft they create. */
export function NewCampaignButtons() {
  const router = useRouter();
  const [busy, setBusy] = useState<'create' | 'weekly' | null>(null);

  async function run(action: 'create' | 'weekly') {
    setBusy(action);
    try {
      const data = await api<{ id: string; message?: string }>('/api/newsletter/campaigns', {
        body: { action },
      });
      if (action === 'weekly') toast('Borrador semanal creado', 'success', data.message);
      router.push(`/panel/newsletter/campanas/${data.id}`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        tone="secondary"
        icon={<SparklesIcon />}
        loading={busy === 'weekly'}
        disabled={busy !== null}
        onClick={() => void run('weekly')}
      >
        Borrador de «Nuevo esta semana»
      </Button>
      <Button
        tone="primary"
        icon={<EditIcon />}
        loading={busy === 'create'}
        disabled={busy !== null}
        onClick={() => void run('create')}
      >
        Nueva campaña
      </Button>
    </div>
  );
}
