import type { Metadata } from 'next';
import SolutionsQueue from '../SolutionsQueue';

export const metadata: Metadata = { title: 'Todas las postulaciones' };

export default function PostulacionesPage() {
  return <SolutionsQueue defaultStatus="all" title="Todas las postulaciones" showAllStatuses />;
}
