import { Router } from "express";
import db, { transaction } from "../db/index.js";

const router = Router();

// All schedule blocks, joined with course info for display/coloring.
router.get("/", (req, res) => {
  const blocks = db
    .prepare(
      `SELECT sb.*, c.name AS course_name, c.color AS course_color
       FROM schedule_blocks sb JOIN courses c ON c.id = sb.course_id
       ORDER BY sb.day_of_week, sb.start_time`
    )
    .all();
  res.json(blocks);
});

router.post("/", (req, res) => {
  const { course_id, day_of_week, start_time, end_time, location, label } = req.body;
  if (course_id == null || day_of_week == null || !start_time || !end_time) {
    return res.status(400).json({ error: "course_id, day_of_week, start_time, end_time are required" });
  }
  const result = db
    .prepare(
      "INSERT INTO schedule_blocks (course_id, day_of_week, start_time, end_time, location, label) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(course_id, day_of_week, start_time, end_time, location || null, label || "Class");
  res.status(201).json(db.prepare("SELECT * FROM schedule_blocks WHERE id = ?").get(result.lastInsertRowid));
});

// Bulk import - used by the "import a schedule" feature (e.g. pasted rows or a simple table).
// Expects { blocks: [{ course_id, day_of_week, start_time, end_time, location, label }, ...] }
router.post("/bulk", (req, res) => {
  const { blocks } = req.body;
  if (!Array.isArray(blocks)) return res.status(400).json({ error: "blocks must be an array" });
  const insert = db.prepare(
    "INSERT INTO schedule_blocks (course_id, day_of_week, start_time, end_time, location, label) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertMany = transaction((rows) => {
    for (const b of rows) {
      insert.run(b.course_id, b.day_of_week, b.start_time, b.end_time, b.location || null, b.label || "Class");
    }
  });
  insertMany(blocks);
  res.status(201).json({ imported: blocks.length });
});

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM schedule_blocks WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Block not found" });
  res.status(204).end();
});

export default router;
