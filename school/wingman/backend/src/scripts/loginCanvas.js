// Standalone script, run as its own OS process by canvasScrapeService.startLogin() - never
// imported into the server. Opens a real, visible browser window against the school's Canvas
// login (which may bounce through an SSO/Duo flow) so the user can sign in themselves; Wingman
// never sees the password. Exits once the user is back on the Canvas host off any /login path,
// or closes the window themselves.
import { chromium } from "playwright";

const profileDir = process.argv[2];
const baseUrl = process.argv[3];
if (!profileDir || !baseUrl) {
  console.error("Usage: node loginCanvas.js <profileDir> <baseUrl>");
  process.exit(1);
}

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: null,
  args: ["--start-maximized"],
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto(`${baseUrl}/courses`, { waitUntil: "domcontentloaded" });

function isCanvasHost(url) {
  try {
    return new URL(url).host === new URL(baseUrl).host;
  } catch {
    return false;
  }
}

// No single DOM selector works across every school's SSO provider (SAML, Duo, CAS, ...), so
// this polls the current URL instead: once we're back on the Canvas host and not on a /login
// path, the user is signed in.
async function waitForLogin() {
  while (!page.isClosed()) {
    try {
      const url = page.url();
      if (isCanvasHost(url) && !/\/login/i.test(new URL(url).pathname)) return;
    } catch {
      // page navigating between origins can transiently throw - just keep polling
    }
    await page.waitForTimeout(1000);
  }
}

await Promise.race([waitForLogin(), context.waitForEvent("close").catch(() => {})]);
await context.close().catch(() => {});
process.exit(0);
