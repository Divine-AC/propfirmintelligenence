import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.e2e.ts",
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    // Optional for environments with an existing Chromium installation.
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "phone", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    // Test the shipped CSS and JS, never a still-running dev build.
    command: "npm start -- --hostname 0.0.0.0 --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
