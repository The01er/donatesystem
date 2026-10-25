import { execSync } from 'node:child_process';

// Push schema to ensure test DB is up-to-date
try {
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    cwd: new URL('../..', import.meta.url).pathname,
    stdio: 'pipe',
  });
} catch {
  // DB already exists and schema is synced
}
