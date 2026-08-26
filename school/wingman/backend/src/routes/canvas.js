import { Router } from "express";
import db, { transaction } from "../db/index.js";
import { isConfigured, listCourses, fetchCanvasPreview } from "../services/canvasService.js";

const router = Router();

router.get("/status", (req, res) => {
  res.json({ configured: isConfigured() });
});

router.get("/courses", async (req, res, next) => {
  try {
    res.json(await listCourses());
  } catch (err) {
    next(err);
  }
});

router.post("/courses/:id/link", (req, res) => {
  const { canvas_course_id } = req.body;
  db.prepare("UPDATE courses SET canvas_course_id = ? WHERE id = ?").run(canvas_course_id, req.params.id);
  res.json(db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id));
});

router.post("/courses/:id/sync-preview", async (req, res, next) => {
  try {
    const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    if (!course.canvas_course_id) return res.status(400).json({ error: "Link a Canvas course first" });
    const items = await fetchCanvasPreview(course.id, course.canvas_course_id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post("/courses/:id/commit", (req, res, next) => {
  try {
    const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "items must be an array" });

    const upsert = db.prepare(`
      INSERT INTO assignments (course_id, title, type, due_at, weight_pct, difficulty, source, external_id)
      VALUES (?, ?, ?, ?, ?, ?, 'canvas', ?)
      ON CONFLICT (course_id, external_id) WHERE source = 'canvas' AND external_id IS NOT NULL
      DO UPDATE SET title = excluded.title, type = excluded.type, due_at = excluded.due_at, weight_pct = excluded.weight_pct
    `);
    const run = transaction((rows) => {
      for (const item of rows) {
        const dueAt = item.due_time ? `${item.due_date}T${item.due_time}:00` : `${item.due_date}T23:59:00`;
        upsert.run(
          course.id,
          item.title,
          item.type || "assignment",
          dueAt,
          item.weight_pct ?? null,
          item.type === "exam" ? 4 : 3,
          item.external_id
        );
      }
    });
    run(items);

    res.status(201).json({ imported: items.length });
  } catch (err) {
    next(err);
  }
});

export default router;
