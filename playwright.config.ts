import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    channel: 'msedge',
    viewport: { width: 390, height: 844 },
    trace: 'off',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm start -- --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 240_000,
    env: { NG_CLI_ANALYTICS: 'false' }
  }
});
