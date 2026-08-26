// Standalone script, run as its own OS process by outlookScrapeService.startLogin() - never
// imported into the server. Opens a real, visible browser window against the user's personal
// Outlook.com account so they can log in (including any MFA) themselves; Wingman never sees
// the password. Exits once the user closes the window or the inbox becomes visible.
import { chromium } from "playwright";

const profileDir = process.argv[2];
if (!profileDir) {
  console.error("Usage: node loginOutlook.js <profileDir>");
  process.exit(1);
}

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: null,
  args: ["--start-maximized"],
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto("https://outlook.live.com/mail/0/inbox", { waitUntil: "domcontentloaded" });

await Promise.race([
  page
    .getByRole("searchbox")
    .first()
    .waitFor({ timeout: 0 })
    .catch(() => {}),
  context.waitForEvent("close").catch(() => {}),
]);

await context.close().catch(() => {});
process.exit(0);
