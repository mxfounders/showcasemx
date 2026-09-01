import { requireFounder } from '@/lib/solutions/server';
import { authSql } from '@/lib/auth/security';
import { AccountProfileForm } from '@/components/account-profile-form';
import { AvatarForm } from '@/components/settings/avatar-form';
export default async function ProfileSettings(){
 const account=await requireFounder();const sql=authSql();const [row]=await sql`SELECT name,organization,profile,role,avatar_data FROM auth_accounts WHERE id=${account.id}`;
 const profile={name:String(row?.name??''),organization:String(row?.organization??''),profile:String(row?.profile??''),role:String(row?.role??'')};
 return ( <section id="perfil" className="scroll-mt-28"><h2 className="mb-6 text-2xl font-medium tracking-tight">Tu perfil</h2><AvatarForm initial={row?.avatar_data?String(row.avatar_data):null} name={profile.name||account.email}/><AccountProfileForm initial={profile}/></section>
);
}
