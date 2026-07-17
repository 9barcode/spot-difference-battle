import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migrationUrl = new URL("../migrations/001_initial.sql", import.meta.url);
const sql = await readFile(fileURLToPath(migrationUrl), "utf8");
const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query(sql);
  console.log("Database migration completed");
} finally {
  await pool.end();
}
