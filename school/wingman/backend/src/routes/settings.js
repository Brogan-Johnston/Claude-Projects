import { Router } from "express";
import db from "../db/index.js";

const router = Router();

const PUBLIC_KEYS = ["study_window_start", "study_window_end", "session_minutes", "student_name"];

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  // Never send the raw API key back to the browser - just whether one is set.
  res.json({
    ...Object.fromEntries(PUBLIC_KEYS.map((k) => [k, settings[k] ?? null])),
    anthropic_api_key_set: Boolean(settings.anthropic_api_key || process.env.ANTHROPIC_API_KEY),
  });
});

router.put("/", (req, res) => {
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  const tx = db.transaction((entries) => {
    for (const [key, value] of entries) upsert.run(key, String(value));
  });

  const allowedIncoming = [...PUBLIC_KEYS, "anthropic_api_key"];
  const entries = Object.entries(req.body || {}).filter(([k, v]) => allowedIncoming.includes(k) && v !== "");
  tx(entries);
  res.status(204).end();
});

router.get("/quick-links", (req, res) => {
  res.json(db.prepare("SELECT * FROM quick_links ORDER BY sort_order").all());
});

router.post("/quick-links", (req, res) => {
  const { label, url } = req.body;
  if (!label || !url) return res.status(400).json({ error: "label and url are required" });
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM quick_links").get().m;
  const result = db
    .prepare("INSERT INTO quick_links (label, url, sort_order) VALUES (?, ?, ?)")
    .run(label, url, maxOrder + 1);
  res.status(201).json(db.prepare("SELECT * FROM quick_links WHERE id = ?").get(result.lastInsertRowid));
});

router.delete("/quick-links/:id", (req, res) => {
  const result = db.prepare("DELETE FROM quick_links WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
