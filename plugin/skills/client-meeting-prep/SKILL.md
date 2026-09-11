---
name: client-meeting-prep
description: "Generates status update and prep notes for the project's client meetings. Attendees, meeting types and cadence come from the Meetings Schedule in the project config (for acme: planning, status syncs, 1-1 with Client PM, Friday review). Degrades gracefully when the project has no tracker API. Use this skill whenever the user mentions \"client prep\", \"підготовка до клієнтського міту\", \"prep для Хуана\", \"Client PM prep\", \"planning prep\", \"review prep\", \"status update для клієнта\", \"що сказати клієнту\", \"підготуй апдейт\", or any request to prepare for a meeting with the client team. When triggered, execute immediately."
---

# Client Meeting Prep

## Step 0 - Project config and source availability (always run first)

1. Determine the project from the user's request. If the project is NOT explicitly
   named, do not guess and do not default: ask the user which project (list the configs
   in `projects/`). See the Default Project Rule in `projects/SKILL.md`.
2. Read the project config `../projects/{project_slug}.md` relative to this skill's
   folder (fallback: Glob `**/projects/{project_slug}.md`).
3. All values marked `{config.xxx}` come from that config.
4. **Determine the meeting type** from the config's Meetings Schedule plus today's day
   of week, or from the user's explicit request. The schedule is authoritative: do not
   assume a day or a time. If the day matches no meeting in the schedule, ask which
   meeting is meant.
5. **Check which sources this project has:**

| Config value | If present | If absent |
|---|---|---|
| `task_tracker.api_access: true` | query the tracker | use `task_tracker.fallback_source` (newest manual export, meeting action items, Threads) and open the prep with the source and its date |
| `client_tracker` not `none` | mention where the client sees status and when it was last synced | skip |
| `slack.channels_all` non-empty | scan Slack | skip with one line |

6. **Secrets** (if any source needs a token): read at runtime from
   `{config.*.secrets_file}` by variable name; never print a token.

If the config file doesn't exist, tell the user: "Project config not found.
Available projects: [list files in projects/]"

---

Generates focused prep notes for meetings with the `{config.project_name}` client team.
The prep adapts its structure to the meeting type, but the data collection is the same.

## Data Collection

Run in parallel. All tracker queries MUST be scoped with
`project = {config.task_tracker.project_key}`: the company tracker is shared across
clients and an unscoped query leaks another project's tickets into a client-facing prep.

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
project = {config.task_tracker.project_key} AND status = "On Hold / Blocked" ORDER BY updated DESC
```

Keep the ones whose summary or latest comments point at the client (a decision, a spec,
an access, an approval). Read recent comments for context.

### 4. Client-side work (only if the config still has an active external-dev flow)

If the config's Labels Taxonomy marks `external-dev` as HISTORICAL, skip this section
entirely and never ask the client about client-developer PRs. Otherwise:
```
project = {config.task_tracker.project_key} AND labels = "external-dev" AND status != Done ORDER BY updated DESC
```

### 5. Recent Slack threads with client context

Channels `{config.slack.channels_all}`, last 3 days, threads that mention client topics
or need client input.

### 6. Notion threads and risks

- Threads DB (`{config.notion.threads_db}`): open threads for this project with Status
  `Awaiting Reply` or `Need Follow-up`
- Risks DB (`{config.notion.risks_db}`): open risks with `Visibility` = `External` or
  `Both`. Internal-only risks never go into a client prep
- Decisions DB (`{config.notion.decisions_db}`): decisions from the last two weeks, so
  the prep does not reopen something already agreed

### 7. Client tracker sync state

If `{config.client_tracker}` is configured: when was it last synced, and is anything
Done since then not yet reflected on the client's board. The client sees that board, so
a stale board becomes a meeting question.

## Report Format by Meeting Type

The meeting names below map to the `Type` column of the config's Meetings Schedule.
Use the attendee names from the config's client team table, not from memory.

### Planning prep

```
## Planning Prep - [day] [date] (міт з клієнтом [час з конфігу])
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