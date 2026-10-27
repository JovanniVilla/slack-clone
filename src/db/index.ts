import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/slack_clone';

// Disable prefetch as it is not supported for "Transaction" pool mode if using PgBouncer
const client = postgres(connectionString, {
  prepare: false,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
