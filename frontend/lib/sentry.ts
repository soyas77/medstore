/**
 * Optional Sentry initialisation.
 *
 * Sentry is fully DISABLED when NEXT_PUBLIC_SENTRY_DSN is empty/unset, so the
 * app runs with zero telemetry by default. Call `initSentry()` from a client
 * component (e.g. the Providers tree) — it is a no-op without a DSN, and also a
 * no-op if @sentry/nextjs is not installed.
 */

let initialised = false;

export function initSentry(): boolean {
  if (initialised) return true;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return false;

  // The module name is hidden from webpack's static analysis (variable +
  // webpackIgnore) so `@sentry/nextjs` stays a truly OPTIONAL runtime
  // dependency: the app builds and runs whether or not it is installed.
  const moduleName = "@sentry/nextjs";
  try {
    import(/* webpackIgnore: true */ moduleName)
      .then((Sentry: { init: (opts: Record<string, unknown>) => void }) => {
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV,
          tracesSampleRate: Number(
            process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"
          ),
          release: process.env.NEXT_PUBLIC_APP_VERSION,
        });
        initialised = true;
      })
      .catch(() => {
        /* @sentry/nextjs not installed — silently skip */
      });
  } catch {
    return false;
  }
  return true;
}
