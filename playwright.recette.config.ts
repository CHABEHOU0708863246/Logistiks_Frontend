import { defineConfig, devices } from '@playwright/test';

/**
 * Recette Lot 7 : sert le build de production (connexion statique, service
 * worker, manifest) et rejoue les parcours sur Chrome Android, Safari iOS
 * émulé et ordinateur.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'lot7-quality.spec.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4301',
    trace: 'off',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: 'http://localhost:4301',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { PORT: '4301' },
  },
  projects: [
    {
      name: 'chrome-android',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
    {
      name: 'desktop-chrome',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'ios-safari',
      use: { ...devices['iPhone 13'], browserName: 'webkit' },
    },
  ],
});
