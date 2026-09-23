---
name: client-meeting-prep
description: "Generates status update and prep notes for the project's client meetings. Attendees, meeting types and cadence come from the Meetings Schedule in the project config (e.g. planning, status syncs, 1-1 with the client PM, demo or review). Degrades gracefully when the project has no tracker API. Use this skill whenever the user mentions \"client prep\", \"підготовка до клієнтського міту\", \"prep для клієнтського PM\", \"Client PM prep\", \"planning prep\", \"review prep\", \"status update для клієнта\", \"що сказати клієнту\", \"підготуй апдейт\", or any request to prepare for a meeting with the client team, also when run on a schedule. When triggered, execute immediately."
---

# Client Meeting Prep

## Step 0 - Project config and source availability (always run first)

1. Determine the project from the user's request. If the project is NOT explicitly
   named, do not guess and do not default: ask the user which project (list the configs
   in `projects/`). See the Default Project Rule in `projects/SKILL.md`.
2. Read the project config `../projects/{project_slug}.md` relative to this skill's
   folder (fallback: Glob `**/projects/{project_slug}.md`).
3. All values marked `{config.xxx}` come from that config. Also read `projects/SKILL.md`
   for the cross-cutting rules (Default Project Rule, JQL Isolation Validator, Data
   Completeness header, PM standards, the 5-minute rule) and
   `../projects/_standards.md` (sections 1 and 5).
4. **Determine the meeting type** from the config's Meetings Schedule plus today's day
   of week, or from the user's explicit request. The schedule is authoritative: do not
   assume a day or a time. If the day matches no meeting in the schedule, ask which
   meeting is meant. The row's `Agenda` key selects the prep structure from
   `_standards.md` section 5 (fallback: map by `Type`, ask if ambiguous); the formats
   below are the fallback structures.
5. **Check which sources this project has:**

| Config value | If present | If absent |
|---|---|---|
| `task_tracker.api_access: true` | query the tracker | use `task_tracker.fallback_source` (newest manual export, meeting action items, Threads) and open the prep with the source and its date |
| `client_tracker.type` not `none` | mention where the client sees status and when it was last synced | skip |
| `slack.slack_access` not `none` (`mcp | mcp_local | chrome`) and `slack.channels_all` non-empty | scan Slack | skip with one header line |

6. **Secrets** (if any source needs a token): read at runtime from
   `{config.sentry.secrets_file}` by the variable named in `{config.sentry.token_env}`;
   never print a token.

If the config file doesn't exist, tell the user: "Project config not found.
Available projects: [list files in projects/]"

## Step 0b - Verify the live schema (before any Notion write)

Before the first write of a run, fetch the Reports data source (`notion-fetch` on
`{config.notion.reports_db}`) and use the property names it actually reports (`Report
Name`, `Date`, `Type`, `Skill`, `Visibility`, `Summary`, `Project`, `Workspace`). If the
live schema differs from this skill, the live schema wins: write with the real names and
report the discrepancy in chat so the config and this skill are fixed the same day.

---

Generates focused prep notes for meetings with the `{config.project_name}` client team.
The prep adapts its structure to the meeting type, but the data collection is the same.

## Data Collection

Run in parallel. All tracker queries MUST be scoped with
`project = {config.task_tracker.project_key}` (JQL Isolation Validator in
`projects/SKILL.md`): the company tracker is shared across clients and an unscoped query
leaks another project's tickets into a client-facing prep. Reads go to the Jira MCP
server from `{config.jira.mcp_read}` (default `jira`): `search_issues`, `get_issue`.
Status names come from the config's Workflow table, verbatim.

### 1. Board state

```
project = {config.task_tracker.project_key} AND status != Done AND status != Backlog ORDER BY status ASC, updated DESC
```

Group by status into pipeline stages using the config's Workflow table (active work,
review, testing pipeline, awaiting verification, blocked).

### 2. This week's completions

```
project = {config.task_tracker.project_key} AND status = Done AND resolved >= startOfWeek() ORDER BY resolved DESC
```

### 3. Tickets awaiting client input

```
project = {config.task_tracker.project_key} AND status = "{blocked status from the Workflow table}" ORDER BY updated DESC
```

Keep the ones whose summary or latest comments point at the client (a decision, a spec,
an access, an approval). Read recent comments for context.

### 4. Client-side work (only if the config's Labels Taxonomy has an active label for work done by the client's developers)

If the Labels Taxonomy has no such label, or marks it HISTORICAL, skip this section
entirely and never ask the client about client-developer PRs. Otherwise:
```
project = {config.task_tracker.project_key} AND labels = "{client-side label from the Labels Taxonomy}" AND status != Done ORDER BY updated DESC
```

### 5. Recent Slack threads with client context

Channels `{config.slack.channels_all}`, last 3 days, threads that mention client topics
or need client input. Access per `{config.slack.slack_access}`: `mcp` = the Slack
connector tools (`slack_read_channel`, `slack_read_thread`,
`slack_search_public_and_private`); `mcp_local` = the local server named in
`{config.slack.mcp_local_server}` (typically `conversations_history`,
`conversations_replies`); `chrome` = the Claude in Chrome connector.

### 6. Notion threads and risks

- Threads DB (`{config.notion.threads_db}`): open threads for this project with Status
  `Awaiting Reply` or `Need Follow-up` (`notion-fetch` the data source and filter by the
  `Project` relation). Email evidence comes from here (Type `["Email"]`); Gmail tools
  (`gmail_search_messages`, `gmail_read_thread`) only when
  `{config.gmail.client_search_filter}` is not `none`
