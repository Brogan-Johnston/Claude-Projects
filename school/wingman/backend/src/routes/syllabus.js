import { Router } from "express";
import multer from "multer";
import db, { transaction } from "../db/index.js";
import { extractText } from "../services/textExtract.js";
import { extractSyllabusItems } from "../services/claudeService.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Upload a syllabus, get back Claude's best-effort extraction of graded items.
// Nothing is written to `assignments` yet - the frontend shows a preview and the
// student confirms/edits before POSTing to /commit.
router.post("/parse", upload.single("file"), async (req, res, next) => {
  try {
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ error: "course_id is required" });
    if (!req.file) return res.status(400).json({ error: "file is required" });

    const rawText = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!rawText || rawText.trim().length < 20) {
      return res.status(422).json({ error: "Could not read any text from that file." });
    }

    const items = await extractSyllabusItems(rawText);

    const result = db
      .prepare("INSERT INTO syllabi (course_id, filename, raw_text) VALUES (?, ?, ?)")
      .run(course_id, req.file.originalname, rawText);

    res.json({ syllabus_id: result.lastInsertRowid, items });
  } catch (err) {
    next(err);
  }
});

// Commit a (possibly edited) list of items from a previously parsed syllabus into assignments.
router.post("/:id/commit", (req, res, next) => {
  try {
    const syllabus = db.prepare("SELECT * FROM syllabi WHERE id = ?").get(req.params.id);
    if (!syllabus) return res.status(404).json({ error: "Syllabus not found" });

    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "items must be an array" });

    const insert = db.prepare(
      `INSERT INTO assignments (course_id, title, type, due_at, weight_pct, difficulty, source)
       VALUES (?, ?, ?, ?, ?, ?, 'syllabus')`
    );
    const insertMany = transaction((rows) => {
      for (const item of rows) {
        const dueAt = item.due_time
          ? `${item.due_date}T${item.due_time}:00`
          : `${item.due_date}T23:59:00`;
        insert.run(
          syllabus.course_id,
          item.title,
          item.type || "assignment",
          dueAt,
          item.weight_pct ?? null,
          item.type === "exam" ? 4 : 3
        );
      }
    });
    insertMany(items);

    res.status(201).json({ imported: items.length });
  } catch (err) {
    next(err);
  }
});

export default router;
