import { cookies } from 'next/headers';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { getSession,sessionCookie } from '@/lib/auth/session';
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  let authenticated=false;
  try{authenticated=Boolean(await getSession((await cookies()).get(sessionCookie)?.value));}catch{/* Public navigation remains available if account storage is unavailable. */}
  return <><Navbar authenticated={authenticated}/><main id="main-content" className="pt-14">{children}</main><Footer /></>;
}
