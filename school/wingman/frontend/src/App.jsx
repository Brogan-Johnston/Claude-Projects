import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import Courses from "./pages/Courses.jsx";
import StudyPlan from "./pages/StudyPlan.jsx";
import Settings from "./pages/Settings.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Flight Deck", icon: "🛰️", end: true },
  { to: "/calendar", label: "Calendar", icon: "🗓️" },
  { to: "/courses", label: "Courses", icon: "📘" },
  { to: "/study-plan", label: "Flight Plan", icon: "🧭" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("wingman-theme") || "system");

  useEffect(() => {
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("wingman-theme", theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">🚀</span>
          Wingman
        </div>
        <ul className="nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="pill-toggle">
            <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
              Light
            </button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
              Dark
            </button>
            <button className={theme === "system" ? "active" : ""} onClick={() => setTheme("system")}>
              Auto
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/study-plan" element={<StudyPlan />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
