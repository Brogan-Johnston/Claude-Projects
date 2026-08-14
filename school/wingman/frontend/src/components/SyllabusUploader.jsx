import { useState } from "react";
import { api } from "../api/client.js";

const TYPES = ["exam", "quiz", "project", "homework", "reading", "assignment"];

export default function SyllabusUploader({ courseId, onDone, onCancel }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syllabusId, setSyllabusId] = useState(null);
  const [items, setItems] = useState([]);

  async function handleParse(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("course_id", courseId);
      const result = await api.post("/syllabus/parse", form);
      setSyllabusId(result.syllabus_id);
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

  async function handleCommit() {
    setLoading(true);
    setError(null);
    try {
      const toImport = items.filter((it) => it.include);
      await api.post(`/syllabus/${syllabusId}/commit`, { items: toImport });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!syllabusId) {
    return (
      <form onSubmit={handleParse} className="stack">
        <p>Upload a syllabus (PDF, Word, or plain text) and Claude will pull out the graded dates for you.</p>
        <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files[0])} />
        {error && <p style={{ color: "var(--rust)" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" disabled={!file || loading} type="submit">
            {loading ? "Reading syllabus…" : "Extract dates"}
          </button>
          <button className="btn secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <p>
        Found {items.length} item{items.length === 1 ? "" : "s"}. Double-check anything marked
        <span className="confidence-low"> low confidence</span>, then import.
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
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
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
                <td className={`confidence-${it.confidence}`}>{it.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="btn" disabled={loading} onClick={handleCommit}>
          {loading ? "Importing…" : `Import ${items.filter((i) => i.include).length} item(s)`}
        </button>
        <button className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
