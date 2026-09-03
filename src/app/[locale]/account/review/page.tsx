import { notFound } from 'next/navigation';
// Editorial review moved entirely to the ops backoffice (ops.shwcs.site).
// This file only keeps the route from resolving; it is safe to delete.
export const metadata={robots:{index:false,follow:false}};
export default function RemovedReviewQueue(){notFound();}
