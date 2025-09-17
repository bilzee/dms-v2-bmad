import { defineConfig, devices } from '@playwright/test';

/**
 * Custom Playwright configuration for testing on port 3001
 * This configuration is specifically for testing the interactive map with real data
 */
export default defineConfig({
  testDir: './src/e2e/__tests__',
  fullyParallel: false, // Run sequentially for better debugging
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for consistent testing
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        headless: false // Show browser for debugging
      },
    },
  ],

  // Don't start a web server - we assume it's already running
  webServer: undefined,
});