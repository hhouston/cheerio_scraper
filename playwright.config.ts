import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3113',
    // Local sandbox provides a preinstalled Chromium; CI installs its own.
    ...(process.env.PW_CHROMIUM
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } }
      : {}),
  },
  webServer: {
    command: 'pnpm start --port 3113',
    url: 'http://localhost:3113/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
