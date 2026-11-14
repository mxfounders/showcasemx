import { Fragment } from 'react';
import Link from '@/i18n/navigation';

// `[label](/path)` inside an article paragraph (SHCWS-103). Only internal paths are
// links; anything else stays as the literal text, so prose can't smuggle in an
// external or javascript: URL.
const pattern = /\[([^\]]+)\]\((\/(?!\/)[^)\s]*)\)/g;

/** The paragraph's plain text, for places that show it without links. */
export function stripInlineLinks(text: string) {
  return text.replace(pattern, '$1');
}

export function InlineLinks({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    parts.push(text.slice(last, index));
    parts.push(
      <Link
        key={index}
        href={match[2]}
        className="text-[#365DC4] underline decoration-[#365DC4]/30 underline-offset-4 hover:decoration-[#365DC4]"
      >
        {match[1]}
      </Link>,
    );
    last = index + match[0].length;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </>
  );
}
