import { Router } from "express";
import db from "../db/index.js";

const router = Router();

router.get("/", (req, res) => {
  const courses = db.prepare("SELECT * FROM courses ORDER BY name").all();
  res.json(courses);
});

router.post("/", (req, res) => {
  const { name, code, instructor, color, credit_hours } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const result = db
    .prepare(
      "INSERT INTO courses (name, code, instructor, color, credit_hours) VALUES (?, ?, ?, ?, ?)"
    )
    .run(name, code || null, instructor || null, color || "#B9603A", credit_hours || null);
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(course);
});

router.put("/:id", (req, res) => {
  const { name, code, instructor, color, credit_hours } = req.body;
  const existing = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Course not found" });
  db.prepare(
    "UPDATE courses SET name = ?, code = ?, instructor = ?, color = ?, credit_hours = ? WHERE id = ?"
  ).run(
    name ?? existing.name,
    code ?? existing.code,
    instructor ?? existing.instructor,
    color ?? existing.color,
    credit_hours ?? existing.credit_hours,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM courses WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Course not found" });
  res.status(204).end();
});

export default router;
