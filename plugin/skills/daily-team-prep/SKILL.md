---
name: daily-team-prep
description: "Generates prep notes for the project's internal team sync (time and cadence come from the Meetings Schedule in the project config). Dynamically computes the review window since the last prep (not a fixed 24h/yesterday window), since sync cadence can be irregular or change over time. Collects tracker changes, recent Slack threads, relevant direct messages, unresolved blockers, and pending action items from recent meetings, degrading gracefully when a source is not configured. Use whenever the user mentions \"підготуй мене до синку\", \"team prep\", \"дейлі преп\", \"адженда на стендап\", \"підготовка до внутрішнього синку\", preparing for the internal team sync, team prep, daily prep, agenda for standup, or asks to be prepped for a meeting with the team on a named project. When triggered, execute immediately."
---

# Daily Team Prep

## Step 0 - Project config and source availability (always run first)

1. Determine the project from the user's request. If the project is NOT explicitly
   named, do not guess and do not default: ask the user which project (list the
   configs in `projects/`). See the Default Project Rule in `projects/SKILL.md`.
2. Read the project config `../projects/{project_slug}.md` relative to this skill's
   folder. If the relative read fails, locate it with Glob:
   `**/projects/{project_slug}.md` under the skills directory.
3. All values below marked `{config.xxx}` come from that config file. Also read
   `projects/SKILL.md` for the cross-cutting rules (Default Project Rule, JQL Isolation
   Validator, Data Completeness header, PM standards, the 5-minute rule) and
   `../projects/_standards.md` (sections 2 and 5).
4. **Check which sources this project actually has.** Never fail on a missing
   source and never emit an empty section without saying why:

| Config value | If present | If absent |
|---|---|---|
| `task_tracker.api_access: true` | query the tracker (section 1) | use `task_tracker.fallback_source`: newest file in `export_path`, action items from Meetings DB, or Threads DB. State the source and its date in the report header |
| `slack.slack_access` is `mcp`, `mcp_local` or `chrome` and `slack.channels_all` non-empty | scan Slack channels (section 2) | `slack_access: none` or empty channel list: line "Slack не підключений для цього проєкту" (one header line, nothing else) |
| `slack.slack_access` supports listing the PM's own conversations (`mcp` or `mcp_local`, not `chrome`) | scan relevant DMs (section 2b) | line: "особисті повідомлення: не підтримується при slack_access = chrome" |
| `sentry.url` not `none` | quick Sentry check (section 4) | line: "Sentry не підключений" |
| `notion.meetings_db` | scan meetings (section 3) | skip |
| `pm_profile` present | metric set from `pm_profile.metrics_profile` | derive the profile from `board_type`, write `PM Profile: SKIPPED` in the header |

`slack_access` takes exactly one of `mcp | mcp_local | chrome | none`.

5. **Secrets.** Tokens are never stored in the config. Read the value at runtime and
   never print it:

```bash
grep '^{config.sentry.token_env}=' {config.sentry.secrets_file} | cut -d= -f2-
```

If the config file doesn't exist, tell the user: "Project config not found.
Available projects: [list files in projects/]"

## Step 0b - Verify the live schema (before any Notion write)

Before the first write of a run, fetch the Reports data source (`notion-fetch` on
`{config.notion.reports_db}`) and use the property names it actually reports (`Report
Name`, `Date`, `Type`, `Skill`, `Visibility`, `Summary`, `Project`, `Workspace`). If the
live schema differs from this skill, the live schema wins: write with the real names and
report the discrepancy in chat so the config and this skill are fixed the same day.

---

## Step 0.5 - Determine the review window (always run before collecting data)

**Do not assume a fixed 24-hour or "yesterday" window.** Sync cadence is often
irregular (e.g. twice a week, alternating weekdays) and can change over time - a
hardcoded day-count silently misses days whenever the gap since the last sync is
longer than assumed, which is exactly the kind of silent gap this framework treats
as a real defect (see the framework's completeness principle (manifest, principle 10)).

Instead, derive the window from evidence:

1. Fetch the Reports data source (`{config.notion.reports_db}`; `notion-fetch` and
   filter, or `notion-query-data-sources` if the plan allows) for the most recent
   report with `Type = "Daily Team Prep"` and `Project` matching this project,
   sorted by date descending, limit 1.
2. If found: `WINDOW_START` = that report's date (the day after it, i.e. collect
   everything published since that prior prep ran). This self-corrects automatically
   if the meeting cadence changes - no calendar math needed.
3. If no prior report exists (first run for this project, or the report type was
   never saved before): fall back to `{config.meetings.internal_sync_cadence}` and the
   Meetings Schedule table to estimate the most recent likely prior sync day
   from the documented pattern, and say explicitly in the report that this is a
   first-run estimate, not derived from history ("перший запуск, період оцінено за
   розкладом конфігу, не за історією"). If the cadence is `none` or missing, ask the
   user for the window.
4. State the actual window used as the first line of the report body:
   `Огляд за період: {WINDOW_START} - {today}`.

This same `WINDOW_START` drives every section below - there is no separate "last
24h" or "yesterday" logic anywhere else in this skill.

---

Generates a compact prep document for the project's internal sync (authoritative
schedule in the project config). The goal is to ensure nothing falls through the
cracks across the actual gap since the last sync: blockers get discussed, progress
gets acknowledged, and action items get followed up.

