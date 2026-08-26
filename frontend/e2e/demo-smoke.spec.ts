import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const serverRoot = path.join(repoRoot, "server");

const riderUrl = process.env.RIDER_APP_URL ?? "http://127.0.0.1:5273";
const driverUrl = process.env.DRIVER_APP_URL ?? "http://127.0.0.1:5274";
const opsUrl = process.env.OPS_DASHBOARD_URL ?? "http://127.0.0.1:5275";
const demoPassword = process.env.GOOD_RAPIDO_DEMO_PASSWORD ?? "Password@123";

const demoAccounts = {
  rider: {
    identifier: process.env.GOOD_RAPIDO_DEMO_RIDER_EMAIL ?? "rider@goodrapido.test",
    password: demoPassword
  },
  driver: {
    identifier: process.env.GOOD_RAPIDO_DEMO_DRIVER_EMAIL ?? "arjun.singh.driver@goodrapido.test",
    password: demoPassword
  },
  ops: {
    identifier: process.env.GOOD_RAPIDO_DEMO_OPS_EMAIL ?? "ops@goodrapido.test",
    password: demoPassword
  }
};

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  execFileSync("npm", ["run", "seed:demo"], {
    cwd: serverRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      GOOD_RAPIDO_DEMO_RESET_PASSWORDS: "true"
    }
  });
});

