import { requireFounder } from '@/lib/solutions/server';
import { authSql } from '@/lib/auth/security';
import { AccountProfileForm } from '@/components/account-profile-form';
import { AvatarForm } from '@/components/settings/avatar-form';

export const dynamic='force-dynamic';

export default async function ProfileSettings(){
 const account=await requireFounder();const sql=authSql();const [row]=await sql`SELECT name,organization,profile,role,avatar_data FROM auth_accounts WHERE id=${account.id}`;
 const profile={name:String(row?.name??''),organization:String(row?.organization??''),profile:String(row?.profile??''),role:String(row?.role??'')};
 const card='rounded-2xl border border-stone-200 bg-white p-6 shadow-sm';
 return <section className="space-y-6">
  <div className={card}>
   <h2 className="mb-2 text-lg font-medium text-stone-900">Foto de perfil</h2>
   <p className="mb-6 text-sm leading-relaxed text-stone-500">Solo la ves tú y quien gestiona tu cuenta. No aparece en tu ficha pública.</p>
   <AvatarForm initial={row?.avatar_data?String(row.avatar_data):null} name={profile.name||account.email}/>
  </div>

  <div className={card}>
   <h2 className="mb-2 text-lg font-medium text-stone-900">Información personal</h2>
   <p className="mb-6 text-sm leading-relaxed text-stone-500">Tu nombre acompaña lo que escribes en comentarios y solicitudes de contacto. Elegir un perfil no cambia tus permisos.</p>
   <AccountProfileForm initial={profile}/>
  </div>
 </section>;
}
