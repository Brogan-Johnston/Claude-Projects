import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { fmtDate, weekdayShort } from "../utils/format.js";

const WINDOW_START_HOUR = 6;
const WINDOW_END_HOUR = 23;
const HOUR_PX = 46;

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function minutesSinceWindow(iso) {
  const d = new Date(iso);
  return (d.getHours() - WINDOW_START_HOUR) * 60 + d.getMinutes();
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [data, setData] = useState({ classes: [], assignments: [], study_sessions: [] });

  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)),
    [weekStart]
  );

  useEffect(() => {
    api
      .get(`/calendar?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`)
      .then(setData)
      .catch(() => setData({ classes: [], assignments: [], study_sessions: [] }));
  }, [weekStart, weekEnd]);

  const totalHeight = (WINDOW_END_HOUR - WINDOW_START_HOUR) * HOUR_PX;
  const hourMarks = Array.from({ length: WINDOW_END_HOUR - WINDOW_START_HOUR }, (_, i) => WINDOW_START_HOUR + i);

  const events = [...data.classes, ...data.study_sessions];

  function eventsForDay(date) {
    const key = date.toISOString().slice(0, 10);
    return events.filter((e) => e.start_at.slice(0, 10) === key);
  }

  function dueForDay(date) {
    const key = date.toISOString().slice(0, 10);
    return data.assignments.filter((a) => a.start_at.slice(0, 10) === key);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Calendar</h1>
          <p>Classes, deadlines, and your flight plan study sessions, all in one view.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn secondary" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Today
          </button>
          <button className="btn secondary" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}>
            ← Prev
          </button>
          <button className="btn secondary" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}>
            Next →
          </button>
        </div>
      </div>

      <div className="scroll-x">
        <div className="calendar-grid" style={{ minWidth: 860 }}>
          <div className="calendar-head" />
          {days.map((d) => (
            <div className="calendar-head" key={d.toISOString()}>
              {weekdayShort(d.getDay())} <span style={{ color: "var(--text-muted)" }}>{fmtDate(d)}</span>
              {dueForDay(d).length > 0 && (
                <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
                  {dueForDay(d).map((a) => (
                    <span
                      key={a.id}
                      className="badge urgent"
                      style={{ fontSize: "0.62rem", padding: "1px 6px" }}
                      title={a.title}
                    >
                      {a.title.length > 14 ? a.title.slice(0, 13) + "…" : a.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div>
            {hourMarks.map((h) => (
              <div className="calendar-hour-label" key={h} style={{ height: HOUR_PX }}>
                {h % 12 === 0 ? 12 : h % 12}
                {h < 12 ? "a" : "p"}
              </div>
            ))}
          </div>

          {days.map((d) => (
            <div className="calendar-day-col" key={d.toISOString()} style={{ height: totalHeight }}>
              {eventsForDay(d).map((e) => {
                const top = Math.max(0, minutesSinceWindow(e.start_at)) * (HOUR_PX / 60);
                const rawHeight = (minutesSinceWindow(e.end_at) - minutesSinceWindow(e.start_at)) * (HOUR_PX / 60);
                return (
                  <div
                    key={e.id}
                    className={`calendar-event${e.kind === "study" ? " study" : ""}`}
                    style={{ top, height: Math.max(16, rawHeight), background: e.course_color || "var(--sage)" }}
                    title={e.title}
                  >
                    {e.title}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
