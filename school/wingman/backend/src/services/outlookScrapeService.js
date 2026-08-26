import { createBrowserSession } from "./browserSession.js";

const session = createBrowserSession("outlook-profile");
const INBOX_URL = "https://outlook.live.com/mail/0/inbox";

export async function closeSharedContext() {
  await session.closeSharedContext();
}

export async function startLogin() {
  return session.startLogin("loginOutlook.js");
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
  if (!session.isProfileInitialized()) return false;
  try {
    const ctx = await session.getSharedContext();
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
  const ctx = await session.getSharedContext();
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
  await session.disconnect();
}
