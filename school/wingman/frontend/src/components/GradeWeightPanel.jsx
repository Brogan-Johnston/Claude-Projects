export default function GradeWeightPanel({ courses, assignments }) {
  const rows = courses
    .map((c) => {
      const items = assignments.filter((a) => a.course_id === c.id && a.weight_pct);
      const total = items.reduce((s, a) => s + a.weight_pct, 0);
      const done = items.filter((a) => a.status === "done").reduce((s, a) => s + a.weight_pct, 0);
      return { course: c, total, done };
    })
    .filter((r) => r.total > 0);

  if (!rows.length) {
    return <div className="empty-state">Add weight percentages to assignments to see this fill in.</div>;
  }

  return (
    <div>
      {rows.map(({ course, total, done }) => (
        <div className="weight-bar-row" key={course.id}>
          <div className="label-row">
            <span>{course.name}</span>
            <span style={{ color: "var(--text-muted)" }}>
              {done.toFixed(0)}% locked in / {total.toFixed(0)}% tracked
            </span>
          </div>
          <div className="weight-bar-track">
            <div
              className="weight-bar-fill"
              style={{ width: `${Math.min(100, (done / total) * 100)}%`, background: course.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
