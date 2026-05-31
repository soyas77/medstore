// Boot the standalone server and capture real responses (HTML + API) as proof.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 3000;
const BASE = `http://127.0.0.1:${PORT}`;
const srv = spawn("node", [".next/standalone/server.js"], {
  env: { ...process.env, PORT: String(PORT), HOSTNAME: "127.0.0.1", NEXT_PUBLIC_USE_MOCK_API: "1" },
  stdio: "ignore",
});

const ready = async () => {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/api/health`)).ok) return; } catch {}
    await sleep(500);
  }
  throw new Error("not ready");
};

try {
  await ready();

  const health = await (await fetch(`${BASE}/api/health`)).json();
  console.log("FRONTEND /api/health =>", JSON.stringify(health));

  const login = await fetch(`${BASE}/login`);
  const html = await login.text();
  console.log("\nGET /login =>", login.status, login.headers.get("content-type"));
  // Pull out visible text signals proving the real page rendered.
  const signals = ["MedStore", "Wholesale Pharmacy", "Sign in", "Email", "Password", "Use Admin", "Use Cashier"];
  for (const s of signals) console.log(`  contains "${s}":`, html.includes(s));
  console.log("  html bytes:", html.length);

  // Prove the mock auth round-trips through the server.
  const lr = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@medstore.test", password: "admin123" }),
  });
  const lj = await lr.json();
  console.log("\nPOST /api/auth/login =>", lr.status, "user:", lj.user?.full_name, "role:", lj.user?.role);
  const cookie = lr.headers.get("set-cookie") || "";
  console.log("  set-cookie httpOnly token:", cookie.includes("medstore_token"), "| role cookie:", cookie.includes("medstore_role"));

  console.log("\nDONE");
} catch (e) {
  console.error("ERROR:", e.message); process.exitCode = 1;
} finally { srv.kill("SIGKILL"); }
