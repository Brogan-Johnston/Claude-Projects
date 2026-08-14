import { Router } from "express";
import db from "../db/index.js";

const router = Router();
const DAY_MS = 24 * 60 * 60 * 1000;

// Expands recurring weekly schedule_blocks into concrete dated instances within [start, end].
function expandClassBlocks(start, end) {
  const blocks = db
    .prepare(
      `SELECT sb.*, c.name AS course_name, c.color AS course_color
       FROM schedule_blocks sb JOIN courses c ON c.id = sb.course_id`
    )
    .all();

  const instances = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const date = new Date(t);
    const dow = date.getDay();
    const dateKey = date.toISOString().slice(0, 10);
    for (const b of blocks.filter((b) => b.day_of_week === dow)) {
      instances.push({
        id: `class-${b.id}-${dateKey}`,
        kind: "class",
        course_id: b.course_id,
        course_name: b.course_name,
        course_color: b.course_color,
        title: `${b.course_name} — ${b.label}`,
        location: b.location,
        start_at: `${dateKey}T${b.start_time}:00`,
        end_at: `${dateKey}T${b.end_time}:00`,
      });
    }
  }
  return instances;
}

// GET /api/calendar?start=ISO&end=ISO - everything happening in that window, one merged feed.
router.get("/", (req, res) => {
  const start = req.query.start ? new Date(req.query.start) : new Date();
  const end = req.query.end ? new Date(req.query.end) : new Date(start.getTime() + 7 * DAY_MS);

  const classes = expandClassBlocks(start, end);

  const assignments = db
    .prepare(
      `SELECT a.id, a.title, a.type, a.due_at, a.weight_pct, a.status, a.course_id,
              c.name AS course_name, c.color AS course_color
       FROM assignments a JOIN courses c ON c.id = a.course_id
       WHERE a.due_at BETWEEN ? AND ?`
    )
    .all(start.toISOString(), end.toISOString())
    .map((a) => ({
      id: `assignment-${a.id}`,
      kind: "assignment",
      assignment_id: a.id,
      course_id: a.course_id,
      course_name: a.course_name,
      course_color: a.course_color,
      title: a.title,
      type: a.type,
      status: a.status,
      start_at: a.due_at,
      end_at: a.due_at,
    }));

  const studySessions = db
    .prepare(
      `SELECT ss.id, ss.title, ss.start_at, ss.end_at, ss.status, ss.course_id,
              c.name AS course_name, c.color AS course_color
       FROM study_sessions ss LEFT JOIN courses c ON c.id = ss.course_id
       WHERE ss.start_at BETWEEN ? AND ?`
    )
    .all(start.toISOString(), end.toISOString())
    .map((s) => ({
      id: `study-${s.id}`,
      kind: "study",
      session_id: s.id,
      course_id: s.course_id,
      course_name: s.course_name,
      course_color: s.course_color || "#7C8B6F",
      title: s.title,
      status: s.status,
      start_at: s.start_at,
      end_at: s.end_at,
    }));

  res.json({ classes, assignments, study_sessions: studySessions });
});

export default router;
