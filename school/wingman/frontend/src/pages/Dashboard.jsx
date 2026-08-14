import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import AssignmentList from "../components/AssignmentList.jsx";
import InboxPanel from "../components/InboxPanel.jsx";
import QuickLinks from "../components/QuickLinks.jsx";
import GradeWeightPanel from "../components/GradeWeightPanel.jsx";
import { daysUntil, fmtTime, relativeCountdown } from "../utils/format.js";

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [today, setToday] = useState([]);

  function loadAssignments() {
    api.get("/assignments").then(setAssignments).catch(() => setAssignments([]));
  }

  useEffect(() => {
    api.get("/courses").then(setCourses).catch(() => setCourses([]));
    loadAssignments();

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    api
      .get(`/calendar?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then((data) => {
        const merged = [...data.classes, ...data.study_sessions].sort((a, b) => a.start_at.localeCompare(b.start_at));
        setToday(merged);
      })
      .catch(() => setToday([]));
  }, []);

  async function toggleDone(a) {
    await api.put(`/assignments/${a.id}`, { status: a.status === "done" ? "pending" : "done" });
    loadAssignments();
  }

  const upcoming = useMemo(
    () => assignments.filter((a) => a.status !== "done" && daysUntil(a.due_at) > -1).slice(0, 8),
    [assignments]
  );

  const nextBigThing = useMemo(() => {
    const pending = assignments.filter((a) => a.status !== "done" && daysUntil(a.due_at) >= 0);
    const exams = pending.filter((a) => a.type === "exam");
    return (exams.length ? exams : pending)[0];
  }, [assignments]);

  const countdown = nextBigThing ? relativeCountdown(nextBigThing.due_at) : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Flight Deck</h1>
          <p>Everything you need before wheels-up on today's work.</p>
        </div>
      </div>

      <div className="stack" style={{ marginBottom: 18 }}>
        <div className="hero-card">
          <div className="eyebrow">Next major deadline</div>
          {nextBigThing ? (
            <>
              <h2>{nextBigThing.title}</h2>
              <div className="countdown-number">
                T&minus;{countdown.value}
                <span className="countdown-unit"> {countdown.unit}</span>
              </div>
              <div className="hero-meta">
                <span>{nextBigThing.course_name}</span>
                {nextBigThing.weight_pct ? <span>{nextBigThing.weight_pct}% of grade</span> : null}
              </div>
            </>
          ) : (
            <h2>Nothing major on the horizon. Enjoy the calm.</h2>
          )}
        </div>

        <div className="card">
          <div className="section-title">
            <h3>Today</h3>
          </div>
          {today.length ? (
            <div className="today-strip">
              {today.map((item) => (
                <div className="today-chip" key={item.id} style={{ borderLeftColor: item.course_color || "var(--sage)" }}>
                  <div className="time">
                    {fmtTime(item.start_at)}
                    {item.kind !== "assignment" ? ` – ${fmtTime(item.end_at)}` : " due"}
                  </div>
                  <div>{item.title}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nothing scheduled today. Good day for a head start.</div>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stack">
          <div className="card">
            <div className="section-title">
              <h3>Upcoming</h3>
            </div>
            <AssignmentList assignments={upcoming} onToggleDone={toggleDone} />
          </div>

          <div className="card">
            <div className="section-title">
              <h3>Grade weight tracker</h3>
            </div>
            <GradeWeightPanel courses={courses} assignments={assignments} />
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="section-title">
              <h3>Inbox</h3>
            </div>
            <InboxPanel />
          </div>

          <div className="card">
            <div className="section-title">
              <h3>Quick links</h3>
            </div>
            <QuickLinks />
          </div>
        </div>
      </div>
    </div>
  );
}
