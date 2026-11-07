# 19. Dashboard: the PM's cockpit on any device

## Why

The Notion Control Tower page is the hub, but it is a page for a laptop: it opens slowly on a phone, its views cannot show numbers across projects, and acting on a record means opening it. The scheduled skills write into Tasks, Threads, Reports, Risks and Decisions all day, and without one screen the PM loses track of what happened and what waits for them.

The dashboard (`tools/dashboard/`) is that screen. It is an installable web app (PWA) over the same Notion databases: open it on the phone between calls or on the laptop in the morning, see every project at once, act on a record in one tap. Notion stays the single source of truth; the dashboard stores nothing of its own.

## What it shows

| View | Content | Source |
|---|---|---|
| Home | four numbers (Overdue, Your turn, Critical risk, Due today), Start here (most urgent first, across projects), a row per project worst first with its health and reason, a quick task form | Tasks Tracker, Threads, Risks |
| Project > Overview | four numbers, open task mix, Needs you here, open risks, recent decisions, meetings and reports | Tasks Tracker, Threads, Risks, Decisions, Meetings, Reports |
| Tasks, Threads, Meetings, Decisions, Risks, Reports | the project's records with filters; threads show whose turn it is and for how many working days | the matching database |
| Automation | read-only: failed last runs, running now, coming up, recent runs, scheduled tasks and skills per project and general | optional `automation_db` and `runs_db` |
| Settings | projects on the board, language, theme, whose-turn swap, swipe left | this device only |
| Current state | the project's Current State page, read-only | `notion.current_state_page` of the project config |

Every record carries its project chip. Records of projects that are not in the dashboard config are never shown.

Project health is a rule, not a score: red "Needs you" for a critical risk, an overdue High task or a thread on your turn for more than 2 working days; amber "Watch" for anything overdue or due today, a high risk or any thread on your turn; green "On track" otherwise. Which thread statuses mean "your turn" comes from `app.turn` in the dashboard config (default: `Awaiting Reply` is yours, `Need Follow-up` is theirs, as in `projects/_standards.md` section 11).

## What it can change

| Database | Actions | Notes |
|---|---|---|
| Tasks Tracker | done or reopen, status, priority, due date, new task | a new task gets `Source = manual`; the project is always picked explicitly (Default Project Rule) |
| Risks | status, severity | `Last Updated` = today |
| Decisions | new decision, status | new = `Active`; decisions are never deleted, only Superseded or Cancelled |
| Threads | status and its icon | a human status, kept by the collectors until a new message arrives (below) |

Inbox is not shown in the app any more; quick capture goes straight to Tasks Tracker with an explicit project. Automation is read-only. Nothing is sent to anyone: the dashboard writes only to Notion.

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
