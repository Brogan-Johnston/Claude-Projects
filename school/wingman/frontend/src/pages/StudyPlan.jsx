import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import PomodoroTimer from "../components/PomodoroTimer.jsx";
import { fmtDate, fmtTime } from "../utils/format.js";

export default function StudyPlan() {
  const [sessions, setSessions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [options, setOptions] = useState({ horizon_days: 21, daily_start: "08:00", daily_end: "22:00", session_minutes: 50 });
  const [message, setMessage] = useState(null);

  function refresh() {
    api.get("/studyplan").then(setSessions).catch(() => setSessions([]));
  }

  useEffect(refresh, []);

  async function generate() {
    setGenerating(true);
    setMessage(null);
    try {
      const result = await api.post("/studyplan/generate", options);
      setMessage(result.sessions.length ? `Scheduled ${result.sessions.length} study sessions.` : "No upcoming exams/projects worth scheduling yet — add some assignments first.");
      refresh();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function setStatus(id, status) {
    await api.put(`/studyplan/${id}`, { status });
    refresh();
  }

  async function removeSession(id) {
    await api.del(`/studyplan/${id}`);
    refresh();
  }

  const grouped = useMemo(() => {
    const upcoming = sessions.filter((s) => new Date(s.end_at) >= new Date(new Date().setHours(0, 0, 0, 0)));
    const byDay = new Map();
    for (const s of upcoming) {
      const key = s.start_at.slice(0, 10);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(s);
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Flight Plan</h1>
          <p>Auto-scheduled study sessions, spaced out around your class schedule and each exam's weight.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <div className="section-title">
              <h3>Generate</h3>
            </div>
            <div className="form-grid">
              <div>
                <label>Plan how many days out</label>
                <input type="number" value={options.horizon_days} onChange={(e) => setOptions({ ...options, horizon_days: Number(e.target.value) })} />
              </div>
              <div>
                <label>Session length (min)</label>
                <input type="number" value={options.session_minutes} onChange={(e) => setOptions({ ...options, session_minutes: Number(e.target.value) })} />
              </div>
              <div>
                <label>Earliest study time</label>
                <input type="time" value={options.daily_start} onChange={(e) => setOptions({ ...options, daily_start: e.target.value })} />
              </div>
              <div>
                <label>Latest study time</label>
                <input type="time" value={options.daily_end} onChange={(e) => setOptions({ ...options, daily_end: e.target.value })} />
              </div>
            </div>
            <button className="btn" style={{ marginTop: 14 }} disabled={generating} onClick={generate}>
              {generating ? "Plotting course…" : "Generate flight plan"}
            </button>
            {message && <p style={{ marginTop: 10 }}>{message}</p>}
          </div>

          <div className="card">
            <div className="section-title">
              <h3>Sessions</h3>
            </div>
            {grouped.length === 0 && <div className="empty-state">No study sessions yet — generate a plan above.</div>}
            {grouped.map(([day, items]) => (
              <div key={day} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  {fmtDate(day)}
                </div>
                {items.map((s) => (
                  <div className="assignment-row" key={s.id}>
                    <span className="course-dot" style={{ background: s.course_color || "var(--sage)" }} />
                    <div>
                      <div className="title" style={{ textDecoration: s.status === "done" ? "line-through" : "none" }}>
                        {s.title}
                      </div>
                      <div className="meta">
                        {fmtTime(s.start_at)}–{fmtTime(s.end_at)} · {s.course_name}
                      </div>
                    </div>
                    <div className="spacer" />
                    {s.status !== "done" && (
                      <button className="btn subtle" onClick={() => setStatus(s.id, "done")}>
                        Done
                      </button>
                    )}
                    <button className="btn subtle" onClick={() => removeSession(s.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ alignSelf: "start" }}>
          <div className="section-title">
            <h3>Focus timer</h3>
          </div>
          <PomodoroTimer />
        </div>
      </div>
    </div>
  );
}
