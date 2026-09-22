require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não configurada.');
  process.exit(1);
}

const localDatabase = /^(?:postgres(?:ql)?:\/\/)?(?:[^@]+@)?(?:localhost|127\.0\.0\.1)(?::|\/)/i.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: localDatabase ? false : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
});

(async () => {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Migração do banco concluída.');
})().catch((error) => {
  console.error('Falha na migração:', error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
