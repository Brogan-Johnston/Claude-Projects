import db from "../db/index.js";
import { createBrowserSession } from "./browserSession.js";

const session = createBrowserSession("canvas-profile");

function getBaseUrl() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'canvas_base_url'").get();
  return (row?.value || "https://utk.instructure.com").replace(/\/+$/, "");
}

export async function closeSharedContext() {
  await session.closeSharedContext();
}

export async function startLogin() {
  return session.startLogin("loginCanvas.js", [getBaseUrl()]);
}

export async function disconnect() {
  await session.disconnect();
}

function isCanvasHost(url, baseUrl) {
  try {
    return new URL(url).host === new URL(baseUrl).host;
  } catch {
    return false;
  }
}

async function isLoggedIn(page) {
  const baseUrl = getBaseUrl();
  await page.goto(`${baseUrl}/courses`, { waitUntil: "domcontentloaded", timeout: 20000 });
  if (!isCanvasHost(page.url(), baseUrl)) return false; // bounced off to an SSO provider
  if (/\/login/i.test(new URL(page.url()).pathname)) return false;
  return true;
}

export async function isConnected() {
  if (!session.isProfileInitialized()) return false;
  try {
    const ctx = await session.getSharedContext();
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    return await isLoggedIn(page);
  } catch {
    return false;
  }
}

async function requireLoggedIn(page) {
  if (!(await isLoggedIn(page))) {
    const err = new Error("Canvas isn't logged in. Go to Settings and log in again.");
    err.status = 401;
    throw err;
  }
}

// Scrapes the "/courses" list via its href pattern rather than exact markup/classnames,
// since a link's target URL is the most durable thing Canvas exposes here. If this stops
// finding courses, re-check the current markup with:
//   npx playwright codegen <base>/courses
export async function listCourses() {
  const ctx = await session.getSharedContext();
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await requireLoggedIn(page);
  const baseUrl = getBaseUrl();
  await page.goto(`${baseUrl}/courses`, { waitUntil: "domcontentloaded" });

  const links = page.locator('a[href^="/courses/"]');
  await links.first().waitFor({ timeout: 10000 }).catch(() => {});
  const n = await links.count();
  const seen = new Map();
  for (let i = 0; i < n; i++) {
    const href = await links.nth(i).getAttribute("href");
    const match = href && href.match(/^\/courses\/(\d+)\/?$/);
    if (!match) continue;
    const id = Number(match[1]);
    if (seen.has(id)) continue;
    const text = (await links.nth(i).innerText()).trim();
    if (text) seen.set(id, text);
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name, course_code: null }));
}

function inferEventType(title = "") {
  const t = title.toLowerCase();
  if (/\b(exam|midterm|final)\b/.test(t)) return "exam";
  if (/\bquiz\b/.test(t)) return "quiz";
  return "assignment";
}

// Canvas renders due dates as free text like "Sep 15, 2026 by 11:59pm" - this is a best-effort
// parse, not a guarantee. Rows whose date can't be parsed (multi-section "Multiple Dates" rows,
// undated items, unusual phrasing) are skipped rather than guessed at.
function parseSyllabusDate(text) {
  const m = text.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})(?:\s+by\s+(\d{1,2}:\d{2})\s*([ap]m)?)?/i);
  if (!m) return null;
  const [, datePart, time, ampm] = m;
  const dateStr = time ? `${datePart} ${time}${ampm ? ` ${ampm.toUpperCase()}` : ""}` : datePart;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: time ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : null,
  };
}

// Canvas's Syllabus page ("Course Summary" table) is the most stable page for a full list of
// a course's graded items and dates in one place - no per-assignment API calls needed. If rows
// come back empty, re-check the markup with:
//   npx playwright codegen <base>/courses/<id>/assignments/syllabus
// Note: unlike the old token-based API, this can't see assignment-group weights, so
// weight_pct always comes back null here - add it by hand after import if you want it tracked.
export async function fetchSyllabusItems(canvasCourseId) {
  const ctx = await session.getSharedContext();
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await requireLoggedIn(page);
  const baseUrl = getBaseUrl();
  await page.goto(`${baseUrl}/courses/${canvasCourseId}/assignments/syllabus`, { waitUntil: "domcontentloaded" });

  try {
    const rows = page.locator("#syllabus tr");
    await rows.first().waitFor({ timeout: 10000 });
    const n = await rows.count();
    const items = [];
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      const link = row.locator('a[href*="/assignments/"], a[href*="/quizzes/"]').first();
      if ((await link.count()) === 0) continue;
      const href = await link.getAttribute("href");
      const idMatch = href && href.match(/\/(assignments|quizzes)\/(\d+)/);
      if (!idMatch) continue;
      const title = (await link.innerText()).trim();
      if (!title) continue;
      const due = parseSyllabusDate(await row.innerText());
      if (!due) continue; // no parseable date - nothing to schedule
      items.push({
        external_id: `${idMatch[1]}-${idMatch[2]}`,
        title,
        type: inferEventType(title),
        due_date: due.date,
        due_time: due.time,
        weight_pct: null,
        confidence: "medium",
      });
    }
    return items;
  } catch {
    const err = new Error(
      "Couldn't read that course's syllabus page - Canvas's layout may differ here. Try opening the syllabus in a browser to confirm it lists dates."
    );
    err.status = 502;
    throw err;
  }
}

export async function fetchCanvasPreview(courseId, canvasCourseId) {
  const items = await fetchSyllabusItems(canvasCourseId);
  const existing = new Set(
    db
      .prepare("SELECT external_id FROM assignments WHERE course_id = ? AND source = 'canvas'")
      .all(courseId)
      .map((r) => r.external_id)
  );
  return items.map((item) => ({ ...item, already_imported: existing.has(item.external_id) }));
}