- Risks DB (`{config.notion.risks_db}`): open risks with `Visibility` = `External` or
  `Both`. Internal-only risks never go into a client prep
- Decisions DB (`{config.notion.decisions_db}`): decisions from the last two weeks, so
  the prep does not reopen something already agreed

### 7. Client tracker sync state

If `{config.client_tracker.type}` is not `none`: when was it last synced (per
`{config.client_tracker.sync_cadence}` and `sync_method`), and is anything Done since
then not yet reflected on the client's board (`{config.client_tracker.roadmap_url}` /
`db_id`). The client sees that board, so a stale board becomes a meeting question.
Never claim to know statuses from a client tracker with `api_access: false`.

## Report Format by Meeting Type

**Template** (`client-meeting-prep.planning`, `client-meeting-prep.status-sync`, `client-meeting-prep.one-on-one`, `client-meeting-prep.review`): resolve it first per "Document templates" in `projects/SKILL.md` (registry `../projects/_templates.md`). The format below is the built-in default; a house or project template replaces its sections, order and fixed wording, never the invariants listed there.

The meeting names below map to the `Agenda` key (fallback: the `Type` column) of the
config's Meetings Schedule: planning = `sprint_planning` / `backlog_refinement`, status
sync = `client_status_sync`, 1-1 = `stakeholder_1on1`, review = `client_demo` /
`sprint_review`. Use the attendee names from the config's client team table, not from
memory.

The FIRST line of every prep is the Data Completeness header (`projects/SKILL.md`): one
line with the state of every source the skill was supposed to use, `PM Profile`
included, in English when `{config.default_language}` is English, e.g.
`Джерела: Tracker OK · Slack SKIPPED (slack_access: none) · Threads OK · Risks EMPTY · Decisions OK · Client board STALE (синк від {date}) · PM Profile OK`.

Reader rule (`_standards.md` sections 1 and 5): every client prep ends, right before
"Мої теми", with a "Рішення, які треба отримати на цьому мітингу" block (the prep's
"Decisions needed from you"; if none, say so explicitly).

### Planning prep

```
## Planning Prep - [day] [date] (міт з клієнтом [час з конфігу])
Джерела: [Data Completeness header]
[рядок про джерело задач і свіжість - тільки якщо це не живий трекер]

### Pipeline Overview
- In Progress: X, тестова черга: X, Blocked: X

### Кандидати на взяття в роботу
- {KEY}-XXX: [summary] (label: [label])

### Що чекаємо від клієнта
- [{KEY}-XXX]: [що саме і від кого]

### Ризики та блокери (тільки External / Both)
- [risk with context]

### Мої теми на обговорення
[порожній блок для PM]
```

### Status sync prep

```
## Status Sync - [day] [date] ([час])

### Прогрес з останнього міту
- {KEY}-XXX: [old status] -> [new status] ([assignee])

### Зараз в роботі
| Тікет | Опис | Assignee | Статус |
|-------|------|----------|--------|

### Блокери та питання до клієнта
- [blocker/question with context]

### Стан клієнтського борда
- [коли синхронізували останній раз, чи є розбіжність] (якщо client_tracker налаштований)

### Мої теми
[порожній блок]
```

### 1-1 with the client lead (pre-planning)

Strategic, not operational:

```
## 1-1 з [ім'я з конфігу] - [day] [date] ([час])

### Ключові рішення, що потребують обговорення
- [decision: context + options + рекомендація]

### Ризики (External / Both)
- [risk with impact assessment]

### Preview наступного тижня
- Що планується завершити, що може перейти, capacity питання

### Відкриті питання зі Slack/Notion
- [unresolved topic needing their input]

### Мої теми
[порожній блок]
```

### Review prep

```
## Review Prep - [day] [date] ([час])

### Зроблено цього тижня
| Тікет | Опис | Label | Assignee |
|-------|------|-------|----------|
Всього Done: X

### Кандидати на демо
[tickets with visible behavior changes worth showing]

### Тестова черга
[counts by the config's testing statuses]

### Що не встигли / перенесено
- {KEY}-XXX: [причина]

### Блокери на наступний тиждень
- [known blockers]

### Мої теми
[порожній блок]
```

## Behavior

1. Determine the meeting type from the config's schedule (or the user's request).
2. Collect all available data sources in parallel.
3. Generate the matching report format.
4. Always end with the empty "Мої теми" section: this is where the PM adds notes before
   the meeting.
5. Never put an Internal-only risk or an internal team discussion into a client prep.
   The prep is for the PM, but everything in it may end up said out loud.
6. Respect the config's Engagement Status: do not plan work in a component the config
   marks as out of scope, and do not reference Former Members as active.
7. If a source is not configured, say so in one line rather than leaving a blank section.
8. If running as a scheduled task, save to the outputs folder and to the Notion Reports
   DB (see Report Storage). If running manually, present in chat.
9. Keep the tone professional and concise: this is a prep doc for the PM, not a
   client-facing report.

## Report Storage

Save to the Notion Reports DB: `{config.notion.reports_db}`.

Use `notion-create-pages` with these properties (Reports uses relations `Project` and
`Workspace`):

| Property | Value |
|----------|-------|
| Report Name | `[Report Title] - [date]` |
| date:Date:start | Today's date in ISO format (YYYY-MM-DD) |
| Type | `Client Meeting Prep` |
| Skill | `client-meeting-prep` |
| Summary | 2-3 sentence summary of key findings |
| Workspace | `["{config.notion.workspace_page_id}"]` |
| Project | `["{config.notion.project_page_id}"]` |

The **full report content** goes as the page body (Notion Markdown).