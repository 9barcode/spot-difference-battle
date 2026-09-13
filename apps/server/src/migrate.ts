import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      file_name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const fileName of migrationFiles) {
    const sql = await readFile(new URL(fileName, migrationDirectory), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const applied = await client.query<{ checksum: string }>(
      "SELECT checksum FROM schema_migrations WHERE file_name = $1",
      [fileName],
    );
    if (applied.rows[0]) {
      if (applied.rows[0].checksum !== checksum) {
        throw new Error(`Applied migration was modified: ${fileName}`);
      }
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (file_name, checksum) VALUES ($1, $2)",
        [fileName, checksum],
      );
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
