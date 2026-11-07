# 19. Dashboard: the PM's cockpit on any device

## Why

The Notion Control Tower page is the hub, but it is a page for a laptop: it opens slowly on a phone, its views cannot show numbers across projects, and acting on a record means opening it. The scheduled skills write into Tasks, Threads, Reports, Risks and Decisions all day, and without one screen the PM loses track of what happened and what waits for them.

The dashboard (`tools/dashboard/`) is that screen. It is an installable web app (PWA) over the same Notion databases: open it on the phone between calls or on the laptop in the morning, see every project at once, act on a record in one tap. Notion stays the single source of truth; the dashboard stores nothing of its own.

## What it shows

The layout since dashboard 2.1 is a "calm dashboard" built for a quick triage: one sentence per page, numbers as a quiet strip, at most one colored fact per row, actions hidden until hover, focus, a swipe or a tap.

| View | Content | Source |
|---|---|---|
| Today | a sentence ("2 replies and 3 tasks need you"), numbers that filter the queue (Needs you, Overdue, Your turn, Critical risk, Due today), a failed scheduled task, the Needs you queue, "to nudge" and "stale threads", the next call, projects with a health word | Tasks Tracker, Threads, Risks, Meetings, optional Automation |
| Inbox | notes captured with "+", routed to a project as tasks | Inbox |
| Project | Overview, Work (tasks or threads grouped by their Notion status), Log (meetings, decisions, reports in one stream), Risks; a menu with Current state, the project's Automation and Open in Notion | all project databases |
| Automation | read-only: what needs a look, the schedule as a table, skills with search | optional `automation_db` and `runs_db` |
| Settings | language, theme, projects on the board, whose-turn swap, keys | this device only |

Every record carries its project. Records of projects that are not in the dashboard config are never shown.

The rules live in one client module, so each number has one definition and a click on it opens exactly the list it counted:

- **Needs you**: threads on your turn, overdue and due-today tasks, Critical risks and risks whose trigger date is 7 days away or closer. Order: overdue and critical, then your turn by age, then today.
- **Freshness**: the age counts from the last message on either side, or the last manual change. 14 to 30 days is "quiet"; 30 days and more is stale and counted nowhere, with a one-card-at-a-time review. Their turn becomes "to nudge" after 5 days. The thresholds are in `app.freshness` of the dashboard config, per project if needed.
- **Health** is a rule, not a score: red "Needs you" for a critical risk, an overdue High task or a thread on your turn for more than 2 working days; amber "Watch" for anything overdue or due today, a high risk or any thread on your turn; green "On track" otherwise. Which thread statuses mean "your turn" comes from `app.turn` (default: `Awaiting Reply` is yours, `Need Follow-up` is theirs, as in `projects/_standards.md` section 11).
- **Dates**: under 7 days relative ("today 15:00", "tomorrow", "Mon", "3d"), older "4 Nov", overdue "2d late"; no ISO timestamps anywhere.
- **Next call**: the next meeting today or tomorrow from Meetings, with 2 or 3 things to raise (your-turn threads and risks of that project).

Risks can carry two optional dates, `Trigger Date` and `Last Reviewed`. With them the dashboard shows when a risk fires, flags one not reviewed for 14 days, and offers Reviewed; without them it sorts risks by severity and hides those parts.

## What it can change

| Database | Actions | Notes |
|---|---|---|
| Tasks Tracker | done or reopen, snooze (the due date moves), status, priority, new task, a task from a thread, a task from the Inbox | a new task gets `Source = manual` (`inbox` when routed); the project is always picked explicitly (Default Project Rule) |
| Threads | status and its icon; "Still relevant" | a human status, kept by the collectors until a new message arrives (below); "Still relevant" writes only `Manual Status At` |
| Risks | status, severity, Reviewed | `Last Updated` = today; Reviewed writes `Last Reviewed` and needs that property |
| Decisions | new decision, status | new = `Active`; decisions are never deleted, only Superseded or Cancelled |
| Inbox | new note, route to Tasks | a note may have no project; routing needs one |

Every change shows Undo for 6 seconds and is written when the toast ends. Offline, changes wait in a queue and sync later. If the record changed in Notion after the dashboard loaded it, the change is refused instead of overwriting the newer edit. Automation is read-only: everything runs from Cowork. Nothing is sent to anyone: the dashboard writes only to Notion.

## Manual thread status

Until 1.10.0 every collector pass recomputed `Status`, so a status set by hand was overwritten. Now a human decision sticks (rule 4 of `projects/_standards.md` section 11):

- the collector writes every status it sets into `Collector Status` too;
- a `Status` that differs from `Collector Status`, or a filled `Manual Status At`, is a human status. The dashboard writes `Manual Status At`; a change made directly in Notion is detected by the difference, and the collector then fills `Manual Status At` itself;
- the collector keeps that status and its icon until the thread gets a message newer than `Manual Status At`. Then it recomputes, writes `Status`, `Collector Status` and the icon, and clears the date.

Both properties are in the Threads database of the public template since 1.10.0. A Threads database without them keeps the old behaviour, and the collector says so in its summary.

## Architecture

```
phone / laptop  ->  sign-in gate (Cloudflare Access)
                        |
                        v
               Cloudflare Worker  - serves the PWA and /api
                        |
                        v
                    Notion API  (integration token, a Worker secret)
```

- **Why a Worker.** The Notion API refuses calls from a browser, and the token must never reach one. The Worker runs on the Cloudflare free plan.
- **Data stays with the deployer.** The repository holds code only. Database IDs and the project list live in `config/dashboard.config.json`, the gate settings in `wrangler.toml`, the token in a Worker secret. All three are git-ignored: a clone connects to nothing until its owner fills in their own resources.
- **Fails closed.** Without a configured gate the Worker answers 503 to everything. It verifies the Access token itself (signature, audience, expiry, optional email list), so a request that bypasses the gate is refused.
- **Guarded writes.** A write is accepted only for a record whose parent is the configured database and whose `Project` is a configured project, only with values that exist in the live schema, and only with the `X-CT-Request` header (no cross-site forms).
- **Live schema.** Status and select options come from the database schema, so an extra status such as `Won't Do` works without code changes. Property names follow document `02`; a deployment can override them under `schema` in the config.
- **Cache and offline.** Reads are cached for 30 seconds in the Worker; a write clears it. The service worker keeps the last good data and the app says when it shows cached data.

## Deploying

Two ways, both described step by step in `tools/dashboard/README.md`:

1. `npm run deploy` with Wrangler (the PWA as Workers Static Assets).
2. `npm run build:single` builds one module with the PWA embedded (`dist/worker.single.mjs`) for an upload through the Cloudflare API or dashboard, when Wrangler cannot reach Cloudflare from your machine.

The gate is Cloudflare Access (Zero Trust free plan, which asks for a card at sign-up even at $0). The address is the `*.workers.dev` URL or a custom domain on a zone hosted in Cloudflare.

## Developing

`tools/dashboard/DEVELOPMENT.md` is the handoff for whoever continues: the code map, how to run the demo and the tests, how to add a view or a write action, the conventions and the roadmap.

## Limits

- Notion buttons, calendar views and the content of Notion AI meeting notes are not read.
- The dashboard is single-user by design: one Notion token, one gate policy.
- Metrics are counted from Notion only. Jira, Sentry and time tracking are reached through the skills and their reports, not directly.