test("browser demo smoke: rider booking, driver lifecycle, rider history, earnings, and ops visibility", async ({ browser }) => {
  const riderContext = await newCleanContext(browser);
  const driverContext = await newCleanContext(browser, {
    geolocation: {
      latitude: 23.381342,
      longitude: 85.86335
    },
    permissions: ["geolocation"]
  });
  const opsContext = await newCleanContext(browser);

  try {
    const riderPage = await riderContext.newPage();
    const driverPage = await driverContext.newPage();
    const opsPage = await opsContext.newPage();

    await test.step("rider register screen and seeded login work", async () => {
      await riderPage.goto(riderUrl);
      const authMode = riderPage.getByLabel("Authentication mode");
      const authForm = riderPage.locator("form");

      await expect(authMode.getByRole("button", { name: "Sign In" })).toBeVisible();
      await authMode.getByRole("button", { name: "Register" }).click();
      await expect(riderPage.getByLabel("Full Name")).toBeVisible();
      await expect(authForm.getByRole("button", { name: "Create Account" })).toBeVisible();

      await authMode.getByRole("button", { name: "Sign In" }).click();
      await riderPage.getByLabel("Phone or Email").fill(demoAccounts.rider.identifier);
      await riderPage.getByLabel("Password").fill(demoAccounts.rider.password);
      await authForm.getByRole("button", { name: "Sign In" }).click();

      await expect(riderPage.getByRole("heading", { name: "Book a transparent ride" })).toBeVisible();
    });

    await test.step("rider selects pickup/dropoff and creates a fare estimate", async () => {
      await chooseLocation(riderPage, "Pickup", "muri", /Muri/i);
      await chooseLocation(riderPage, "Drop-off", "silli", /Silli/i);
      await riderPage.getByRole("button", { name: /Bike/i }).click();

      const estimateButton = riderPage.getByRole("button", { name: "Estimate Fare" });
      await expect(estimateButton).toBeEnabled();
      await estimateButton.click();

      await expect(riderPage).toHaveURL(/#\/estimate/);
      await expect(riderPage.getByText("Estimated Total")).toBeVisible();
      await expect(riderPage.getByText("Detailed Breakdown")).toBeVisible();
    });

    await test.step("rider confirms booking with Arjun Singh", async () => {
      await riderPage.getByRole("button", { name: "Book Ride" }).click();
      await expect(riderPage).toHaveURL(/#\/confirm/);
      await expect(riderPage.getByText("Trust-ranked drivers")).toBeVisible();
      await expect(riderPage.getByText("Arjun Singh")).toBeVisible();

      await riderPage.getByRole("button", { name: /Arjun Singh/i }).click();
      await riderPage.getByRole("button", { name: "Confirm Booking" }).click();

      await expect(riderPage).toHaveURL(/#\/ride/);
      await expect(riderPage.getByText("Waiting for driver", { exact: true })).toBeVisible();
    });

    const bookingCode = await readBookingCode(riderPage);

    await test.step("driver logs in and accepts the exact rider request", async () => {
      await driverPage.goto(driverUrl);
      await driverPage.getByLabel("Phone, email, or employee code").fill(demoAccounts.driver.identifier);
      await driverPage.getByLabel("Password").fill(demoAccounts.driver.password);
      await driverPage.getByRole("button", { name: "Login as driver" }).click();

      await expect(driverPage.getByRole("heading", { name: "Driver dashboard" })).toBeVisible();
      await driverPage.getByRole("button", { name: /Requests/ }).click();

      await expect(driverPage.getByText(bookingCode)).toBeVisible();
      await expect(driverPage.getByText("Muri")).toBeVisible();
      await expect(driverPage.getByText("Silli")).toBeVisible();

      const acceptButton = driverPage.getByRole("button", { name: "Accept ride" });
      await expect(acceptButton).toBeEnabled();
      await acceptButton.click();

      await expect(driverPage).toHaveURL(/#\/active-ride/);
      await expect(driverPage.getByText(bookingCode)).toBeVisible();
    });

    await test.step("rider live screen auto-updates when driver accepts", async () => {
      await expect(riderPage.getByText("Driver accepted", { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(riderPage.getByText("driver_en_route")).toBeVisible();
    });

    await test.step("driver moves ride through arrived, started, and completed states", async () => {
      await advanceDriverLifecycle(driverPage, "Mark arrived", "Driver arrived");
      await advanceDriverLifecycle(driverPage, "Start ride", "Ride in progress");
      await advanceDriverLifecycle(driverPage, "Complete ride", "Ride completed");
    });

    await test.step("rider sees completed live status and history entry", async () => {
      await riderPage.getByRole("button", { name: "Refresh" }).click();
      await expect(riderPage.getByText("completed", { exact: true })).toBeVisible({ timeout: 30_000 });

      await riderPage.getByRole("button", { name: "History", exact: true }).click();
      await expect(riderPage).toHaveURL(/#\/history/);
      await expect(riderPage.getByText("Muri to Silli")).toBeVisible();
      await expect(riderPage.getByText("completed").first()).toBeVisible();
    });

    await test.step("driver earnings include completed ride", async () => {
      await driverPage.getByRole("button", { name: /Earnings/ }).click();
      await expect(driverPage).toHaveURL(/#\/earnings/);
      await expect(driverPage.getByRole("heading", { name: "Driver earnings" })).toBeVisible();
      await expect(driverPage.getByText(bookingCode)).toBeVisible({ timeout: 30_000 });
      await expect(driverPage.getByRole("heading", { name: "Recent completed rides" })).toBeVisible();
    });

    await test.step("ops dashboard shows the completed ride", async () => {
      await opsPage.goto(opsUrl);
      await opsPage.getByLabel("Phone or Email").fill(demoAccounts.ops.identifier);
      await opsPage.getByLabel("Password").fill(demoAccounts.ops.password);
      await opsPage.getByRole("button", { name: "Sign In" }).click();

      await expect(opsPage.getByRole("heading", { level: 1, name: "Operations Overview" })).toBeVisible();
      await opsPage.getByRole("button", { name: /Rides/ }).click();
      await expect(opsPage.getByRole("heading", { level: 1, name: "Ride Operations" })).toBeVisible();
      await opsPage.getByLabel("Status").selectOption("completed");

      const completedRow = opsPage.locator("tbody tr", { hasText: bookingCode });
      await expect(completedRow).toBeVisible({ timeout: 30_000 });
      await expect(completedRow).toContainText("Completed");
      await completedRow.getByRole("button", { name: "Detail" }).click();
      await expect(opsPage.getByText("Ride Detail Drawer")).toBeVisible();
      await expect(opsPage.getByText(bookingCode).last()).toBeVisible();
    });
  } finally {
    await riderContext.close();
    await driverContext.close();
    await opsContext.close();
  }
});

async function newCleanContext(
  browser: Browser,
  options: Parameters<Browser["newContext"]>[0] = {}
): Promise<BrowserContext> {
  const context = await browser.newContext(options);

  await context.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  return context;
}

async function chooseLocation(page: Page, label: string, query: string, suggestionName: RegExp) {
  await page.getByRole("textbox", { name: new RegExp(`^${label}\\b`, "i") }).fill(query);
  const listbox = page.getByRole("listbox", { name: `${label} suggestions` });

  await expect(listbox).toBeVisible();
  await listbox.getByRole("button", { name: suggestionName }).first().click();
  await expect(page.getByText(`${label} selected for fare estimate`)).toBeVisible();
}

async function readBookingCode(page: Page) {
  const code = (await page.getByText(/GR-[A-Z0-9-]+/).first().textContent())?.trim();

  expect(code, "booking code should be visible on rider live screen").toBeTruthy();

  return code as string;
}

async function advanceDriverLifecycle(page: Page, buttonName: string, expectedStatus: string) {
  const button = page.getByRole("button", { name: buttonName });

  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole("heading", { name: expectedStatus, exact: true })).toBeVisible({ timeout: 30_000 });
}
