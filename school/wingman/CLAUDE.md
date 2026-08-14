# Wingman

Personal academic command center for an aerospace engineering student at UTK. Dashboard
surfaces today's schedule, upcoming deadlines, Outlook inbox, and grade-weight progress in
one place. Syllabus PDFs/docs get parsed by Claude into a structured list of graded dates,
which the student reviews and imports. A study-plan generator then spaces out study
sessions across free time between classes, weighted by how much each item is worth and how
hard it is, ramping up frequency as the deadline nears.

## Stack
- **Backend**: Node.js (ES modules) + Express, `node:sqlite` (built-in, no native build step —
  chosen specifically because `better-sqlite3` requires Visual Studio Build Tools that aren't
  installed on this machine), `@anthropic-ai/sdk` for syllabus extraction, `@azure/msal-node`
  for Outlook/Microsoft Graph.
- **Frontend**: React + Vite, plain CSS (no framework) using an earth-tone theme defined in
  `frontend/src/styles/theme.css`.
- No ORM, no test framework configured yet, no build step for the backend (runs directly via
  `node --watch`).

## Running it
See `README.md` for full setup (API keys, Azure app registration). Short version:
```
cd backend && npm install && cp .env.example .env && npm run dev
cd frontend && npm install && npm run dev
```
Frontend proxies `/api` to `http://localhost:4000` (see `frontend/vite.config.js`).

## Data
SQLite file at `backend/data/wingman.sqlite`, gitignored. Schema/seed logic lives entirely in
`backend/src/db/index.js` and runs on server startup (`CREATE TABLE IF NOT EXISTS`) — no
migration framework.

## Notable design choices
- Study plan generation (`backend/src/services/studyPlanService.js`) is a greedy scheduler,
  not a real optimizer — good enough for one student's calendar, not meant to scale.
- Outlook and Anthropic integrations both degrade gracefully when unconfigured (the UI shows
  a "not set up" prompt rather than erroring).
