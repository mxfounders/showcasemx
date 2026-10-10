'use client';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastPayload {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

let counter = 0;

export function toast(title: string, tone: ToastTone = 'success', description?: string) {
  counter += 1;
  window.dispatchEvent(
    new CustomEvent<ToastPayload>('ops:toast', {
      detail: { id: counter, title, description, tone },
    }),
  );
}
