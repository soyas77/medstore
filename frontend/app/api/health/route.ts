import { NextResponse } from "next/server";

/**
 * Frontend liveness endpoint used by the Docker/nginx healthchecks.
 * Optionally pings the backend's /health to report upstream status.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  let backend: string = "unknown";
  if (apiUrl && process.env.NEXT_PUBLIC_USE_MOCK_API !== "1") {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(t);
      backend = res.ok ? "ok" : `error:${res.status}`;
    } catch {
      backend = "unreachable";
    }
  } else {
    backend = "mock";
  }

  return NextResponse.json(
    {
      status: "ok",
      service: "medstore-frontend",
      version,
      backend,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
