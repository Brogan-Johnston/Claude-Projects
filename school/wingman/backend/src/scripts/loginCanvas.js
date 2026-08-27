// Standalone script, run as its own OS process by canvasScrapeService.startLogin() - never
// imported into the server. Opens a real, visible browser window against the school's Canvas
// login (which may bounce through an SSO/Duo flow) so the user can sign in themselves; Wingman
// never sees the password. Exits once the user is back on the Canvas host off any /login path,
// or closes the window themselves.
import { chromium } from "playwright";
import { STABLE_LAUNCH_ARGS } from "./launchArgs.js";

const profileDir = process.argv[2];
const baseUrl = process.argv[3];
if (!profileDir || !baseUrl) {
  console.error("Usage: node loginCanvas.js <profileDir> <baseUrl>");
  process.exit(1);
}

function isCanvasHost(url) {
  try {
    return new URL(url).host === new URL(baseUrl).host;
  } catch {
    return false;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: null,
    args: ["--start-maximized", ...STABLE_LAUNCH_ARGS],
  });

  let page = context.pages()[0] ?? (await context.newPage());
  let crashed = false;
  page.on("crash", () => {
    crashed = true;
  });

  // The renderer process behind a page can crash independently of the browser itself (seen
  // on some Windows GPU driver setups even with GPU compositing disabled). Recreate the page
  // and keep going instead of letting the whole login flow die out from under the user.
  async function ensureLivePage() {
    if (!crashed) return;
    crashed = false;
    page = await context.newPage();
    page.on("crash", () => {
      crashed = true;
    });
    await page.goto(`${baseUrl}/courses`, { waitUntil: "domcontentloaded" }).catch(() => {});
  }

  await page.goto(`${baseUrl}/courses`, { waitUntil: "domcontentloaded" }).catch(() => {});

  // No single DOM selector works across every school's SSO provider (SAML, Duo, CAS, ...), so
  // this polls the current URL instead: once we're back on the Canvas host and not on a
  // /login path, the user is signed in. A plain timer (not page.waitForTimeout) drives the
  // wait so a mid-flow renderer crash can't throw out of the loop.
  const deadline = Date.now() + 15 * 60 * 1000; // give up after 15 minutes rather than hang forever
  while (context.pages().length > 0 && Date.now() < deadline) {
    await ensureLivePage();
    try {
      const url = page.url();
      if (isCanvasHost(url) && !/\/login/i.test(new URL(url).pathname)) break;
    } catch {
      // page mid-navigation or was just recreated - just keep polling
    }
    await delay(1000);
  }

  await context.close().catch(() => {});
}

run()
  .catch((err) => {
    console.error("loginCanvas.js:", err.message);
  })
  .finally(() => process.exit(0));
