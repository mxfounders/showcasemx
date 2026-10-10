import Image from 'next/image';
import type { CSSProperties } from 'react';

/**
 * A project's small mark: its favicon when shwcs serves it itself, otherwise its initial.
 *
 * Third-party favicon services (e.g. Google's s2/favicons) are deliberately never used:
 * they make every visitor's browser call another company's server, which the privacy
 * policy promises the site does not do.
 */
export function ProjectMark({
  name,
  favicon,
  label,
  size,
  className,
  imageClassName = 'object-contain',
  fallbackClassName,
  fallbackStyle,
}: {
  name: string;
  favicon?: string;
  /** Accessible name, for marks shown without the project's name next to them. */
  label?: string;
  /** Rendered size in CSS pixels; `className` should size the box to match. */
  size: number;
  className: string;
  imageClassName?: string;
  fallbackClassName: string;
  fallbackStyle?: CSSProperties;
}) {
  if (favicon && isFirstParty(favicon)) {
    return (
      <Image
        src={favicon}
        alt={label ?? ''}
        width={size}
        height={size}
        unoptimized
        className={`${className} ${imageClassName}`}
      />
    );
  }
  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      style={fallbackStyle}
      className={`${className} ${fallbackClassName}`}
    >
      {name.slice(0, 1)}
    </span>
  );
}

function isFirstParty(src: string) {
  return src.startsWith('/') && !src.startsWith('//');
}
