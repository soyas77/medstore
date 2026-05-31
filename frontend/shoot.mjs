// Start the standalone server, log in via the mock API, and screenshot pages.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 3000;
const BASE = `http://127.0.0.1:${PORT}`;

// 1) boot the standalone server
const srv = spawn("node", [".next/standalone/server.js"], {
  env: { ...process.env, PORT: String(PORT), HOSTNAME: "127.0.0.1", NEXT_PUBLIC_USE_MOCK_API: "1" },
  stdio: "inherit",
});

async function waitReady() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {}
    await sleep(500);
  }
  throw new Error("server not ready");
}

try {
  await waitReady();
  console.log("server ready");

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Login page
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "shots/01-login.png" });
  console.log("shot: login");

  // Fill + submit (use the Admin demo button then submit)
  await page.getByPlaceholder("you@medstore.test").fill("admin@medstore.test");
  await page.getByPlaceholder("••••••••").fill("admin123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await sleep(1500);
  await page.screenshot({ path: "shots/02-dashboard.png", fullPage: true });
  console.log("shot: dashboard");

  // Inventory
  await page.goto(`${BASE}/inventory`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.screenshot({ path: "shots/03-inventory.png", fullPage: true });
  console.log("shot: inventory");

  // New sale
  await page.goto(`${BASE}/sales/new`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.screenshot({ path: "shots/04-sales.png", fullPage: true });
  console.log("shot: sales");

  // Invoices
  await page.goto(`${BASE}/invoices`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.screenshot({ path: "shots/05-invoices.png", fullPage: true });
  console.log("shot: invoices");

  await browser.close();
  console.log("DONE");
} catch (e) {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  srv.kill("SIGKILL");
}
