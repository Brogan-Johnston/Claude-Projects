import { Router } from "express";
import db from "../db/index.js";

const router = Router();

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, c.name AS course_name, c.color AS course_color
       FROM assignments a JOIN courses c ON c.id = a.course_id
       ORDER BY a.due_at ASC`
    )
    .all();
  res.json(rows);
});

router.post("/", (req, res) => {
  const { course_id, title, type, due_at, weight_pct, difficulty, notes, source } = req.body;
  if (!course_id || !title || !due_at) {
    return res.status(400).json({ error: "course_id, title, due_at are required" });
  }
  const result = db
    .prepare(
      `INSERT INTO assignments (course_id, title, type, due_at, weight_pct, difficulty, notes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      course_id,
      title,
      type || "assignment",
      due_at,
      weight_pct ?? null,
      difficulty ?? 3,
      notes || null,
      source || "manual"
    );
  res.status(201).json(db.prepare("SELECT * FROM assignments WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM assignments WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Assignment not found" });
  const merged = { ...existing, ...req.body };
  db.prepare(
    `UPDATE assignments SET title=?, type=?, due_at=?, weight_pct=?, difficulty=?, status=?, notes=?, course_id=?
     WHERE id=?`
  ).run(
    merged.title,
    merged.type,
    merged.due_at,
    merged.weight_pct,
    merged.difficulty,
    merged.status,
    merged.notes,
    merged.course_id,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM assignments WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM assignments WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Assignment not found" });
  res.status(204).end();
});

export default router;
