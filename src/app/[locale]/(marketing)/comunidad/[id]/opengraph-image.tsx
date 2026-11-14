import { getPublicCollections } from '@/lib/library/community';
import { isSolutionId } from '@/lib/solutions/model';
import { ogCard, ogContentType, ogSize } from '@/lib/og-card';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'shwcs';

// Only a list's public copy, the same projection as its page (never its purpose or notes).
export default async function Image({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const en = locale === 'en';
  const list = isSolutionId(id)
    ? (await getPublicCollections({ id }).catch(() => ({ collections: [] }))).collections[0]
    : undefined;
  if (!list) return ogCard({ eyebrow: en ? 'Community' : 'Comunidad', title: 'shwcs' });
  return ogCard({
    eyebrow: en
      ? `Community list · ${list.count} ${list.count === 1 ? 'project' : 'projects'}`
      : `Lista de la comunidad · ${list.count} ${list.count === 1 ? 'proyecto' : 'proyectos'}`,
    title: list.name,
    subtitle: list.description || undefined,
    footer: list.curator ? `${en ? 'By' : 'Por'} ${list.curator}` : undefined,
    tone: 'lavender',
  });
}
