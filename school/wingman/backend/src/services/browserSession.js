import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "..", "data");

// Shared plumbing for any integration that signs into a real website via a persistent,
// gitignored Chromium profile and reads it back afterward (Outlook, Canvas). Each integration
// gets its own profile directory so disconnecting one never logs the other out, even though
// both reuse this same launch/retry/shutdown logic.
export function createBrowserSession(profileDirName) {
  const PROFILE_DIR = path.join(dataDir, profileDirName);
  let contextPromise = null;

  // A prior `node --watch` restart can leave an orphaned Chromium holding the profile-dir
  // lock (especially on Windows, where SIGTERM isn't reliably delivered to child processes).
  // One retry after a short delay covers the common case where Windows has already reaped it.
  async function launchWithRetry(opts, attempt = 0) {
    try {
      return await chromium.launchPersistentContext(PROFILE_DIR, opts);
    } catch (err) {
      if (attempt === 0 && /lock|already in use|singleton/i.test(String(err.message))) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        return launchWithRetry(opts, attempt + 1);
      }
      throw err;
    }
  }

  function getSharedContext() {
    if (!contextPromise) {
      contextPromise = launchWithRetry({ headless: true, viewport: { width: 1280, height: 900 } }).catch((err) => {
        contextPromise = null;
        throw err;
      });
    }
    return contextPromise;
  }

  async function closeSharedContext() {
    if (!contextPromise) return;
    const ctx = await contextPromise.catch(() => null);
    contextPromise = null;
    if (ctx) await ctx.close().catch(() => {});
  }

  function isProfileInitialized() {
    return fs.existsSync(PROFILE_DIR);
  }

  // Opens a real, visible browser window for the user to log in themselves - Wingman never
  // sees or stores a password. Runs as a separate, detached OS process (not just a headed
  // page in the shared context) so it can hold the profile-directory lock on its own for as
  // long as the user needs, without racing the headless context used for scraping.
  async function startLogin(scriptName, extraArgs = []) {
    await closeSharedContext();
    const scriptPath = path.join(__dirname, "..", "scripts", scriptName);
    const child = spawn(process.execPath, [scriptPath, PROFILE_DIR, ...extraArgs], { detached: true, stdio: "ignore" });
    child.unref();
    return { started: true };
  }

  async function disconnect() {
    await closeSharedContext();
    fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  }

  return { getSharedContext, closeSharedContext, isProfileInitialized, startLogin, disconnect, profileDir: PROFILE_DIR };
}
