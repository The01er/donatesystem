import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'api',
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        'mysql://test:test@localhost:3306/donate_platform_test',
    },
    setupFiles: ['./tests/helpers/setup.ts'],
  },
});
