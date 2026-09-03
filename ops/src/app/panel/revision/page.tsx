import type { Metadata } from 'next';
import SolutionsQueue from '../SolutionsQueue';

export const metadata: Metadata = { title: 'Revisión' };

export default function RevisionPage() {
  return <SolutionsQueue defaultStatus="pending" title="Revisión" />;
}
