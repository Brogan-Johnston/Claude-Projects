# 🚀 Wingman

Your academic command center — one dashboard for classes, deadlines, inbox, and a study plan
that builds itself around your schedule.

## Features

- **Flight Deck (dashboard)** — T-minus countdown to your next big deadline, today's classes
  at a glance, an urgency-sorted assignment list, your Outlook inbox, a grade-weight tracker
  per course, and quick links to Canvas/MyUTK/webmail.
- **Syllabus import** — upload a PDF/Word/text syllabus, Claude reads it and pulls out every
  exam, quiz, project, and homework due date (with your grade weight, where stated). You
  review and edit the extracted list before anything is saved.
- **Canvas import** — link a course to its Canvas course and pull in assignments and exam/test
  dates directly from Canvas's API, reviewed before anything is saved (same review-then-import
  flow as syllabus upload).
- **Weekly schedule** — set your class meeting times once; they show up everywhere (dashboard,
  calendar, and as "busy" blocks the study planner won't schedule over).
- **Flight Plan (study plan generator)** — automatically schedules study sessions in the free
  time around your classes, front-loading exams and heavily-weighted items and ramping up
  session frequency as the deadline approaches, instead of dumping everything the night before.
- **Calendar** — one week view merging classes, due dates, and study sessions, color-coded
  per course.
- **Focus timer** — a Pomodoro timer built into the Flight Plan page.
- **Outlook inbox** — optional; forward your university mail to a personal Outlook.com account
  and Wingman shows it without leaving the app.

## Requirements

- Node.js 22.5+ (this project uses the built-in `node:sqlite` module, so there's nothing to
  compile — no Visual Studio Build Tools needed).

## Quick start

Double-click **`start.bat`** in this folder. First run installs everything (may take a
minute); every run after that just starts the app and opens it in your browser at
`http://localhost:5173`. It opens two extra console windows ("Wingman Backend" and
"Wingman Frontend") — leave those open while you use the app, close them when you're done.

That's all most people need. The manual steps below are for reference or troubleshooting.

## Setup

### 1. Backend

```
cd backend
npm install
copy .env.example .env
```

Open `backend/.env` and fill in:

- **`ANTHROPIC_API_KEY`** — needed for syllabus import. Get one at
  [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys). You can
  also paste this in later from the app's Settings page instead of editing `.env`.

Outlook and Canvas need no `.env` setup at all — both are configured from the app's Settings
page. See "Connecting Outlook" and "Connecting Canvas" below.

The first `npm install` also downloads a Chromium browser for Playwright (used to read your
Outlook inbox) — this can take a minute or two and is normal, not a hang.

Start the API server:

```
npm run dev
```

It runs on `http://localhost:4000`.

### 2. Frontend

In a second terminal:

```
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api` requests to the backend, so both
need to be running.

## Connecting Outlook (optional)

Many universities (including UTK) don't allow students to register or consent to third-party
apps against their Microsoft 365 tenant, so Wingman can't use the official Outlook API for your
school email. The workaround:

1. In UTK's Outlook web mail, set up an inbox rule that forwards your mail to a personal
   Outlook.com or Hotmail account (Settings → Mail → Rules → Add new rule → Forward to).
2. In Wingman's **Settings**, click **Log in with Outlook**. A real Chromium browser window
   opens on your computer, signed into that personal account. Log in there yourself, including
   any two-factor prompt — Wingman never sees or stores your password.
3. Close that window (or just log in — it closes itself once you're in), then click
   **Check connection** in Settings.
4. One-time tip: in that personal account, turn off Focused Inbox (View → Focused Inbox) so
   Wingman doesn't miss mail sorted into "Other".

This works by controlling a real browser against Outlook's web interface, not an official API —
it's a workaround for an institutional restriction, and it can break if Microsoft changes the
page or a session expires. If the inbox panel shows an error, just log in again from Settings.

If you skip this, everything else in the app works fine — the inbox panel just shows a
"not connected" message.

## Connecting Canvas (optional)

1. In Canvas, go to **Account** → **Settings** → **+ New Access Token**. No admin approval is
   needed — this is a normal, supported student-facing feature.
2. In Wingman's **Settings**, paste your school's Canvas base URL (e.g.
   `https://utk.instructure.com`, prefilled by default) and the token, then **Save**.
3. On the **Courses** page, click **Canvas** on a course, pick the matching Canvas course from
   the dropdown to link it, then click **Sync from Canvas**.
4. Review the pulled-in assignments and exam/test dates (edit anything that looks off) and
   click **Import**. Re-syncing later updates previously imported items instead of duplicating
   them.

If you skip this, everything else in the app works fine — assignments can still be added
manually or via syllabus upload.

## Project layout

```
backend/
  src/
    db/            SQLite schema + seed data (courses, assignments, schedule, settings)
    routes/         Express routes, one file per resource
    services/       Claude syllabus extraction, study plan generator, Outlook scraper, Canvas client
    server.js
  data/             SQLite file lives here (gitignored)
frontend/
  src/
    pages/          One component per nav item (Dashboard, Calendar, Courses, StudyPlan, Settings)
    components/     Shared UI pieces (assignment list, inbox panel, syllabus uploader, timer, ...)
    styles/         Earth-tone theme (theme.css) + layout/component styles (layout.css)
    api/client.js   Small fetch wrapper
```

## Notes

- All your data stays local in `backend/data/wingman.sqlite` — nothing is synced anywhere
  except the syllabus text you choose to send to Claude for parsing, and (if connected) your
  Outlook messages and Canvas assignments fetched live from those services.
- The study plan is regenerated on demand from the **Flight Plan** page — regenerating clears
  and replaces previously auto-scheduled sessions (manually added sessions are left alone).
