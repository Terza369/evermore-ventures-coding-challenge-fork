import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ENV_FILE = path.join(__dirname, '.test-env.json');

export default async function globalTeardown(): Promise<void> {
   // Brief pause to let pg pool connections drain after app.close()
   await new Promise((resolve) => setTimeout(resolve, 500));

   console.log('\n🧹 Tearing down test database container...');
   execSync('docker compose -f docker-compose.test.yml down -v', {
      cwd: path.resolve(__dirname, '..', '..'),
      stdio: 'inherit',
   });

   // Clean up temp env file
   if (fs.existsSync(ENV_FILE)) {
      fs.unlinkSync(ENV_FILE);
   }

   console.log('✅ Test container removed\n');
}
