'use client';
import { useEffect, useRef, useState } from 'react';

export type SectionLink = { id: string; label: string };

/**
 * The ficha's table of contents: one pill per section the listing actually shows, stuck
 * under the site navbar (52 px, fixed). The pill of the section being read is marked,
 * from an IntersectionObserver over the section ids. Plain anchors, so it works without
 * JavaScript, and the sections carry scroll-margin so a jump lands below this bar.
 */
export function SectionNav({ items, label }: { items: SectionLink[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const ids = items.map(item => item.id).join(' ');
  const bar = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const order = ids.split(' ');
    const inView = new Set<string>();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries)
          if (entry.isIntersecting) inView.add(entry.target.id);
          else inView.delete(entry.target.id);
        const first = order.find(id => inView.has(id));
        if (first) setActive(first);
      },
      // The band just below the two sticky bars, a third of the screen tall.
      { rootMargin: '-120px 0px -60% 0px' },
    );
    for (const id of order) {
      const target = document.getElementById(id);
      if (target) observer.observe(target);
    }
    return () => observer.disconnect();
  }, [ids]);

  // Keep the marked pill visible when the bar scrolls sideways on a phone.
  useEffect(() => {
    const pill = bar.current?.querySelector<HTMLElement>('[aria-current="location"]');
    pill?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  if (items.length < 2) return null;
  return (
    <nav
      aria-label={label}
      className="sticky top-[52px] z-30 -mx-6 mt-10 border-b border-stone-200 bg-[#f5f5f4]/90 px-6 py-2.5 backdrop-blur"
    >
      <ul ref={bar} className="no-scrollbar flex gap-1 overflow-x-auto">
        {items.map(item => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? 'location' : undefined}
              className={`selector-tab inline-block whitespace-nowrap !py-2 ${
                active === item.id
                  ? 'bg-[#E4EBFC] font-medium text-[#365DC4] hover:!bg-[#E4EBFC] hover:!text-[#365DC4] hover:!shadow-none'
                  : ''
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
