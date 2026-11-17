'use client';

import { useEffect } from 'react';
import { identifyAccount } from '@/lib/analytics/client';

/**
 * Links analytics to the signed-in account, by id only. Does nothing unless the visitor
 * accepted analytics; if they accept later on this page, the id is applied then.
 */
export function AccountIdentity({ id }: { id: string }) {
  useEffect(() => identifyAccount(id), [id]);
  return null;
}
