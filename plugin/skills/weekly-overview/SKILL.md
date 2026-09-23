---
name: weekly-overview
description: "Monday morning comprehensive weekly overview: full review of last week's work across projects, open questions, risks, and outlook for the coming week. Degrades gracefully when a project has no tracker API, no Slack or no Sentry. Use this skill whenever the user mentions \"weekly overview\", \"тижневий огляд\", \"що було минулого тижня\", \"weekly report\", \"Monday report\", \"понеділковий звіт\", \"огляд тижня\", \"weekly summary\", or any request for a comprehensive weekly status. When triggered, execute immediately."
---

# Weekly Overview

## Step 0 - Scope, config and source availability (always run first)

1. **Scope.** If the user named a project, cover only that one. If the user explicitly
   asked for a cross-project overview, or this is the scheduled Monday run, cover EVERY
   active config in `projects/` (no `status: archived`) and produce one section per
   project. Do not silently pick a single project (Default Project Rule in `projects/SKILL.md`).
2. Read each project's config `../projects/{project_slug}.md` relative to this skill's
   folder (fallback: Glob `**/projects/{project_slug}.md`).
3. All values marked `{config.xxx}` come from that project's config. Also read
   `projects/SKILL.md` (cross-cutting rules) and `../projects/_standards.md` section 2:
   the metrics shown come from `{config.pm_profile.metrics_profile}`; without a PM
   Profile derive it from `{config.board_type}` and write `PM Profile: SKIPPED` in
   the header. Writes allowed without asking (the 5-minute rule): the report page.
4. **Check which sources each project has.** Never fail on a missing source:

| Config value | If present | If absent |
|---|---|---|
| `task_tracker.api_access: true` | query the tracker | use `task_tracker.fallback_source` and state the source and its date in that project's section |
| `slack.slack_access` not `none` and `slack.channels_all` non-empty | scan Slack | skip with one line |
| `sentry.url` not `none` | error trend | skip with one line |
| Threads DB | always available | the mail and Slack picture comes from here |

5. **Secrets.** Read tokens at runtime, never print them:

```bash
grep '^{config.sentry.token_env}=' {config.sentry.secrets_file} | cut -d= -f2-
```

If a config file doesn't exist, tell the user: "Project config not found.
Available projects: [list files in projects/]"

---

Monday morning report covering everything that happened last week and what is ahead.
This is the PM's primary weekly status document: it should give a complete picture
without needing to check any other source.

## Data Sources

Collect these in parallel, per project.

### 1. Tracker: full week analysis

**Only when `{config.task_tracker.api_access}` is true.** Every query MUST be scoped to
the project: an unscoped query on a shared company tracker pulls another client's work
into this report.

**Completed last week:**
```
project = {config.task_tracker.project_key} AND status = "{done status}" AND resolved >= startOfWeek(-1) AND resolved < startOfWeek() ORDER BY resolved DESC
```

**Created last week:**
```
project = {config.task_tracker.project_key} AND created >= startOfWeek(-1) AND created < startOfWeek() ORDER BY created DESC
```

**Current board state (pipeline snapshot):**
```
project = {config.task_tracker.project_key} AND status != "{done status}" AND status != "{backlog status}" ORDER BY status ASC
```

**Blocked tickets:**
```
project = {config.task_tracker.project_key} AND status = "{blocked status}" ORDER BY updated ASC
```

Exact status names come from the config's Workflow table (quote them exactly as spelled
there: a name like `"On Hold / Blocked"` needs the spaces around the slash). For completed
tickets use `get_issue` on the Jira MCP server from `{config.jira.mcp_read}` (default
`jira`) to get assignee details. Group by label and assignee.

**When `api_access` is false:** build the same picture from
`{config.task_tracker.fallback_source}`. Usually that means: what shipped comes from
meeting action items and Threads, and the pipeline snapshot from the newest manual
export. Open that project's section with the source and its date, and never present a
stale export as a live board.

### 2. Notion: meetings summary

Meetings DB (`{config.notion.meetings_db}`), last week Monday through Friday, filtered
by this project's relation:
- each meeting: date, title, key decisions and action items
- flag unresolved action items

### 3. Notion: threads summary

Threads DB (`{config.notion.threads_db}`), threads created or updated last week for this
project. This is where both Slack and mail already live, so it covers email without a
separate Gmail search:
- count: total threads, actionable vs informational
- list actionable threads still open (Status `Awaiting Reply` or `Need Follow-up`)

