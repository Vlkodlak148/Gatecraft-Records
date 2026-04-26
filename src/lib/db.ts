import { neon } from '@neondatabase/serverless';

function getSQL() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export default getSQL;

export async function initDB() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS records (
      id SERIAL PRIMARY KEY,
      player VARCHAR(64) NOT NULL,
      category VARCHAR(64) NOT NULL,
      value VARCHAR(64) NOT NULL,
      record_type VARCHAR(16) NOT NULL DEFAULT 'time',
      proof_url TEXT,
      notes TEXT,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      discord_id VARCHAR(64),
      discord_username VARCHAR(64),
      achieved_at DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}
