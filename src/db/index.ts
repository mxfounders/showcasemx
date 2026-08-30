import { getDatabaseUrl } from '../lib/database-url';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) throw new Error('Falta configurar la conexión de base de datos.');
const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
