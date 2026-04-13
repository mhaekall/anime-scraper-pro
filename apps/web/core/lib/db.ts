import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const dbUrl = process.env.DATABASE_URL || "postgres://dummy:dummy@ep-dummy-123456.us-east-2.aws.neon.tech/neondb";
const sql = neon(dbUrl);
export const db = drizzle(sql, { schema });