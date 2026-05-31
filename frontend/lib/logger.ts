/**
 * Structured logging via pino.
 *
 * - Server-side: real pino instance (JSON in prod, pretty in dev if available).
 * - Browser: pino's lightweight browser build (console-backed).
 *
 * Import the singleton `logger` and use logger.info({...}, "message").
 */

import pino, { type Logger } from "pino";

const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL ?? (isProd ? "info" : "debug");

export const logger: Logger = pino({
  level,
  base: { service: "medstore-frontend" },
  // In production emit JSON; in dev keep it readable. We avoid pino-pretty as a
  // hard dependency so the standalone build stays slim.
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
