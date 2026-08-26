import "dotenv/config";
import express from "express";
import cors from "cors";

import "./db/index.js";
import coursesRouter from "./routes/courses.js";
import scheduleRouter from "./routes/schedule.js";
import assignmentsRouter from "./routes/assignments.js";
import syllabusRouter from "./routes/syllabus.js";
import studyPlanRouter from "./routes/studyplan.js";
import calendarRouter from "./routes/calendar.js";
import outlookRouter from "./routes/outlook.js";
import canvasRouter from "./routes/canvas.js";
import settingsRouter from "./routes/settings.js";
import { closeSharedContext } from "./services/outlookScrapeService.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/courses", coursesRouter);
app.use("/api/schedule", scheduleRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/syllabus", syllabusRouter);
app.use("/api/studyplan", studyPlanRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/outlook", outlookRouter);
app.use("/api/canvas", canvasRouter);
app.use("/api/settings", settingsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Wingman API listening on http://localhost:${PORT}`);
});

// Best-effort cleanup so the Outlook scraper's shared browser doesn't leak past a restart.
// On Windows, `node --watch` restarts don't always deliver SIGTERM to this process in time -
// outlookScrapeService's launch-retry logic is the second line of defense for that case.
async function shutdown() {
  await closeSharedContext();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
