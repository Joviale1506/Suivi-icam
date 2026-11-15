import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout : lancer d'abord le site (voir CLAUDE.md, « Tester en local »), puis
//   E2E_BASE_URL=http://localhost:3100 E2E_PASSWORD=... npx playwright test
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    locale: "fr-FR",
    timezoneId: "America/New_York", // fuseau volontairement différent : l'affichage doit rester en heure de Paris
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } } },
  ],
});
