import { requireFounder } from '@/lib/solutions/server';
import { authSql } from '@/lib/auth/security';
import { AccountProfileForm } from '@/components/account-profile-form';
import { AvatarForm } from '@/components/settings/avatar-form';
export default async function ProfileSettings(){
 const account=await requireFounder();const sql=authSql();const [row]=await sql`SELECT name,organization,profile,role,avatar_data FROM auth_accounts WHERE id=${account.id}`;
 const profile={name:String(row?.name??''),organization:String(row?.organization??''),profile:String(row?.profile??''),role:String(row?.role??'')};
 return ( <section id="perfil" className="scroll-mt-28 space-y-6">
  <h2 className="text-2xl font-medium tracking-tight mb-2">Tu perfil</h2>
  
  <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
    <h3 className="text-lg font-medium text-stone-900 mb-6">Foto de perfil</h3>
    <AvatarForm initial={row?.avatar_data?String(row.avatar_data):null} name={profile.name||account.email}/>
  </div>
  
  <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
    <h3 className="text-lg font-medium text-stone-900 mb-6">Información personal</h3>
    <AccountProfileForm initial={profile}/>
  </div>
</section>
);
}
