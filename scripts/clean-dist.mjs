import { rmSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(process.cwd(), "dist");
const RETRYABLE_CODES = new Set(["ENOTEMPTY", "EBUSY", "EPERM"]);
const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MS = 80;

const sleepSync = (ms) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    // Busy-wait is acceptable for this short-lived build cleanup script.
  }
};

let lastError = null;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  try {
    rmSync(distDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: RETRY_DELAY_MS,
    });
    console.log(`DIST_CLEANED ${distDir}`);
    lastError = null;
    break;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (!RETRYABLE_CODES.has(code) || attempt === MAX_ATTEMPTS) {
      lastError = error;
      break;
    }
    sleepSync(RETRY_DELAY_MS * attempt);
  }
}

if (lastError) {
  throw lastError;
}
