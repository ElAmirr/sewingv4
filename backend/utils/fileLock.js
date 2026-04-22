import fs from "fs";
import path from "path";
import { getDataDir } from "./config.js";

// We use a directory as a lock because fs.mkdirSync is atomic across processes and networks.
function getLockPath() {
  return path.join(getDataDir(), "file.lock");
}

/**
 * Acquires a global file lock.
 * Waits with retries if the lock is held by another process.
 */
export async function acquireLock(maxRetries = 100, retryWait = 100) {
  const lockPath = getLockPath();
  const STALE_TIMEOUT = 30 * 1000; // 30 seconds
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // mkdir is atomic: if it succeeds, we own the lock.
      fs.mkdirSync(lockPath);
      return true;
    } catch (err) {
      if (err.code === "EEXIST") {
        // Check if the lock is stale
        try {
          const stats = fs.statSync(lockPath);
          const age = Date.now() - stats.mtimeMs;

          if (age > STALE_TIMEOUT) {
            console.warn(`[Lock] detected stale lock (age: ${Math.round(age / 1000)}s). Forcing release.`);
            fs.rmdirSync(lockPath);
            // Don't increment retries here, just try to mkdir again immediately
            continue;
          }
        } catch (statErr) {
          // If stat fails (e.g. lock was just deleted), ignore and retry mkdir
        }

        // Lock already held and not stale, wait and retry
        retries++;
        await new Promise(resolve => setTimeout(resolve, retryWait));
      } else {
        // Unexpected error (e.g., permissions or invalid path)
        throw err;
      }
    }
  }
  throw new Error("Could not acquire file lock: Timeout");
}

/**
 * Releases the global file lock.
 */
export function releaseLock() {
  const lockPath = getLockPath();
  try {
    if (fs.existsSync(lockPath)) {
      fs.rmdirSync(lockPath);
    }
  } catch (err) {
    console.error("Error releasing lock:", err);
  }
}
