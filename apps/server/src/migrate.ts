import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migrationDirectory = new URL("../migrations/", import.meta.url);
const migrationFiles = (await readdir(migrationDirectory))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));

if (migrationFiles.length === 0) {
  throw new Error("No database migration files found");
}

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  for (const fileName of migrationFiles) {
    const sql = await readFile(new URL(fileName, migrationDirectory), "utf8");

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("COMMIT");
      console.log(`Applied database migration: ${fileName}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log("Database migrations completed");
} finally {
  client.release();
  await pool.end();
}
