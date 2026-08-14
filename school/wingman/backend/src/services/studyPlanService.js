import db, { transaction } from "../db/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// How "important" does an assignment need to be to earn dedicated study sessions?
function isPlanWorthy(a) {
  return (
    a.type === "exam" ||
    a.type === "quiz" ||
    a.type === "project" ||
    (a.weight_pct ?? 0) >= 8 ||
    a.difficulty >= 4
  );
}

// Total focused study time (minutes) an item deserves, based on type/weight/difficulty.
function targetMinutes(a) {
  const base = { exam: 360, quiz: 90, project: 300, homework: 90, reading: 45, assignment: 90 }[a.type] ?? 90;
  const weightMultiplier = 1 + (a.weight_pct ?? 10) / 40; // heavier grade weight -> more time
  const difficultyMultiplier = 0.6 + a.difficulty * 0.18; // 1-5 -> 0.78x-1.5x
  return Math.round(base * weightMultiplier * difficultyMultiplier);
}

function priorityScore(a, now) {
  const daysOut = Math.max(0.5, (new Date(a.due_at) - now) / DAY_MS);
  const urgency = 1 / Math.sqrt(daysOut); // closer due dates rank higher
  const weight = (a.weight_pct ?? 10) / 10;
  const difficulty = a.difficulty / 5;
  return urgency * (0.5 + weight * 0.3 + difficulty * 0.2);
}

function toMinutesSinceMidnight(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Builds a day-by-day map of free minute-ranges within the daily study window,
// with recurring class blocks and already-scheduled sessions carved out.
function buildFreeSlots({ startDate, endDate, dailyStart, dailyEnd, classBlocks, busySessions }) {
  const windowStart = toMinutesSinceMidnight(dailyStart);
  const windowEnd = toMinutesSinceMidnight(dailyEnd);
  const slotsByDay = new Map(); // 'YYYY-MM-DD' -> [{start,end}] in minutes-since-midnight

  for (let t = startDate.getTime(); t <= endDate.getTime(); t += DAY_MS) {
    const date = new Date(t);
    const dow = date.getDay();
    const dateKey = date.toISOString().slice(0, 10);

    let busy = classBlocks
      .filter((b) => b.day_of_week === dow)
      .map((b) => ({ start: toMinutesSinceMidnight(b.start_time), end: toMinutesSinceMidnight(b.end_time) }));

    busy = busy.concat(
      busySessions
        .filter((s) => s.start_at.slice(0, 10) === dateKey)
        .map((s) => ({
          start: toMinutesSinceMidnight(s.start_at.slice(11, 16)),
          end: toMinutesSinceMidnight(s.end_at.slice(11, 16)),
        }))
    );

    busy.sort((a, b) => a.start - b.start);

    const free = [];
    let cursor = windowStart;
    for (const block of busy) {
      if (block.start > cursor) free.push({ start: cursor, end: Math.min(block.start, windowEnd) });
      cursor = Math.max(cursor, block.end);
    }
    if (cursor < windowEnd) free.push({ start: cursor, end: windowEnd });

    slotsByDay.set(
      dateKey,
      free.filter((f) => f.end - f.start >= 25)
    );
  }
  return slotsByDay;
}

function minutesToTimeStr(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Greedy spaced-practice scheduler: important items get more sessions, spread
 * across the days before they're due (more frequent as the date approaches),
 * slotted into whatever time isn't already claimed by class or another session.
 */
export function generateStudyPlan({
  horizonDays = 21,
  dailyStart = "08:00",
  dailyEnd = "22:00",
  sessionMinutes = 50,
} = {}) {
  const now = new Date();
  const horizonEnd = new Date(now.getTime() + horizonDays * DAY_MS);

  const assignments = db
    .prepare(
      `SELECT * FROM assignments WHERE status = 'pending' AND due_at <= ? AND due_at >= ?`
    )
    .all(horizonEnd.toISOString(), now.toISOString())
    .filter(isPlanWorthy);

  if (assignments.length === 0) return { batch: null, sessions: [] };

  const classBlocks = db.prepare("SELECT * FROM schedule_blocks").all();
  const manualSessions = db
    .prepare("SELECT * FROM study_sessions WHERE source = 'manual' AND start_at >= ?")
    .all(now.toISOString());

  const batch = `batch-${Date.now()}`;
  db.prepare("DELETE FROM study_sessions WHERE source = 'auto' AND start_at >= ?").run(now.toISOString());

  const freeSlots = buildFreeSlots({
    startDate: now,
    endDate: horizonEnd,
    dailyStart,
    dailyEnd,
    classBlocks,
    busySessions: manualSessions,
  });

  const scored = assignments
    .map((a) => ({ ...a, _priority: priorityScore(a, now), _minutesNeeded: targetMinutes(a) }))
    .sort((a, b) => b._priority - a._priority);

  const insert = db.prepare(
    `INSERT INTO study_sessions (assignment_id, course_id, title, start_at, end_at, source, plan_batch)
     VALUES (?, ?, ?, ?, ?, 'auto', ?)`
  );
  const created = [];

  for (const a of scored) {
    const dueDate = new Date(a.due_at);
    // Study window for this item: from now (or up to 10 days before due, whichever is later) up to the due date.
    const leadStart = new Date(Math.max(now.getTime(), dueDate.getTime() - 10 * DAY_MS));
    const sessionsNeeded = Math.max(1, Math.round(a._minutesNeeded / sessionMinutes));

    // Candidate days between leadStart and due date, biased toward days closer to the deadline
    // (spaced repetition: touch it early, then ramp up frequency as the test nears).
    const candidateDays = [];
    for (let t = leadStart.getTime(); t < dueDate.getTime(); t += DAY_MS) {
      candidateDays.push(new Date(t).toISOString().slice(0, 10));
    }
    if (candidateDays.length === 0) candidateDays.push(now.toISOString().slice(0, 10));
    // Weight later days more heavily by repeating them in the pick order.
    const orderedDays = [...candidateDays].sort((d1, d2) => {
      const rank = (d) => candidateDays.indexOf(d);
      return rank(d2) - rank(d1); // closer-to-due first, so they get first pick of good slots
    });

    let placed = 0;
    let dayIdx = 0;
    let guard = 0;
    while (placed < sessionsNeeded && guard < sessionsNeeded * candidateDays.length + 20) {
      guard++;
      const dateKey = orderedDays[dayIdx % orderedDays.length];
      dayIdx++;
      const slots = freeSlots.get(dateKey);
      if (!slots) continue;

      const slotIdx = slots.findIndex((s) => s.end - s.start >= sessionMinutes);
      if (slotIdx === -1) continue;

      const slot = slots[slotIdx];
      const start = slot.start;
      const end = start + sessionMinutes;
      slot.start = end; // consume the time from the free slot
      if (slot.end - slot.start < 25) slots.splice(slotIdx, 1);

      const startAt = `${dateKey}T${minutesToTimeStr(start)}:00`;
      const endAt = `${dateKey}T${minutesToTimeStr(end)}:00`;
      const label = `Study: ${a.title}`;

      const result = insert.run(a.id, a.course_id, label, startAt, endAt, batch);
      created.push({ id: result.lastInsertRowid, assignment_id: a.id, course_id: a.course_id, title: label, start_at: startAt, end_at: endAt });
      placed++;
    }
  }

  created.sort((a, b) => a.start_at.localeCompare(b.start_at));
  return { batch, sessions: created };
}
