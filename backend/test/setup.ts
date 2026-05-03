import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_URL = 'postgresql://test_user:test_password@localhost:5433/challenge_db_test';

const ENV_FILE = path.join(__dirname, '.test-env.json');
const COMPOSE_CWD = path.resolve(__dirname, '..', '..');
const BACKEND_CWD = path.resolve(__dirname, '..');

function composeDown(): void {
   try {
      execSync('docker compose -f docker-compose.test.yml down -v', {
         cwd: COMPOSE_CWD,
         stdio: 'inherit',
      });
   } catch {
      /* ignore — container may not exist */
   }
}

export default async function globalSetup(): Promise<void> {
   try {
      // Force remove any stale container from a crashed previous run
      console.log('\n🧹 Cleaning up stale test containers...');
      composeDown();

      // Start container and wait for healthcheck to report healthy
      console.log('🐳 Starting test database container...');
      execSync('docker compose -f docker-compose.test.yml up -d --wait', {
         cwd: COMPOSE_CWD,
         stdio: 'inherit',
      });
      console.log('✓ PostgreSQL healthy');

      // Set DATABASE_URL for prisma db push
      process.env.DATABASE_URL = TEST_DB_URL;

      console.log('📦 Pushing Prisma schema to test database...');
      execSync(`npx prisma db push --url "${TEST_DB_URL}"`, {
         cwd: BACKEND_CWD,
         stdio: 'inherit',
      });

      // Write the DATABASE_URL to a temp file so Jest workers can read it
      fs.writeFileSync(ENV_FILE, JSON.stringify({ DATABASE_URL: TEST_DB_URL }));

      console.log('✅ Test database ready\n');
   } catch (error) {
      // Ensure container is torn down even if setup fails
      console.error('\n❌ Setup failed, cleaning up...');
      composeDown();
      if (fs.existsSync(ENV_FILE)) {
         fs.unlinkSync(ENV_FILE);
      }
      throw error;
   }
}
