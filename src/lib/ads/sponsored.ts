import { unstable_cache } from 'next/cache';
import { publicProducts } from '@/lib/solutions/public';
import type { AdPlacement } from './model';
import { liveBookings } from './server';
import { adsCacheTag } from './settle';

const cachedLiveBookings = unstable_cache(liveBookings, ['ads-live'], {
  tags: [adsCacheTag],
  // Days turn over at midnight: a booking starts or ends within five minutes of it even
  // when nothing invalidates the tag.
  revalidate: 300,
});

/**
 * The sponsored listings serving now in a slot, as catalog products. Reads only bookings
 * and published listings; never feeds or reorders the organic catalog. A failure renders
 * no sponsored slot rather than an error.
 */
export async function sponsoredProducts(placement: AdPlacement, scope = '') {
  try {
    const live = await cachedLiveBookings(placement, scope);
    if (live.length === 0) return [];
    const products = await publicProducts();
    return live.flatMap(booking => {
      const product = products.find(item => item.detailUrl === `/soluciones/${booking.solutionId}`);
      return product ? [{ bookingId: booking.bookingId, product }] : [];
    });
  } catch {
    return [];
  }
}
