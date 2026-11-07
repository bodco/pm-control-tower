# PM Control Tower dashboard

**English** | [Українська](README.uk.md)

An installable web app (PWA) over your PM Control Tower Notion databases. It opens on any device (Mac, Windows, iPhone, Android) and shows everything a PM checks during the day in one place: tasks, threads (email, Slack), meetings, decisions, risks, reports, the Current State page and key numbers per project. You can act from the dashboard too: add or close a task, change a risk or a thread status, log a decision. An optional read-only Automation page shows what your scheduled tasks ran, what is running and what is next.

![Overview](../../img/dashboard-overview.png)

## What you see

| View | Content |
|---|---|
| **Home** | Four numbers (Overdue, Your turn, Critical risk, Due today), each opening its list; **Start here**, the most urgent items across projects (5 visible, the rest in a scrollable block); a row per project, worst first, with its health and the reason in one sentence; a quick task form (title, description, project, due date) |
| **Project** | Tabs: Overview (four numbers, the open task mix, Needs you here, open risks, recent decisions, meetings, reports), Tasks, Threads, Risks, Decisions, Meetings, Reports, Automation, Current state |
| **Tasks** | Filters: all open, overdue, due today, this week, High, on hold, done in 7 days. Tick to close; status, due date and priority from the status sheet |
| **Threads** | Filters by whose turn it is (your turn, their turn, AI review), Replied, Spectator, all open, closed this week. A "Your turn · 3d" pill shows the turn and its age in working days above the Notion status |
| **Automation** | Read-only: what needs a look (failed last run), what is running now, what comes next, recent runs, scheduled tasks and skills by project and general. Nothing is started or changed from here |
| **Settings** | Projects shown on the board, language (English, Ukrainian), theme (system, dark, light), whose-turn swap, swipe left |

**Health** is a rule, not a score. Red "Needs you": a critical risk, an overdue High task, or a thread on your turn for more than 2 working days. Amber "Watch": anything overdue or due today, a high risk, or any thread on your turn. Green "On track" otherwise. Each state has its own shape and word, not only a color.

**Whose turn** comes from `app.turn` in the config (which thread statuses mean your turn and their turn). The default follows `projects/_standards.md` section 11: `Awaiting Reply` is your turn, `Need Follow-up` is theirs. Settings has a switch to swap them on one device.

**Gestures and keys.** Swipe right closes a task or marks a thread Replied; swipe left (off by default, Settings) moves a task to tomorrow or marks a thread Need Follow-up; long press opens the status sheet; every change shows Undo for 6 seconds; pull down to refresh. On a laptop: J and K move, X selects, D done, R Replied, S status, O open in Notion, N new task, ? help.

Every record carries its project. The dashboard reads and writes only the projects listed in its config and refuses records of any other project. When you create a task or a decision you pick the project explicitly: the dashboard never guesses it (Default Project Rule).

## What it can change

| Database | Actions |
|---|---|
| Tasks Tracker | mark done or reopen, status, priority, due date, new task with description (`Source = manual`) |
| Risks | status, severity (`Last Updated` = today) |
| Decisions | new decision (`Status = Active`), Superseded or Cancelled |
| Threads | status, with the matching page icon. A status set here is a human decision: it writes `Manual Status At`, and the collectors keep it until the thread gets a new message (`projects/_standards.md` section 11) |

Inbox is no longer shown in the app (the API routes stay for compatibility). Automation is read-only. Nothing is sent to anyone. The dashboard writes only to your Notion.

## How it works

```
phone / laptop  ──►  Cloudflare Access (login with your email)
                         │
                         ▼
                Cloudflare Worker ── serves the PWA (public/)
                         │           and the /api routes (src/)
                         ▼
                     Notion API  (your integration token, a Worker secret)
```

