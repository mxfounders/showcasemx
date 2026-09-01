import { isSolutionId } from '@/lib/solutions/model';
import { validProjectKey } from '@/lib/library/model';
export function authReturnTo(value:unknown):string{
 if(typeof value!=='string')return '/account';
 if(['/account','/account/solutions','/account/solutions/new','/account/saved','/account/lists','/account/contacts','/account/opportunities'].includes(value))return value;
 if(value.startsWith('/account/contacts/new?')){const id=new URLSearchParams(value.slice(value.indexOf('?')+1)).get('solution');if(id&&isSolutionId(id))return '/account/contacts/new?solution='+id;}
 if(/^\/account\/opportunities\/[a-f0-9-]+$/i.test(value)&&isSolutionId(value.slice('/account/opportunities/'.length)))return value;
 if(/^\/account\/contacts\/[a-f0-9-]+$/i.test(value)&&isSolutionId(value.slice('/account/contacts/'.length)))return value;
 if(value.startsWith('/account/saved?')){const params=new URLSearchParams(value.slice(value.indexOf('?')+1));const key=params.get('project');if(validProjectKey(key))return `/account/saved?project=${encodeURIComponent(key)}`;}
 return '/account';
}
