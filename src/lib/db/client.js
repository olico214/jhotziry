import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const globalForDb = globalThis;

const pool =
  globalForDb.__jhotziryPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__jhotziryPool = pool;
}

export const db = drizzle(pool, { schema });
