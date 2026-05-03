import { execSync } from 'child_process';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_URL =
  'postgresql://test_user:test_password@localhost:5433/challenge_db_test';

const ENV_FILE = path.join(__dirname, '.test-env.json');

async function waitForPostgres(maxRetries = 30, delayMs = 1000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = new Client({ connectionString: TEST_DB_URL });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log(`✓ PostgreSQL ready (attempt ${attempt})`);
      return;
    } catch {
      try { await client.end(); } catch { /* ignore cleanup errors */ }
      if (attempt === maxRetries) {
        throw new Error(
          `PostgreSQL not ready after ${maxRetries} attempts (${maxRetries}s)`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export default async function globalSetup(): Promise<void> {
  console.log('\n🐳 Starting test database container...');
  execSync('docker compose -f docker-compose.test.yml up -d', {
    cwd: path.resolve(__dirname, '..', '..'),
    stdio: 'inherit',
  });

  console.log('⏳ Waiting for PostgreSQL to accept connections...');
  await waitForPostgres();

  // Set DATABASE_URL for prisma db push
  process.env.DATABASE_URL = TEST_DB_URL;

  console.log('📦 Pushing Prisma schema to test database...');
  execSync(`npx prisma db push --url "${TEST_DB_URL}"`, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });

  // Write the DATABASE_URL to a temp file so Jest workers can read it
  fs.writeFileSync(ENV_FILE, JSON.stringify({ DATABASE_URL: TEST_DB_URL }));

  console.log('✅ Test database ready\n');
}
