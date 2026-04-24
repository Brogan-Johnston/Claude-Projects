import tkinter as tk
from tkinter import messagebox
import sqlite3
import serial
import serial.tools.list_ports
import threading
from datetime import datetime, date

DB_PATH   = "leaderboard.db"
BAUD_RATE = 9600
TOP_N     = 10

# ── Color palette ─────────────────────────────────────────────────────────────
BG       = "#1a1a2e"
PANEL_BG = "#16213e"
ACCENT   = "#e94560"
P1_COLOR = "#4fc3f7"
P2_COLOR = "#ffb74d"
DIM      = "#546e7a"


# ── Database ──────────────────────────────────────────────────────────────────

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS times (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                player      INTEGER NOT NULL,
                time_ms     INTEGER NOT NULL,
                recorded_at TEXT    NOT NULL
            )
        """)


def save_time(player, time_ms):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO times (player, time_ms, recorded_at) VALUES (?, ?, ?)",
            (player, time_ms, datetime.now().isoformat())
        )


def get_best(player, today_only, n=TOP_N):
    with sqlite3.connect(DB_PATH) as conn:
        if today_only:
            rows = conn.execute(
                "SELECT time_ms FROM times "
                "WHERE player=? AND recorded_at LIKE ? "
                "ORDER BY time_ms ASC LIMIT ?",
                (player, f"{date.today().isoformat()}%", n)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT time_ms FROM times "
                "WHERE player=? ORDER BY time_ms ASC LIMIT ?",
                (player, n)
            ).fetchall()
    return [r[0] for r in rows]


def clear_today_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "DELETE FROM times WHERE recorded_at LIKE ?",
            (f"{date.today().isoformat()}%",)
        )


# ── Formatting ────────────────────────────────────────────────────────────────

def fmt(ms):
    """Format milliseconds as 0.0000s (4 decimal places, matching the LCD display)."""
    return f"{ms // 1000}.{ms % 1000:03d}0s"


# ── GUI ───────────────────────────────────────────────────────────────────────

class LeaderboardApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Reaction Timer — Leaderboard")
        self.root.configure(bg=BG)
        self.root.geometry("740x600")
        self.root.resizable(True, True)

        self._port    = None
        self._running = False

        self._build_ui()
        self._refresh()
        self._auto_connect()

    # ── Layout ────────────────────────────────────────────────────────────────

    def _build_ui(self):
        tk.Label(
            self.root, text="REACTION TIMER LEADERBOARD",
            font=("Arial", 18, "bold"), fg=ACCENT, bg=BG
        ).pack(pady=(14, 4))

        content = tk.Frame(self.root, bg=BG)
        content.pack(fill="both", expand=True, padx=16)

        today_frame   = self._make_panel(content, "TODAY'S BEST TIMES",  "#1565c0")
        alltime_frame = self._make_panel(content, "ALL-TIME BEST TIMES", ACCENT)
        today_frame.pack(  side="left",  fill="both", expand=True, padx=(0, 8), pady=8)
        alltime_frame.pack(side="right", fill="both", expand=True, padx=(8, 0), pady=8)

        self._today_w   = self._make_table(today_frame)
        self._alltime_w = self._make_table(alltime_frame)

        # Buttons
        btns = tk.Frame(self.root, bg=BG)
        btns.pack(pady=6)
        for label, cmd, color in [
            ("Reconnect",   self._auto_connect, "#1565c0"),
            ("Refresh",     self._refresh,       "#1565c0"),
            ("Clear Today", self._clear_today,   ACCENT),
        ]:
            tk.Button(
                btns, text=label, command=cmd,
                bg=color, fg="white", font=("Arial", 10),
                relief="flat", padx=14, pady=5, cursor="hand2"
            ).pack(side="left", padx=6)

        # Status bar
        self._status = tk.StringVar(value="Searching for Arduino...")
        tk.Label(
            self.root, textvariable=self._status,
            font=("Arial", 9), fg="#90a4ae", bg="#0d1117",
            anchor="w", padx=10, pady=5
        ).pack(fill="x", side="bottom")

    def _make_panel(self, parent, title, title_color):
        return tk.LabelFrame(
            parent, text=f"  {title}  ",
            font=("Arial", 10, "bold"), fg=title_color, bg=PANEL_BG,
            relief="groove", bd=2
        )

    def _make_table(self, parent):
        widgets = {"p1": [], "p2": []}
        tk.Label(parent, text="Player 1", font=("Arial", 11, "bold"),
                 fg=P1_COLOR, bg=PANEL_BG).grid(row=0, column=0, padx=28, pady=(10, 4))
        tk.Label(parent, text="Player 2", font=("Arial", 11, "bold"),
                 fg=P2_COLOR, bg=PANEL_BG).grid(row=0, column=1, padx=28, pady=(10, 4))

        for i in range(TOP_N):
            for col, key in ((0, "p1"), (1, "p2")):
                lbl = tk.Label(
                    parent, text=f" {i+1:2d}.  --.----s",
                    font=("Courier", 10), fg=DIM, bg=PANEL_BG, width=15, anchor="w"
                )
                lbl.grid(row=i + 1, column=col, padx=10, pady=2)
                widgets[key].append(lbl)
        return widgets

    # ── Data helpers ──────────────────────────────────────────────────────────

    def _refresh(self):
        self._fill(self._today_w,   today_only=True)
        self._fill(self._alltime_w, today_only=False)

    def _fill(self, widgets, today_only):
        for key, player, color in (("p1", 1, P1_COLOR), ("p2", 2, P2_COLOR)):
            times = get_best(player, today_only)
            for i, lbl in enumerate(widgets[key]):
                if i < len(times):
                    lbl.config(text=f" {i+1:2d}.  {fmt(times[i])}", fg=color)
                else:
                    lbl.config(text=f" {i+1:2d}.  --.----s", fg=DIM)

    # ── Serial communication ──────────────────────────────────────────────────

    def _auto_connect(self):
        self._running = False
        if self._port and self._port.is_open:
            self._port.close()

        for p in serial.tools.list_ports.comports():
            desc = (p.description or "").lower()
            if any(k in desc for k in ("arduino", "ch340", "ch341", "usb serial", "uart")):
                try:
                    self._port = serial.Serial(p.device, BAUD_RATE, timeout=1)
                    self._status.set(f"Connected  |  {p.device}  ({p.description})")
                    self._running = True
                    threading.Thread(target=self._read_loop, daemon=True).start()
                    return
                except serial.SerialException:
                    continue

        self._status.set("Arduino not found — plug it in then click Reconnect.")

    def _read_loop(self):
        """Background thread: read serial lines and save any RESULT messages."""
        while self._running and self._port and self._port.is_open:
            try:
                line = self._port.readline().decode("utf-8", errors="ignore").strip()
                if line.startswith("RESULT:"):
                    parts = line.split(":")
                    if len(parts) == 3:
                        player  = int(parts[1])
                        time_ms = int(parts[2])
                        save_time(player, time_ms)
                        # Schedule GUI update on the main thread
                        self.root.after(0, self._on_new_time, player, time_ms)
            except (ValueError, serial.SerialException):
                pass

        if self._running:
            self.root.after(
                0, self._status.set,
                "Connection lost — click Reconnect."
            )

    def _on_new_time(self, player, time_ms):
        self._refresh()
        self._status.set(
            f"New time!  Player {player}: {fmt(time_ms)}"
            f"  |  {datetime.now().strftime('%H:%M:%S')}"
        )

    # ── Button handlers ───────────────────────────────────────────────────────

    def _clear_today(self):
        if messagebox.askyesno(
            "Clear Today",
            "Delete all of today's recorded times?",
            parent=self.root
        ):
            clear_today_db()
            self._refresh()

    def on_close(self):
        self._running = False
        if self._port and self._port.is_open:
            self._port.close()
        self.root.destroy()


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    root = tk.Tk()
    app = LeaderboardApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_close)
    root.mainloop()
