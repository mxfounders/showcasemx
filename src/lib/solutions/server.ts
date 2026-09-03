import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from '@/lib/database-url';
import { getSession,sessionCookie } from '@/lib/auth/session';
import type { FounderSolution,SolutionEvent } from './model';
export function solutionsSql(){const url=getDatabaseUrl();if(!url)throw new Error('Storage unavailable');return neon(url,{fetchOptions:{cache:'no-store'}});}
export async function requireFounder(postulate=false){const account=await getSession((await cookies()).get(sessionCookie)?.value);if(!account)redirect(postulate?'/sign-in?next=/account/solutions/new':'/sign-in');return account;}
export async function getOwnedSolutions(owner:string){const sql=solutionsSql();return await sql`SELECT id,catalog_key,owner_id,data,status,step,version,published_data,published_at::text,editor_question,updated_at::text FROM founder_solutions WHERE owner_id=${owner} ORDER BY founder_solutions.updated_at DESC` as FounderSolution[];}
// Only the owner reads a solution here. Editorial review lives exclusively in the
// ops backoffice (ops.shwcs.site), which queries the database with its own session.
export async function getSolution(id:string,owner:string){const sql=solutionsSql();const rows=await sql`SELECT id,owner_id,data,status,step,version,published_data,published_at::text,editor_question,updated_at::text FROM founder_solutions WHERE id=${id} AND owner_id=${owner}`;return (rows[0] as FounderSolution|undefined)??null;}
export async function getEvents(id:string){const sql=solutionsSql();return await sql`SELECT id::text,status,message,created_at::text FROM solution_events WHERE solution_id=${id} ORDER BY solution_events.id DESC` as SolutionEvent[];}
