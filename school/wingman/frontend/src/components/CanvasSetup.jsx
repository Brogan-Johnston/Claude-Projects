import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { bestMatchCanvasId } from "../utils/canvasMatch.js";

const TYPES = ["exam", "quiz", "project", "homework", "reading", "assignment"];

// One-click-per-step setup for linking every course to Canvas at once, instead of repeating
// the link -> sync -> review cycle per course from the Courses page. Lives in Settings, right
// under the Canvas card, and only shows once Canvas is connected.
export default function CanvasSetup() {
  const [courses, setCourses] = useState([]);
  const [canvasCourses, setCanvasCourses] = useState([]);
  const [selections, setSelections] = useState({});
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function refresh() {
    Promise.all([api.get("/courses"), api.get("/canvas/courses")])
      .then(([localCourses, canvasList]) => {
        setCourses(localCourses);
        setCanvasCourses(canvasList);
        setSelections((prev) => {
          const next = { ...prev };
          for (const c of localCourses) {
            if (c.canvas_course_id) next[c.id] = c.canvas_course_id;
            else if (next[c.id] === undefined) next[c.id] = bestMatchCanvasId(c, canvasList) || "";
          }
          return next;
        });
      })
      .catch((err) => setError(err.message));
  }

  useEffect(refresh, []);

  const unlinked = courses.filter((c) => !c.canvas_course_id);
  const linked = courses.filter((c) => c.canvas_course_id);

  async function linkAll() {
    const toLink = unlinked.filter((c) => selections[c.id]);
    if (toLink.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all(
        toLink.map((c) => api.post(`/canvas/courses/${c.id}/link`, { canvas_course_id: Number(selections[c.id]) }))
      );
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function syncAll() {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        linked.map((c) =>
          api
            .post(`/canvas/courses/${c.id}/sync-preview`, {})
            .then((r) => r.items.map((it) => ({ ...it, course_id: c.id, course_name: c.name })))
        )
      );
      setItems(results.flat().map((it) => ({ ...it, include: true })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function importAll() {
    setLoading(true);
    setError(null);
    try {
      const toImport = items.filter((it) => it.include);
      const byCourse = new Map();
      for (const it of toImport) {
        if (!byCourse.has(it.course_id)) byCourse.set(it.course_id, []);
        byCourse.get(it.course_id).push(it);
      }
      await Promise.all(
        [...byCourse.entries()].map(([courseId, courseItems]) => api.post(`/canvas/courses/${courseId}/commit`, { items: courseItems }))
      );
      setItems(null);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (courses.length === 0) {
    return (
      <p className="meta" style={{ marginTop: 10 }}>
        Add a course on the Courses page first, then come back here to link it to Canvas.
      </p>
    );
  }

  if (items) {
    return (
      <div style={{ marginTop: 14 }}>
        <p>
          Found {items.length} item{items.length === 1 ? "" : "s"} across {linked.length} course{linked.length === 1 ? "" : "s"}.
          Review, then import.
        </p>
        {error && <p style={{ color: "var(--rust)" }}>{error}</p>}
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Course</th>
                <th>Title</th>
                <th>Type</th>
                <th>Due date</th>
                <th>Weight %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={`${it.course_id}-${it.external_id}`}>
                  <td>
                    <input type="checkbox" checked={it.include} onChange={(e) => updateItem(idx, { include: e.target.checked })} />
                  </td>
                  <td>{it.course_name}</td>
                  <td>
                    <input type="text" value={it.title} onChange={(e) => updateItem(idx, { title: e.target.value })} />
                  </td>
                  <td>
                    <select value={it.type} onChange={(e) => updateItem(idx, { type: e.target.value })}>
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="date" value={it.due_date || ""} onChange={(e) => updateItem(idx, { due_date: e.target.value })} />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={it.weight_pct ?? ""}
                      onChange={(e) => updateItem(idx, { weight_pct: e.target.value ? Number(e.target.value) : null })}
                    />
                  </td>
                  <td>{it.already_imported ? "will update" : "new"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn" disabled={loading} onClick={importAll}>
            {loading ? "Importing…" : `Import ${items.filter((i) => i.include).length} item(s)`}
          </button>
          <button className="btn secondary" onClick={() => setItems(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      {error && <p style={{ color: "var(--rust)" }}>{error}</p>}
      {unlinked.length > 0 ? (
        <>
          <p>Match each course to Canvas (guessed for you where possible):</p>
          {unlinked.map((c) => (
            <div className="assignment-row" key={c.id}>
              <div className="title">{c.name}</div>
              <div className="spacer" />
              <select value={selections[c.id] ?? ""} onChange={(e) => setSelections({ ...selections, [c.id]: e.target.value })}>
                <option value="">Not on Canvas</option>
                {canvasCourses.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.name} {cc.course_code ? `(${cc.course_code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button className="btn" disabled={loading} onClick={linkAll} style={{ marginTop: 10 }}>
            {loading ? "Linking…" : "Link courses"}
          </button>
        </>
      ) : (
        <button className="btn" disabled={loading} onClick={syncAll}>
          {loading ? "Syncing…" : `Sync assignments for ${linked.length} course${linked.length === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}
