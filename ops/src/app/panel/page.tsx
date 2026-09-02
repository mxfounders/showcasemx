import type { Metadata } from 'next';
import SolutionsQueue from './SolutionsQueue';

export const metadata: Metadata = { title: 'Cola de revisión' };

export default function PanelPage() {
  return <SolutionsQueue defaultStatus="pending" title="Cola de revisión" />;
}
