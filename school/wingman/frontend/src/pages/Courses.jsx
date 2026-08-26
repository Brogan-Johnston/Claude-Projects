import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import SyllabusUploader from "../components/SyllabusUploader.jsx";
import CanvasImporter from "../components/CanvasImporter.jsx";
import { fmtDateTime, weekdayShort } from "../utils/format.js";

const PALETTE = ["#c1653a", "#74855f", "#8b5e3c", "#c9932f", "#a8432a", "#5c7a8a", "#9c6b98"];
const DAYS = [0, 1, 2, 3, 4, 5, 6];
const TYPES = ["exam", "quiz", "project", "homework", "reading", "assignment"];

function emptyCourse() {
  return { name: "", code: "", instructor: "", credit_hours: "", color: PALETTE[0] };
}

function emptyBlock(courseId) {
  return { course_id: courseId, day_of_week: 1, start_time: "09:00", end_time: "09:50", location: "", label: "Class" };
}

function emptyAssignment(courseId) {
  return { course_id: courseId, title: "", type: "assignment", due_date: "", due_time: "23:59", weight_pct: "", difficulty: 3 };
}

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState(emptyCourse());
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  const [expandedSyllabus, setExpandedSyllabus] = useState(null);
  const [expandedCanvas, setExpandedCanvas] = useState(null);
  const [expandedAssignments, setExpandedAssignments] = useState(null);
  const [newBlock, setNewBlock] = useState(null);
  const [newAssignment, setNewAssignment] = useState(null);

  function refresh() {
    api.get("/courses").then(setCourses).catch(() => setCourses([]));
    api.get("/schedule").then(setBlocks).catch(() => setBlocks([]));
    api.get("/assignments").then(setAssignments).catch(() => setAssignments([]));
  }

  useEffect(refresh, []);

  async function addCourse(e) {
    e.preventDefault();
    await api.post("/courses", { ...newCourse, credit_hours: newCourse.credit_hours ? Number(newCourse.credit_hours) : null });
    setNewCourse(emptyCourse());
    setShowAddCourse(false);
    refresh();
  }

  async function deleteCourse(id) {
    if (!confirm("Delete this course? Its schedule and assignments go with it.")) return;
    await api.del(`/courses/${id}`);
    refresh();
  }

  async function addBlock(e) {
    e.preventDefault();
    await api.post("/schedule", { ...newBlock, day_of_week: Number(newBlock.day_of_week) });
    setNewBlock(null);
    refresh();
  }

  async function deleteBlock(id) {
    await api.del(`/schedule/${id}`);
    refresh();
  }

  async function addAssignment(e) {
    e.preventDefault();
    const due_at = `${newAssignment.due_date}T${newAssignment.due_time || "23:59"}:00`;
    await api.post("/assignments", {
      course_id: newAssignment.course_id,
      title: newAssignment.title,
      type: newAssignment.type,
      due_at,
      weight_pct: newAssignment.weight_pct ? Number(newAssignment.weight_pct) : null,
      difficulty: Number(newAssignment.difficulty),
    });
    setNewAssignment(null);
    refresh();
  }

  async function toggleAssignmentDone(a) {
    await api.put(`/assignments/${a.id}`, { status: a.status === "done" ? "pending" : "done" });
    refresh();
  }

  async function deleteAssignment(id) {
    await api.del(`/assignments/${id}`);
    refresh();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Courses</h1>
          <p>Set up your classes, import a syllabus, and build out your weekly schedule.</p>
        </div>
        <button className="btn" onClick={() => setShowAddCourse((v) => !v)}>
          {showAddCourse ? "Cancel" : "+ Add course"}
        </button>
      </div>

      {showAddCourse && (
        <form className="card" onSubmit={addCourse} style={{ marginBottom: 18 }}>
          <div className="form-grid">
            <div>
              <label>Course name</label>
              <input type="text" required value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} />
            </div>
            <div>
              <label>Code</label>
              <input type="text" placeholder="AE 331" value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} />
            </div>
            <div>
              <label>Instructor</label>
              <input type="text" value={newCourse.instructor} onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })} />
            </div>
            <div>
              <label>Credit hours</label>
              <input type="number" step="0.5" value={newCourse.credit_hours} onChange={(e) => setNewCourse({ ...newCourse, credit_hours: e.target.value })} />
            </div>
            <div>
              <label>Color</label>
              <div style={{ display: "flex", gap: 6 }}>
                {PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewCourse({ ...newCourse, color: c })}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: c,
                      border: newCourse.color === c ? "3px solid var(--text)" : "1px solid var(--border)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <button className="btn" type="submit" style={{ marginTop: 14 }}>
            Save course
          </button>
        </form>
      )}

      {courses.length === 0 && !showAddCourse && (
        <div className="card empty-state">No courses yet. Add your first class to get started.</div>
      )}

      {courses.map((course) => {
        const courseBlocks = blocks.filter((b) => b.course_id === course.id);
        return (
          <div className="card" key={course.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="course-swatch" style={{ background: course.color }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{course.name}</h3>
                <div className="meta" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  {[course.code, course.instructor, course.credit_hours ? `${course.credit_hours} credits` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <button className="btn subtle" onClick={() => setExpandedSchedule(expandedSchedule === course.id ? null : course.id)}>
                Schedule
              </button>
              <button className="btn subtle" onClick={() => setExpandedAssignments(expandedAssignments === course.id ? null : course.id)}>
                Assignments
              </button>
              <button className="btn subtle" onClick={() => setExpandedSyllabus(expandedSyllabus === course.id ? null : course.id)}>
                Import syllabus
              </button>
              <button className="btn subtle" onClick={() => setExpandedCanvas(expandedCanvas === course.id ? null : course.id)}>
                Canvas
              </button>
              <button className="btn danger" onClick={() => deleteCourse(course.id)}>
                Delete
              </button>
            </div>

            {expandedSchedule === course.id && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                {courseBlocks.length === 0 && <p>No weekly meeting times yet.</p>}
                {courseBlocks.map((b) => (
                  <div className="assignment-row" key={b.id}>
                    <div>
                      <div className="title">
                        {weekdayShort(b.day_of_week)} {b.start_time}–{b.end_time}
                      </div>
                      <div className="meta">
                        {b.label} {b.location ? `· ${b.location}` : ""}
                      </div>
                    </div>
                    <div className="spacer" />
                    <button className="btn subtle" onClick={() => deleteBlock(b.id)}>
                      Remove
                    </button>
                  </div>
                ))}

                {newBlock?.course_id === course.id ? (
                  <form onSubmit={addBlock} className="form-grid" style={{ marginTop: 12 }}>
                    <div>
                      <label>Day</label>
                      <select value={newBlock.day_of_week} onChange={(e) => setNewBlock({ ...newBlock, day_of_week: e.target.value })}>
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {weekdayShort(d)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Start</label>
                      <input type="time" value={newBlock.start_time} onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })} />
                    </div>
                    <div>
                      <label>End</label>
                      <input type="time" value={newBlock.end_time} onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })} />
                    </div>
                    <div>
                      <label>Label</label>
                      <input type="text" value={newBlock.label} onChange={(e) => setNewBlock({ ...newBlock, label: e.target.value })} />
                    </div>
                    <div>
                      <label>Location</label>
                      <input type="text" value={newBlock.location} onChange={(e) => setNewBlock({ ...newBlock, location: e.target.value })} />
                    </div>
                    <div style={{ alignSelf: "end", display: "flex", gap: 8 }}>
                      <button className="btn" type="submit">
                        Add
                      </button>
                      <button className="btn secondary" type="button" onClick={() => setNewBlock(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button className="btn subtle" style={{ marginTop: 10 }} onClick={() => setNewBlock(emptyBlock(course.id))}>
                    + Add meeting time
                  </button>
                )}
              </div>
            )}

            {expandedAssignments === course.id && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                {assignments
                  .filter((a) => a.course_id === course.id)
                  .map((a) => (
                    <div className="assignment-row" key={a.id}>
                      <div>
                        <div className="title" style={{ textDecoration: a.status === "done" ? "line-through" : "none" }}>
                          {a.title}
                        </div>
                        <div className="meta">
                          {a.type} {a.weight_pct ? `· ${a.weight_pct}%` : ""} · due {fmtDateTime(a.due_at)}
                        </div>
                      </div>
                      <div className="spacer" />
                      <button className="btn subtle" onClick={() => toggleAssignmentDone(a)}>
                        {a.status === "done" ? "Reopen" : "Done"}
                      </button>
                      <button className="btn subtle" onClick={() => deleteAssignment(a.id)}>
                        ✕
                      </button>
                    </div>
                  ))}
                {assignments.filter((a) => a.course_id === course.id).length === 0 && <p>No assignments yet.</p>}

                {newAssignment?.course_id === course.id ? (
                  <form onSubmit={addAssignment} className="form-grid" style={{ marginTop: 12 }}>
                    <div>
                      <label>Title</label>
                      <input
                        type="text"
                        required
                        value={newAssignment.title}
                        onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Type</label>
                      <select value={newAssignment.type} onChange={(e) => setNewAssignment({ ...newAssignment, type: e.target.value })}>
                        {TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Due date</label>
                      <input
                        type="date"
                        required
                        value={newAssignment.due_date}
                        onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Due time</label>
                      <input
                        type="time"
                        value={newAssignment.due_time}
                        onChange={(e) => setNewAssignment({ ...newAssignment, due_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Weight %</label>
                      <input
                        type="number"
                        value={newAssignment.weight_pct}
                        onChange={(e) => setNewAssignment({ ...newAssignment, weight_pct: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Difficulty (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={newAssignment.difficulty}
                        onChange={(e) => setNewAssignment({ ...newAssignment, difficulty: e.target.value })}
                      />
                    </div>
                    <div style={{ alignSelf: "end", display: "flex", gap: 8 }}>
                      <button className="btn" type="submit">
                        Add
                      </button>
                      <button className="btn secondary" type="button" onClick={() => setNewAssignment(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button className="btn subtle" style={{ marginTop: 10 }} onClick={() => setNewAssignment(emptyAssignment(course.id))}>
                    + Add assignment
                  </button>
                )}
              </div>
            )}

            {expandedSyllabus === course.id && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <SyllabusUploader
                  courseId={course.id}
                  onDone={() => {
                    setExpandedSyllabus(null);
                    refresh();
                  }}
                  onCancel={() => setExpandedSyllabus(null)}
                />
              </div>
            )}

            {expandedCanvas === course.id && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <CanvasImporter
                  courseId={course.id}
                  courseName={course.name}
                  courseCode={course.code}
                  canvasCourseId={course.canvas_course_id}
                  onLinked={refresh}
                  onDone={() => {
                    setExpandedCanvas(null);
                    refresh();
                  }}
                  onCancel={() => setExpandedCanvas(null)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
