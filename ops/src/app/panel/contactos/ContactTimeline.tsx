'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { api, errorMessage } from '@/lib/client';
import { contactStatus } from '@/lib/labels';
import { Drawer } from '@/components/ui/Drawer';
import { IconButton } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Timeline } from '@/components/domain/Timeline';

interface Event {
  id: string;
  status: string;
  createdAt: string | null;
  actorEmail: string | null;
}

export function ContactTimeline({ id, project }: { id: string; project: string }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState('');

  async function show() {
    setOpen(true);
    setError('');
    try {
      const data = await api<{ events: Event[] }>(`/api/contacts/${id}`);
      setEvents(data.events);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <IconButton
        label="Ver línea de tiempo"
        icon={History}
        onClick={show}
        className="relative z-10"
      />
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={project}
        subtitle="Cambios de estado de la solicitud. El contenido de los mensajes nunca se muestra en ops."
      >
        {error ? (
          <Alert>{error}</Alert>
        ) : events === null ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-[13px] text-muted">Sin cambios de estado todavía: sigue como nueva.</p>
        ) : (
          <Timeline
            items={events.map(event => {
              const label = contactStatus(event.status);
              return {
                id: event.id,
                tone: label.tone,
                title: <Badge tone={label.tone}>{label.label}</Badge>,
                meta: event.actorEmail ?? 'cuenta eliminada',
                at: event.createdAt,
              };
            })}
          />
        )}
      </Drawer>
    </>
  );
}
