import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'e2e-report' }], ['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: 'http://localhost:3000',
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // webServer — запуск API (:3001) и Nuxt (:3000) перед тестами
  webServer: [
    {
      command: 'pnpm --filter @donate/api exec tsx src/index.ts',
      port: 3001,
      cwd: '/home/donate',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'development',
        PAYMENT_GATEWAY: 'mock',
        PAYMENT_WEBHOOK_IPS: '127.0.0.1,::1',
        JWT_SECRET: 'e2e-test-jwt-secret-do-not-use-in-prod',
        COOKIE_SECRET: 'e2e-test-cookie-secret-do-not-use-in-prod',
        CORS_ORIGIN: 'http://localhost:3000',
        BASE_URL: 'http://localhost:3000',
        BASE_DOMAIN: 'localhost',
        DATABASE_URL:
          process.env.TEST_DATABASE_URL ||
          'mysql://test:test@localhost:3306/donate_platform_test',
        UPLOADS_DIR: '/tmp/donate-e2e-uploads',
        PAYMENT_KEYS_ENCRYPTION_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
      },
    },
    {
      command: 'pnpm --filter @donate/web exec nuxi dev --port 3000',
      port: 3000,
      cwd: '/home/donate',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NUXT_PUBLIC_BASE_URL: 'http://localhost:3000',
        NUXT_PUBLIC_API_BASE: 'http://localhost:3001',
      },
    },
  ],
});
