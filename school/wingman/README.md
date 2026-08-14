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
- **Weekly schedule** — set your class meeting times once; they show up everywhere (dashboard,
  calendar, and as "busy" blocks the study planner won't schedule over).
- **Flight Plan (study plan generator)** — automatically schedules study sessions in the free
  time around your classes, front-loading exams and heavily-weighted items and ramping up
  session frequency as the deadline approaches, instead of dumping everything the night before.
- **Calendar** — one week view merging classes, due dates, and study sessions, color-coded
  per course.
- **Focus timer** — a Pomodoro timer built into the Flight Plan page.
- **Outlook inbox** — optional; connects to your Microsoft account so you can see unread mail
  without leaving the app.

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
- **`MS_CLIENT_ID` / `MS_CLIENT_SECRET`** — optional, only needed if you want the Outlook inbox
  widget. See "Connecting Outlook" below.

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

The dashboard's inbox panel talks to Microsoft Graph, which requires you to register a free
app with Microsoft:

1. Go to [portal.azure.com](https://portal.azure.com) → **App registrations** → **New
   registration**.
2. Name it anything (e.g. "Wingman").
3. Under **Supported account types**, choose "Accounts in any organizational directory and
   personal Microsoft accounts".
4. Under **Redirect URI**, choose platform **Web** and enter:
   `http://localhost:4000/api/outlook/callback`
5. Click **Register**. Copy the **Application (client) ID** into `MS_CLIENT_ID` in `.env`.
6. Go to **Certificates & secrets** → **New client secret**. Copy the secret **value**
   (not the ID) into `MS_CLIENT_SECRET` in `.env`.
7. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated
   permissions** → add `Mail.Read`, `User.Read`, and `offline_access`.
8. Restart the backend (`npm run dev` picks up `.env` changes on restart), then go to
   **Settings** in the app and click **Connect Outlook**.

If you skip this, everything else in the app works fine — the inbox panel just shows a
"not set up" message.

## Project layout

```
backend/
  src/
    db/            SQLite schema + seed data (courses, assignments, schedule, settings)
    routes/         Express routes, one file per resource
    services/       Claude syllabus extraction, study plan generator, Outlook/Graph client
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
  Outlook messages fetched live from Microsoft Graph.
- The study plan is regenerated on demand from the **Flight Plan** page — regenerating clears
  and replaces previously auto-scheduled sessions (manually added sessions are left alone).