**Prep structure.** The `Agenda` key of the matching Meetings Schedule row selects the
prep structure from `_standards.md` section 5 (typically `daily_standup`); if the row
has no `Agenda` value, map by `Type` and ask when ambiguous. The Report Format below is
the fallback structure and stays the default for `daily_standup`.

**Metrics.** Any counts or metrics in the prep use the metric set from
`{config.pm_profile.metrics_profile}` and the thresholds from `_standards.md` section 2;
with no PM Profile, derive the profile from `{config.board_type}` and write
`PM Profile: SKIPPED` in the header.

## Data Sources

Collect from these sources in parallel, all scoped to `WINDOW_START -> today`.

### 1. Tracker: movements since the last prep

**Only when `{config.task_tracker.api_access}` is true.** Every query MUST be scoped
to the project with `project = {config.task_tracker.project_key}` (JQL Isolation
Validator in `projects/SKILL.md`); an unscoped query on a shared company tracker leaks
another client's tickets into this report. Reads go to the Jira MCP server from
`{config.jira.mcp_read}` (default `jira`): `search_issues` for JQL, `get_issue` for
details.

```
project = {config.task_tracker.project_key} AND status CHANGED AFTER "{WINDOW_START}" ORDER BY updated DESC
```

Currently blocked tickets:
```
project = {config.task_tracker.project_key} AND status = "{blocked status from the Workflow table}" ORDER BY updated DESC
```

Active development (who is working on what):
```
project = {config.task_tracker.project_key} AND status in ("{active statuses from the Workflow table}") ORDER BY assignee ASC
```

For each ticket: key, summary, assignee, from-status, to-status (if transitioned).
Exact status names and transition IDs come from the config's Workflow table, verbatim
(names with spaces or slashes are quoted in JQL exactly as written there).

**When `api_access` is false:** take the same three views from
`{config.task_tracker.fallback_source}` as far as it allows (a manual export usually
gives current status and assignee but no transition history), and open the report with
a line such as "Джерело задач: ручний експорт від 2026-09-05 (свіжість 2 дні)".
If the export is older than 3 days, say so plainly instead of presenting it as current.

### 2. Slack: new threads since the last prep

**Channels to scan:** `{config.slack.channels_all}`

From `WINDOW_START` to now, using the access method from `{config.slack.slack_access}`:
`mcp` = the Slack connector tools (`slack_read_channel`, `slack_read_thread`,
`slack_search_public_and_private`, `slack_list_user_channels`); `mcp_local` = the local
server named in `{config.slack.mcp_local_server}` (typically `conversations_history`,
`conversations_replies`, `channels_list`); `chrome` = the Claude in Chrome connector on
the web UI; `none` = skip Slack with one header line. Focus on:
- messages with replies (active discussions)
- messages mentioning team members
- messages about bugs, issues, or blockers

### 2b. Slack: relevant direct messages

Personal DMs can carry information that never makes it into a channel (a quick
heads-up, an informal blocker report, a client aside). Include them, scoped to
avoid pulling in unrelated personal chats:

1. List the PM's own conversations (`slack_list_user_channels` for `slack_access:
   mcp`, or the equivalent listing tool for `mcp_local` - filter to `im`/`mpim`
   types). Skip this step entirely if the access mode is `chrome` (no listing tool)
   or if the listing call is unavailable - say so in the report rather than silently
   omitting the section.
2. Keep only DMs with people who appear in this project's config: the "Team -
   Internal" or "Team - Client" rosters. Discard DMs with anyone not on either
   roster - this is what keeps the section scoped to project-relevant conversations
   instead of the PM's entire personal DM history.
3. For each kept DM, read messages from `WINDOW_START` to now. Apply the same
   relevance filter as channel messages (blockers, bugs, decisions, anything
   actionable) - skip pure small talk.
4. If a DM contains something that changes what the PM should raise in the sync,
   surface it explicitly and note it came from a DM, not a channel (the source
   matters for context when discussing it later).

### 3. Notion: pending action items

Fetch the Meetings DB (`{config.notion.meetings_db}`; `notion-fetch` the data source
and filter) for meetings since `WINDOW_START` that have a report appended. Scan for
action item patterns: "Action:", "TODO:", "Дія:", bullet points with assignees. Filter
by the `Project` relation (`["https://app.notion.com/p/{config.notion.project_page_id}"]`,
id without dashes).

### 4. Sentry: critical new issues (quick check)

Only the projects in scope, not every slug on the instance. Compute the number of
full or partial days between `WINDOW_START` and today (minimum 1) as `N`:

```
GET {config.sentry.url}/api/0/projects/{config.sentry.org_slug}/{slug}/issues/?query=is:unresolved&statsPeriod={N}d&sort=date&limit=5
```

for each slug in `{config.sentry.projects_in_scope}`, via curl with
`Authorization: Bearer <token read from the secrets file>` (never print the token).
If the instance rejects `statsPeriod`, fall back to `start`/`end` ISO dates. Slugs in
`{config.sentry.projects_out_of_scope}` and components the config's Scope of
Responsibility marks as client-owned are context only: never promise our fix and never
create tickets or risks for them. Only include issues with
more than 5 events in the window (skip noise) - scale the noise threshold down for a
short (1-day) window and up for a long one if the raw count looks clearly wrong for
the window size.

## Report Format

**Template** (`daily-team-prep`): resolve it first per "Document templates" in `projects/SKILL.md` (registry `../projects/_templates.md`). The format below is the built-in default; a house or project template replaces its sections, order and fixed wording, never the invariants listed there.

Generate in Ukrainian, keep it compact. This is a prep doc, not a full report.

The FIRST line of the report is the Data Completeness header (`projects/SKILL.md`): one
line with the state of every source the skill was supposed to use, `PM Profile`
included, in English when `{config.default_language}` is English.

```
## Team Sync Prep - [date] (до внутрішнього міту [час з конфігу])

