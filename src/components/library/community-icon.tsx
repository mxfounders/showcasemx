import { GlobeIcon, type GotaIconProps } from '@/components/icons/gota';

// Community's globe (Gota's), with its one turn on hover or focus (.community-icon in globals.css).
export function CommunityIcon({ className = '', ...props }: GotaIconProps) {
  return <GlobeIcon className={`community-icon ${className}`} {...props} />;
}
