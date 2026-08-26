import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { bestMatchCanvasId } from "../utils/canvasMatch.js";

const TYPES = ["exam", "quiz", "project", "homework", "reading", "assignment"];

export default function CanvasImporter({ courseId, courseName, courseCode, canvasCourseId, onLinked, onDone, onCancel }) {
  const [connected, setConnected] = useState(null);
  const [canvasCourses, setCanvasCourses] = useState([]);
  const [selectedCanvasCourse, setSelectedCanvasCourse] = useState("");
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/canvas/status").then((s) => setConnected(s.connected)).catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (connected && !canvasCourseId) {
      api
        .get("/canvas/courses")
        .then((list) => {
          setCanvasCourses(list);
          const guess = bestMatchCanvasId({ name: courseName, code: courseCode }, list);
          if (guess) setSelectedCanvasCourse(String(guess));
        })
        .catch((err) => setError(err.message));
    }
  }, [connected, canvasCourseId]);

  // Linking and syncing happen as one click - the user picks the Canvas course and
  // immediately sees the review table, instead of linking, then having to click again to sync.
  async function linkAndSync(e) {
    e.preventDefault();
    if (!selectedCanvasCourse) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/canvas/courses/${courseId}/link`, { canvas_course_id: Number(selectedCanvasCourse) });
      onLinked();
      const result = await api.post(`/canvas/courses/${courseId}/sync-preview`, {});
      setItems(result.items.map((it) => ({ ...it, include: true })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.post(`/canvas/courses/${courseId}/sync-preview`, {});
      setItems(result.items.map((it) => ({ ...it, include: true })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function commit() {
    setLoading(true);
    setError(null);
    try {
      const toImport = items.filter((it) => it.include);
      await api.post(`/canvas/courses/${courseId}/commit`, { items: toImport });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (connected === null) return null;

  if (!connected) {
    return (
      <div className="empty-state">
        <p>Canvas isn't connected yet. Go to Settings and log in to Canvas first.</p>
        <button className="btn secondary" onClick={onCancel}>
          Close
        </button>
      </div>
    );
  }

  if (!canvasCourseId && !items) {
    return (
      <form onSubmit={linkAndSync} className="stack">
        <p>Pick the matching Canvas course (guessed for you where possible) to pull in its assignments and exam dates.</p>
        {error && <p style={{ color: "var(--rust)" }}>{error}</p>}
        <select value={selectedCanvasCourse} onChange={(e) => setSelectedCanvasCourse(e.target.value)}>
          <option value="">Select a Canvas course…</option>
          {canvasCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.course_code ? `(${c.course_code})` : ""}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" disabled={!selectedCanvasCourse || loading} type="submit">
            {loading ? "Linking & syncing…" : "Link & sync"}
          </button>
          <button className="btn secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (!items) {
    return (
      <div className="stack">
        <p>Pull assignments and exam dates from Canvas for this course.</p>
        {error && <p style={{ color: "var(--rust)" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" disabled={loading} onClick={sync}>
            {loading ? "Syncing…" : "Sync from Canvas"}
          </button>
          <button className="btn secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p>
        Found {items.length} item{items.length === 1 ? "" : "s"} on this course's syllabus page. Review the dates
        (weight % isn't available from Canvas this way - add it by hand if you track it), then import.
      </p>
      {error && <p style={{ color: "var(--rust)" }}>{error}</p>}
      <div className="scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Title</th>
              <th>Type</th>
              <th>Due date</th>
              <th>Weight %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.external_id || idx}>
                <td>
                  <input type="checkbox" checked={it.include} onChange={(e) => updateItem(idx, { include: e.target.checked })} />
                </td>
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
        <button className="btn" disabled={loading} onClick={commit}>
          {loading ? "Importing…" : `Import ${items.filter((i) => i.include).length} item(s)`}
        </button>
        <button className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
