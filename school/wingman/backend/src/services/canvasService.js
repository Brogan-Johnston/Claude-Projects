import db from "../db/index.js";

function getConfig() {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('canvas_base_url', 'canvas_token')").all();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const baseUrl = (settings.canvas_base_url || "").replace(/\/+$/, "") || null;
  const token = settings.canvas_token || null;
  return { baseUrl, token };
}

export function isConfigured() {
  const { baseUrl, token } = getConfig();
  return Boolean(baseUrl && token);
}

function requireConfig() {
  const { baseUrl, token } = getConfig();
  if (!baseUrl || !token) {
    const err = new Error("Canvas isn't configured yet. Add your base URL and access token in Settings.");
    err.status = 400;
    throw err;
  }
  return { baseUrl, token };
}

// Follows Canvas's Link: rel="next" pagination header until exhausted.
async function canvasGet(path, params = {}) {
  const { baseUrl, token } = requireConfig();
  const qs = new URLSearchParams({ per_page: "100", ...params });
  let url = `${baseUrl}/api/v1${path}${path.includes("?") ? "&" : "?"}${qs}`;
  const out = [];
  while (url) {
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) {
      const err = new Error("Canvas request failed. Check your base URL and access token in Settings.");
      err.status = resp.status === 401 ? 401 : 502;
      throw err;
    }
    const body = await resp.json();
    out.push(...(Array.isArray(body) ? body : [body]));
    const link = resp.headers.get("link") || "";
    const next = link.split(",").find((s) => s.includes('rel="next"'));
    url = next ? next.split(";")[0].trim().slice(1, -1) : null;
  }
  return out;
}

export async function listCourses() {
  const courses = await canvasGet("/courses", { enrollment_state: "active" });
  return courses.map((c) => ({ id: c.id, name: c.name, course_code: c.course_code }));
}

function toLocalDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return { due_date: d.toISOString().slice(0, 10), due_time: d.toISOString().slice(11, 16) };
}

function inferEventType(title = "") {
  const t = title.toLowerCase();
  if (/\b(exam|midterm|final)\b/.test(t)) return "exam";
  if (/\bquiz\b/.test(t)) return "quiz";
  return "assignment";
}

// Canvas weights grading at the assignment-group level, not per assignment, so weight_pct
// here is an approximation: a course's group weight, attached to every assignment in that
// group, only when the course actually turns weighting on. Anything less certain is left
// null rather than fabricated.
async function weightByGroupId(canvasCourseId) {
  const [course] = await canvasGet(`/courses/${canvasCourseId}`);
  if (!course?.apply_assignment_group_weights) return new Map();
  const groups = await canvasGet(`/courses/${canvasCourseId}/assignment_groups`);
  return new Map(groups.map((g) => [g.id, g.group_weight]));
}

export async function fetchAssignments(canvasCourseId) {
  const [weights, raw] = await Promise.all([
    weightByGroupId(canvasCourseId),
    canvasGet(`/courses/${canvasCourseId}/assignments`),
  ]);
  return raw
    .map((a) => {
      const dueIso = a.due_at;
      if (!dueIso) return null; // no date to schedule - skip rather than guess
      const { due_date, due_time } = toLocalDateTime(dueIso);
      const weight_pct = weights.has(a.assignment_group_id) ? weights.get(a.assignment_group_id) : null;
      return {
        external_id: `assignment-${a.id}`,
        title: a.name,
        type: "assignment",
        due_date,
        due_time,
        weight_pct,
        confidence: weight_pct != null ? "medium" : "low",
      };
    })
    .filter(Boolean);
}

export async function fetchCalendarEvents(canvasCourseId) {
  const raw = await canvasGet("/calendar_events", {
    type: "event",
    "context_codes[]": `course_${canvasCourseId}`,
    all_events: "true",
  });
  return raw
    .map((e) => {
      const dt = toLocalDateTime(e.start_at);
      if (!dt) return null;
      return {
        external_id: `event-${e.id}`,
        title: e.title,
        type: inferEventType(e.title),
        due_date: dt.due_date,
        due_time: dt.due_time,
        weight_pct: null,
        confidence: "medium",
      };
    })
    .filter(Boolean);
}

export async function fetchCanvasPreview(courseId, canvasCourseId) {
  const [assignments, events] = await Promise.all([
    fetchAssignments(canvasCourseId),
    fetchCalendarEvents(canvasCourseId),
  ]);
  const existing = new Set(
    db
      .prepare("SELECT external_id FROM assignments WHERE course_id = ? AND source = 'canvas'")
      .all(courseId)
      .map((r) => r.external_id)
  );
  return [...assignments, ...events].map((item) => ({
    ...item,
    already_imported: existing.has(item.external_id),
  }));
}
