import { Star } from 'lucide-react';
import { brandColors } from '@/lib/brand-colors';

const filled = brandColors.amber.solid;

/** Read-only stars. The label carries the value; the icons are decoration. */
export function Stars({
  rating,
  label,
  size = 'size-4',
}: {
  rating: number;
  label: string;
  size?: string;
}) {
  const whole = Math.round(rating);
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(value => (
        <Star
          key={value}
          aria-hidden="true"
          className={size}
          style={{ color: value <= whole ? filled : '#d6d3d1' }}
          fill={value <= whole ? filled : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}
