import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const apiBaseUrl = process.env.GOOD_RAPIDO_API_BASE_URL ?? "http://127.0.0.1:3100";
const riderBaseUrl = process.env.RIDER_APP_URL ?? "http://127.0.0.1:5273";
const driverBaseUrl = process.env.DRIVER_APP_URL ?? "http://127.0.0.1:5274";
const opsBaseUrl = process.env.OPS_DASHBOARD_URL ?? "http://127.0.0.1:5275";
const browserChannel = process.env.E2E_BROWSER_CHANNEL || (process.env.CI ? undefined : "chrome");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const serverRoot = path.join(repoRoot, "server");
const frontendRoot = path.join(repoRoot, "frontend");
const apiTarget = toServerTarget(apiBaseUrl);
const riderTarget = toServerTarget(riderBaseUrl);
const driverTarget = toServerTarget(driverBaseUrl);
const opsTarget = toServerTarget(opsBaseUrl);
const appOrigins = [riderBaseUrl, driverBaseUrl, opsBaseUrl].map((baseUrl) => new URL(baseUrl).origin).join(",");

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: {
    timeout: 20_000
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: riderBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "demo-chrome",
      use: {
        ...devices["Desktop Chrome"],
        ...(browserChannel ? { channel: browserChannel } : {})
      }
    }
  ],
  webServer: [
    {
      command: "npm run start",
      cwd: serverRoot,
      env: {
        PORT: apiTarget.port,
        CORS_ORIGIN: appOrigins
      },
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: `npm run dev:rider -- --host ${riderTarget.host} --port ${riderTarget.port}`,
      cwd: frontendRoot,
      env: {
        VITE_API_BASE_URL: apiBaseUrl
      },
      url: riderBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: `npm run dev:driver -- --host ${driverTarget.host} --port ${driverTarget.port}`,
      cwd: frontendRoot,
      env: {
        VITE_API_BASE_URL: apiBaseUrl
      },
      url: driverBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: `npm run dev:ops -- --host ${opsTarget.host} --port ${opsTarget.port}`,
      cwd: frontendRoot,
      env: {
        VITE_API_BASE_URL: apiBaseUrl
      },
      url: opsBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});

function toServerTarget(baseUrl: string) {
  const url = new URL(baseUrl);
  const fallbackPort = url.protocol === "https:" ? "443" : "80";

  return {
    host: url.hostname,
    port: url.port || fallbackPort
  };
}
