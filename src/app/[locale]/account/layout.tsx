import { cookies } from 'next/headers';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { authSql } from '@/lib/auth/security';
import { AccountSidebar } from '@/components/navigation/account-sidebar';
import { AccountUtilities,type AccountNotification } from '@/components/navigation/account-utilities';
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  let name='',avatar:string|null=null,notifications:AccountNotification[]=[],unreadCount=0,hasMoreNotifications=false;
  try {const account=await getSession((await cookies()).get(sessionCookie)?.value);if(account){const sql=authSql();const [row]=await sql`SELECT name,(avatar_key IS NOT NULL OR avatar_data IS NOT NULL) AS has_avatar FROM auth_accounts WHERE id=${account.id}`;name=String(row?.name??'');avatar=row?.has_avatar?'/api/account/avatar':null;try{const [notificationRows,[count]]=await Promise.all([sql`SELECT id::text,title,href,read_at::text,created_at::text FROM account_notifications WHERE owner_id=${account.id} ORDER BY created_at DESC,id DESC LIMIT 11`,sql`SELECT count(*)::int AS unread FROM account_notifications WHERE owner_id=${account.id} AND read_at IS NULL`]);hasMoreNotifications=notificationRows.length>10;notifications=notificationRows.slice(0,10).map(item=>{const href=String(item.href);return{id:String(item.id),title:String(item.title),href:/^\/account(?:\/|$)/.test(href)?href:'/account',readAt:item.read_at?String(item.read_at):null,createdAt:String(item.created_at)};});unreadCount=Number(count?.unread??0);}catch{notifications=[];}}}catch{/* The page supplies the storage error boundary. */}
  return <div className="min-h-svh">
    <AccountSidebar name={name} avatar={avatar} />
    <AccountUtilities initialNotifications={notifications} initialUnreadCount={unreadCount} initialHasMore={hasMoreNotifications}/>
    <main id="main-content" className="min-w-0 pb-10 pt-14 lg:ml-[264px] lg:pt-4">{children}</main>
  </div>;
}
