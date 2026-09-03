import type { Metadata } from 'next';
import SolutionsQueue from '../SolutionsQueue';

export const metadata: Metadata = { title: 'Postulaciones' };

export default function PostulacionesPage() {
  return <SolutionsQueue defaultStatus="all" title="Postulaciones" showAllStatuses showCatalogFilter />;
}