Джерела: Tracker OK · Slack EMPTY (0 повідомлень за період) · DMs SKIPPED (slack_access: chrome) · Meetings OK · Sentry SKIPPED (url: none) · PM Profile OK

Огляд за період: [WINDOW_START] - [сьогодні] [позначка, якщо це перший запуск-оцінка]

[рядок про джерело задач і його свіжість - тільки якщо це не живий трекер]

### Хто чим зайнятий
- **[Assignee]**: {KEY}-XXX [summary] - [status]

### Рух по борді (за період)
- {KEY}-XXX: [old status] -> [new status] ([assignee])
(якщо нічого не рухалось - "За період без змін на борді")

### Блокери
- **{KEY}-XXX** [summary] - blocked [N днів], assignee: [name]
  (останній коментар: [суть якщо є])
(якщо немає - "Немає заблокованих тікетів")

### Теми зі Slack (за період)
- [channel]: [коротко про тему] ([хто підняв])
(якщо тихо - "Slack без нових важливих тредів"; якщо не підключений - сказати це)

### Особисті повідомлення, варті уваги
- [з ким]: [суть] (джерело: DM)
(якщо нічого вартого уваги не знайдено - рядок опускається, не пишеться "немає")

### Невиконані action items з мітів
- [дата міту]: [action item] - [відповідальний]

### Sentry (за період)
- [project]: [error] (X events)
(якщо чисто - "Sentry: без нових критичних помилок"; якщо не підключений - сказати це)

### Мої нотатки до обговорення
[порожній блок - PM заповнює вручну перед мітом]
```

## Behavior

1. Compute `WINDOW_START` first (Step 0.5), before running any data source query.
2. Run all available data source queries in parallel, all scoped to `WINDOW_START`.
3. Compile into the compact format above.
4. Keep the report short: aim for a document that takes 2 minutes to scan, even when
   the window covers several days - summarize and cluster rather than listing every
   item flat when the window is long.
5. Highlight blockers and action items prominently. These are the most important parts.
6. If a data source fails at runtime (as opposed to being unconfigured), mark it
   `FAILED` in the header (never merged with `EMPTY`), note it in one line and move on.
7. If running as a scheduled task, save to the outputs folder and to the Notion Reports
   DB (see Report Storage).
8. If running manually (including a live demo), present in chat, and still consider
   saving to Reports DB unless the user is clearly just testing/demoing.
9. On a sync-day question ("is today a sync day"): the config's documented cadence is
   a description of the general pattern, not a formula to run - when in doubt, generate
   the prep anyway rather than trying to compute day-of-week parity. The cadence can
   change (the config will say so if it has); Step 0.5's evidence-based window already
   makes this skill resilient to that.
10. The 5-minute rule (`projects/SKILL.md`, "Agent write permissions"). Writes allowed
    without asking: the prep page in the Reports DB; everything else is a draft for
    the PM.

## Team Reference

See the Team section in the config for the roster, roles and focus areas. See the
Transcript Alias Map for name aliases used in transcripts. Never assign or reference
anyone listed under Former Members as active.

## Report Storage

Save the report to the Notion Reports DB: `{config.notion.reports_db}`.

Use `notion-create-pages` with these properties (property names verified in Step 0b;
Reports uses the relations `Project` and `Workspace`, values as arrays of page URLs):

| Property | Value |
|----------|-------|
| Report Name | `Team Sync Prep - [date]` |
| date:Date:start | Today's date in ISO format (YYYY-MM-DD) |
| Type | `Daily Team Prep` |
| Skill | `daily-team-prep` |
| Visibility | `Internal` |
| Summary | 2-3 sentence summary of key findings, including the window covered |
| Workspace | `["https://app.notion.com/p/{config.notion.workspace_page_id}"]` (id without dashes) |
| Project | `["https://app.notion.com/p/{config.notion.project_page_id}"]` (id without dashes) |

The **full report content** goes as the page body (Notion Markdown, in blocks of at
most 2000 characters), so Control Tower keeps a complete searchable archive. Keep
`Type` as `Daily Team Prep` even though the cadence isn't literally daily any more -
Step 0.5 relies on this exact value to find the previous run.