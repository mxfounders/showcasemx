import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Use a non-null assertion or throw if undefined, standard Next.js pattern
const sql = neon(process.env.NEON_DATABASE_URL!);
export const db = drizzle(sql, { schema });