- The Notion API cannot be called from a browser, and the token must not reach one, so a small Worker sits in between. It runs on the Cloudflare free plan.
- **Your data stays yours.** The repository holds only code. Your database IDs and project list live in `config/dashboard.config.json`, your Access settings in `wrangler.toml`, and your Notion token in a Worker secret. All three are git-ignored, so a clone of this repository connects to nothing until its owner fills them in with their own resources.
- Access protects the whole app, static files included. The Worker checks the Access token again (signature, audience, expiry, optional email allow-list) and refuses everything when Access is not configured.
- Reads are cached for 30 seconds inside the Worker; any write clears the cache. The app keeps the last good data for offline use and says when it shows cached data.

## Set up (about 20 minutes)

You need: Node 18+, a free Cloudflare account, and your Control Tower in Notion.

1. **Notion integration.** In Notion, Settings > Connections > Develop or manage integrations, create an internal integration with read and update content. Copy its token. Share the Control Tower page (with its databases) and every Current State page with this integration.
2. **Install and create local files.**
   ```bash
   cd tools/dashboard
   npm install
   npm run setup        # creates config/dashboard.config.json and wrangler.toml
   ```
3. **Fill in `config/dashboard.config.json`.** The `notion.*` values are the same data source IDs as in `projects/<slug>.md` (`collection://...`). Add one entry per project: `slug`, `name`, `color`, `project_page_id`, `workspace_page_id`, `current_state_page_id`. Property names follow `docs/en/02-notion-control-tower.md`; if yours differ, override them under `schema` (see `src/schema.js`).
4. **Token.**
   ```bash
   npx wrangler login
   npx wrangler secret put NOTION_TOKEN
   ```
5. **Deploy.** `npm run deploy` prints the `*.workers.dev` URL. If Wrangler cannot reach Cloudflare from your machine, run `npm run build:single` and upload `dist/worker.single.mjs` as described in `DEVELOPMENT.md`.
6. **Access.** In the Cloudflare dashboard: Workers > your Worker > Settings > Domains & Routes, enable Cloudflare Access on the workers.dev route (or create a self-hosted Access application for a custom domain). Allow only your email. Copy the application **Audience (AUD) tag** and your team domain (`<team>.cloudflareaccess.com`) into `wrangler.toml`, set `ALLOWED_EMAILS`, and run `npm run deploy` again.
7. **Install the app.** Open the URL and log in. On iPhone: Share > Add to Home Screen. On Android or desktop Chrome/Edge: Install app.

A custom domain such as `dashboard.example.com` works only for a domain whose DNS is hosted in Cloudflare. The workers.dev URL needs no DNS changes.

## Threads: manual status

The Threads database needs two properties (in the public template since 1.10.0): **`Manual Status At`** (date) and **`Collector Status`** (text). The dashboard writes `Manual Status At` when you change a status; the collectors write every status they set into `Collector Status` too, so a status you change directly in Notion is recognised as well. A manual status is kept until a message newer than `Manual Status At` arrives; then the collectors recompute it and clear the date. Without these properties the dashboard still changes the status but warns that the next collector run may overwrite it.

## Try it without Notion

```bash
npm install
npm run demo     # mock Notion with demo data on http://localhost:8787
npm test         # API, safety and Access checks against the mock
```

## Continue development

`DEVELOPMENT.md` is the handoff: code map, demo and tests, recipes for a new view or action, deploy paths, roadmap. `DESIGN-BRIEF.md` is the brief for a UI/UX redesign.

## Files

| Path | What |
|---|---|
| `public/` | the PWA: `index.html`, `app.js`, `styles.css`, `sw.js`, manifest, icons |
| `src/worker.js` | Worker entry: Access check, static files, `/api` |
| `src/worker-inline.js`, `scripts/build-single.mjs` | the same Worker as one module with the PWA embedded |
| `src/api.js` | queries, metrics and the allowed writes |
| `src/notion.js` | Notion REST client (API version 2025-09-03) |
| `src/auth.js` | Cloudflare Access token verification |
| `src/schema.js` | property names of the Control Tower databases |
| `config/dashboard.config.example.json` | config template (your copy is git-ignored) |
| `wrangler.example.toml` | Worker settings template (your copy is git-ignored) |
| `test/` | mock Notion, demo server, smoke tests |
