// Standalone script, run as its own OS process by outlookScrapeService.startLogin() - never
// imported into the server. Opens a real, visible browser window against the user's personal
// Outlook.com account so they can log in (including any MFA) themselves; Wingman never sees
// the password. Exits once the user closes the window or the inbox becomes visible.
import { chromium } from "playwright";
import { STABLE_LAUNCH_ARGS } from "./launchArgs.js";

const profileDir = process.argv[2];
if (!profileDir) {
  console.error("Usage: node loginOutlook.js <profileDir>");
  process.exit(1);
}

const INBOX_URL = "https://outlook.live.com/mail/0/inbox";

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
    await page.goto(INBOX_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
  }

  await page.goto(INBOX_URL, { waitUntil: "domcontentloaded" }).catch(() => {});

  // Polls for the inbox's search box (a reliable "you're signed in" landmark) instead of an
  // indefinite Playwright wait, so a mid-flow renderer crash can't throw out of the loop.
  const deadline = Date.now() + 15 * 60 * 1000; // give up after 15 minutes rather than hang forever
  while (context.pages().length > 0 && Date.now() < deadline) {
    await ensureLivePage();
    try {
      if ((await page.getByRole("searchbox").first().count()) > 0) break;
    } catch {
      // page mid-navigation or was just recreated - just keep polling
    }
    await delay(1000);
  }

  await context.close().catch(() => {});
}

run()
  .catch((err) => {
    console.error("loginOutlook.js:", err.message);
  })
  .finally(() => process.exit(0));
