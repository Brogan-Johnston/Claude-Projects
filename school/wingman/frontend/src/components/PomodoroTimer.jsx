import { useEffect, useRef, useState } from "react";

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

export default function PomodoroTimer() {
  const [mode, setMode] = useState("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MIN * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          const nextMode = mode === "focus" ? "break" : "focus";
          if (mode === "focus") setCycles((c) => c + 1);
          setMode(nextMode);
          return (nextMode === "focus" ? FOCUS_MIN : BREAK_MIN) * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  function reset() {
    setRunning(false);
    setMode("focus");
    setSecondsLeft(FOCUS_MIN * 60);
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="pomodoro-ring">
      <div className="badge" style={{ marginBottom: 8 }}>
        {mode === "focus" ? "Focus block" : "Break"} · {cycles} completed
      </div>
      <div className="pomodoro-time">
        {mm}:{ss}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="btn" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Start"}
        </button>
        <button className="btn secondary" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
