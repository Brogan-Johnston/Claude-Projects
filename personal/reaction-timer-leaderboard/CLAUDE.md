# Reaction Timer Leaderboard

A desktop Python application that connects to the Arduino-based two-player reaction timer game via USB serial and maintains a live leaderboard.

## Goal
Display the top 10 fastest reaction times for each player, split into "Today's Best" and "All-Time Best" panels. Times are persisted in a local SQLite database.

## Language & Tools
- Python 3.8+ with tkinter (built-in GUI)
- pyserial — reads `RESULT:<player>:<time_ms>` lines from the Arduino over USB serial
- sqlite3 (built-in) — persists times across sessions

## Run Instructions
```
pip install pyserial
python leaderboard.py
```

## Arduino Serial Protocol
The Arduino must send one line per round in the format:
```
RESULT:<player>:<time_ms>
```
Example: `RESULT:1:312` means Player 1 reacted in 312 ms.