### 4. Slack: key discussions

Channels `{config.slack.channels_all}`, last week:
- threads with 5+ replies
- threads mentioning blockers, incidents, or decisions

### 5. Decisions taken last week

Decisions DB (`{config.notion.decisions_db}`), rows dated last week for this project.
This is the authoritative list; meeting notes are the evidence behind it.

### 6. Sentry: weekly error trend

Only the slugs in `{config.sentry.projects_in_scope}`:
```
GET {config.sentry.url}/api/0/projects/{config.sentry.org_slug}/{slug}/issues/?query=is:unresolved&statsPeriod=7d&sort=freq&limit=5
```
with `Authorization: Bearer <token read from the secrets file>`. If the instance rejects
`statsPeriod`, fall back to explicit `start` / `end` ISO dates (same approach as the
other Sentry-reading skills).

## Report Format

**Template** (`weekly-overview`): resolve it first per "Document templates" in `projects/SKILL.md` (registry `../projects/_templates.md`). The format below is the built-in default; a house or project template replaces its sections, order and fixed wording, never the invariants listed there.

Generate in Ukrainian. With several projects, repeat the block per project under a
project heading.

```
Джерела: {per project: Jira OK · Slack EMPTY · Threads OK · Meetings OK · Decisions OK · Sentry SKIPPED (url: none) · PM Profile SKIPPED}
## Тижневий Огляд - [week date range]

### {Project}
[рядок про джерело задач і його свіжість - тільки якщо це не живий трекер]

#### Зроблено минулого тижня

**По лейблах:** (лейбли з Labels Taxonomy конфігу, не зашитий список)
- [label]: X тікетів

**По людях:**
| Assignee | Done | In Progress |
|----------|------|-------------|

**Деталі (Done тікети):**
| Тікет | Опис | Label | Assignee |
|-------|------|-------|----------|

#### Створено минулого тижня
- X нових тікетів за лейблами
- Нетто: +X/-Y = [зростання чи зменшення беклогу]

#### Поточний стан борди
| Статус | Кількість |
|--------|-----------|
(статуси з Workflow-таблиці конфігу)

#### Блокери та ризики
- **{KEY}-XXX** [summary] - blocked [N днів], причина: [context]
- [ризик без тікета: опис]

#### Відкриті питання
- [питання: контекст, хто має вирішити]

#### Рішення минулого тижня
- [дата]: [рішення] ([джерело])

#### Невиконані Action Items
- [action item] - [відповідальний] (з міту [date])

#### Sentry: тренд помилок
| Проєкт | Нові unresolved | Top issue |
|--------|----------------|-----------|

#### Outlook на цей тиждень
- Очікуємо Done: [tickets likely to complete]
- Потребує уваги: [what needs PM action]
- Ключові міти: [from the config's Meetings Schedule]
```

## Behavior

1. This is the most comprehensive report: take the time to collect all available sources.
   The FIRST line of the report is the Data Completeness header (`projects/SKILL.md`);
   with several projects, one header line per project section.
2. Run data collection in parallel.
3. Cross-reference: if a meeting decision relates to a ticket, mention the ticket.
4. "Відкриті питання" is the critical section: this is where the PM sees what needs
   their attention.
5. Keep the tone analytical, not just descriptive. Highlight patterns and concerns.
6. **Metric continuity:** if the config carries a metric-continuity warning and the
   comparison crosses that date, annotate it. A team or scope change must never read as
   a performance collapse.
7. If running as a scheduled task, save to the outputs folder and to the Notion Reports
   DB (see Report Storage).
8. If running manually, present in chat.

## Report Storage

Save to the Notion Reports DB: `{config.notion.reports_db}`.

Use `notion-create-pages` with these properties (Reports uses relations `Project` and
`Workspace`):

| Property | Value |
|----------|-------|
| Report Name | `[Report Title] - [date]` |
| date:Date:start | Today's date in ISO format (YYYY-MM-DD) |
| Type | `Weekly Overview` |
| Skill | `weekly-overview` |
| Summary | 2-3 sentence summary of key findings |
| Visibility | `Internal` |
| Workspace | one relation value per covered workspace: `["https://app.notion.com/p/{workspace_page_id}", ...]` (IDs without dashes) |
| Project | one relation value per covered project: `["https://app.notion.com/p/{project_page_id}", ...]` |

The **full report content** goes as the page body (Notion Markdown).