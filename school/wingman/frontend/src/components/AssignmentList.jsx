import { daysUntil, fmtDateTime, urgencyBadge } from "../utils/format.js";

export default function AssignmentList({ assignments, emptyText = "Nothing on the radar. Nice.", onToggleDone, onDelete }) {
  if (!assignments.length) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <div>
      {assignments.map((a) => {
        const badge = urgencyBadge(daysUntil(a.due_at));
        return (
          <div className="assignment-row" key={a.id}>
            <span className="course-dot" style={{ background: a.course_color }} />
            <div>
              <div className="title" style={{ textDecoration: a.status === "done" ? "line-through" : "none" }}>
                {a.title}
              </div>
              <div className="meta">
                {a.course_name} · {a.type} {a.weight_pct ? `· ${a.weight_pct}% of grade` : ""} · {fmtDateTime(a.due_at)}
              </div>
            </div>
            <div className="spacer" />
            {a.status !== "done" && <span className={`badge ${badge.cls}`}>{badge.text}</span>}
            {onToggleDone && (
              <button className="btn subtle" onClick={() => onToggleDone(a)}>
                {a.status === "done" ? "Reopen" : "Done"}
              </button>
            )}
            {onDelete && (
              <button className="btn subtle" onClick={() => onDelete(a)}>
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
