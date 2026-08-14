import { Router } from "express";
import db from "../db/index.js";
import { generateStudyPlan } from "../services/studyPlanService.js";

const router = Router();

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT ss.*, c.name AS course_name, c.color AS course_color, a.title AS assignment_title, a.due_at AS assignment_due_at
       FROM study_sessions ss
       LEFT JOIN courses c ON c.id = ss.course_id
       LEFT JOIN assignments a ON a.id = ss.assignment_id
       ORDER BY ss.start_at ASC`
    )
    .all();
  res.json(rows);
});

router.post("/generate", (req, res, next) => {
  try {
    const { horizon_days, daily_start, daily_end, session_minutes } = req.body || {};
    const result = generateStudyPlan({
      horizonDays: horizon_days,
      dailyStart: daily_start,
      dailyEnd: daily_end,
      sessionMinutes: session_minutes,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM study_sessions WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Session not found" });
  const merged = { ...existing, ...req.body };
  db.prepare(
    "UPDATE study_sessions SET title=?, start_at=?, end_at=?, status=? WHERE id=?"
  ).run(merged.title, merged.start_at, merged.end_at, merged.status, req.params.id);
  res.json(db.prepare("SELECT * FROM study_sessions WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM study_sessions WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Session not found" });
  res.status(204).end();
});

export default router;
