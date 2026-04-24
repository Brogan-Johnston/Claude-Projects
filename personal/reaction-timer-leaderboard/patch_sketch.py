"""
patch_sketch.py
---------------
Applies the two Serial additions needed for the leaderboard app to an
existing reaction timer .ino file.

Usage:
    python patch_sketch.py <path_to_your_sketch.ino>

If no path is given, it patches the local reaction_timer/reaction_timer.ino.
"""

import sys
import re
import shutil
from pathlib import Path

SERIAL_BEGIN   = "  Serial.begin(9600);"
SERIAL_RESULT  = (
    "\n"
    "  // Send result to leaderboard app over USB serial\n"
    "  Serial.print(\"RESULT:\");\n"
    "  Serial.print(winner);\n"
    "  Serial.print(\":\");\n"
    "  Serial.println(reactionTime);\n"
)

ALREADY_PATCHED_MARKER = "Serial.begin(9600)"


def patch(sketch_path: Path):
    text = sketch_path.read_text(encoding="utf-8")

    if ALREADY_PATCHED_MARKER in text:
        print(f"[skip] {sketch_path} is already patched.")
        return

    # ── 1. Add Serial.begin(9600) inside setup() ─────────────────────────────
    # Find the opening brace of setup() and insert after it.
    setup_match = re.search(r"void\s+setup\s*\(\s*\)\s*\{", text)
    if not setup_match:
        print("[error] Could not find setup() — is this the right file?")
        sys.exit(1)

    insert_pos = setup_match.end()
    text = text[:insert_pos] + "\n" + SERIAL_BEGIN + text[insert_pos:]

    # ── 2. Add Serial output after reactionTime is assigned ──────────────────
    # Match the exact assignment line used in the sketch.
    assign_match = re.search(
        r"([ \t]*reactionTime\s*=\s*millis\(\)\s*-\s*goTime\s*;)", text
    )
    if not assign_match:
        print("[error] Could not find 'reactionTime = millis() - goTime;' — is this the right file?")
        sys.exit(1)

    insert_pos = assign_match.end()
    text = text[:insert_pos] + SERIAL_RESULT + text[insert_pos:]

    # ── 3. Write backup then save ─────────────────────────────────────────────
    backup = sketch_path.with_suffix(".ino.bak")
    shutil.copy2(sketch_path, backup)
    sketch_path.write_text(text, encoding="utf-8")

    print(f"[ok] Patched {sketch_path}")
    print(f"     Backup saved to {backup}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = Path(sys.argv[1])
    else:
        # Default: patch the sketch that lives alongside this script
        target = Path(__file__).parent / "reaction_timer" / "reaction_timer.ino"

    if not target.exists():
        print(f"[error] File not found: {target}")
        sys.exit(1)

    patch(target)
