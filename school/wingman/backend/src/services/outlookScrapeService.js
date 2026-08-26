import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "..", "data");
const PROFILE_DIR = path.join(dataDir, "outlook-profile");
const INBOX_URL = "https://outlook.live.com/mail/0/inbox";

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

export async function closeSharedContext() {
  if (!contextPromise) return;
  const ctx = await contextPromise.catch(() => null);
  contextPromise = null;
  if (ctx) await ctx.close().catch(() => {});
}

// Opens a real, visible browser window for the user to log into their personal Outlook
// account themselves - Wingman never sees or stores a password. Runs as a separate,
// detached OS process (not just a headed page in the shared context) so it can hold the
// profile-directory lock on its own for as long as the user needs, without racing the
// headless context used for scraping.
export async function startLogin() {
  await closeSharedContext();
  const scriptPath = path.join(__dirname, "..", "scripts", "loginOutlook.js");
  const child = spawn(process.execPath, [scriptPath, PROFILE_DIR], { detached: true, stdio: "ignore" });
  child.unref();
  return { started: true };
}

async function isLoggedIn(page) {
  await page.goto(INBOX_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
  if (/login\.live\.com|login\.microsoftonline\.com/i.test(page.url())) return false;
  try {
    await page.getByRole("searchbox").first().waitFor({ timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

export async function isConnected() {
  if (!fs.existsSync(PROFILE_DIR)) return false;
  try {
    const ctx = await getSharedContext();
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    return await isLoggedIn(page);
  } catch {
    // Profile may be locked by an in-progress login window - treat as "not confirmed yet"
    // rather than surfacing an error for what is likely a transient state.
    return false;
  }
}

// Scrapes the OWA message list via ARIA role/label locators (the most durable surface OWA
// exposes). No exact selector is guaranteed stable across Microsoft's UI changes - if this
// starts failing, re-check the current markup with:
//   npx playwright codegen https://outlook.live.com/mail/0/inbox
export async function fetchRecentEmails(count = 8) {
  const ctx = await getSharedContext();
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    const err = new Error("Outlook isn't logged in. Go to Settings and log in again.");
    err.status = 401;
    throw err;
  }

  try {
    const rows = page.getByRole("option");
    await rows.first().waitFor({ timeout: 10000 });
    const n = Math.min(count, await rows.count());
    const out = [];
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      const label = (await row.getAttribute("aria-label")) || (await row.innerText());
      const isRead = !/unread/i.test(label);
      const parts = label.split(",").map((s) => s.trim());
      const timePart = parts.find((p) => /\d/.test(p) && /(am|pm|:)/i.test(p));
      out.push({
        id: `${i}-${label.slice(0, 40)}`,
        from: parts[0] || "Unknown",
        subject: parts[1] || "(no subject)",
        receivedAt: timePart || "",
        isRead,
        link: INBOX_URL,
      });
    }
    return out;
  } catch {
    const err = new Error(
      "Couldn't read your inbox - Outlook's page layout may have changed. Try Settings > Outlook > Check connection, or log in again."
    );
    err.status = 502;
    throw err;
  }
}

export async function disconnect() {
  await closeSharedContext();
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
}
