import fs from 'fs';
import path from 'path';
import pool from '../config/database';

async function initializeDatabase(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split by semicolons, filtering out empty statements
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  const connection = await pool.getConnection();

  try {
    console.log('[db:init] Connected to database.');

    for (const statement of statements) {
      try {
        await connection.query(statement);
        // Log the first 60 chars of each statement for progress tracking
        const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
        console.log(`[db:init] OK: ${preview}...`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
        console.error(`[db:init] FAIL: ${preview}...`);
        console.error(`  -> ${message}`);
      }
    }

    console.log('[db:init] Database initialization completed.');
  } finally {
    connection.release();
    await pool.end();
  }
}

initializeDatabase().catch((err) => {
  console.error('[db:init] Fatal error:', err);
  process.exit(1);
});
