---
name: jira-board-health
description: "Scans the project's tracker board (project key and statuses come from the project config) for hygiene issues and generates a health report: stale tickets, missing labels, Done without fixVersion, long-blocked items, tickets stuck in status, and active work without an owner. Declines politely when the project has no tracker API. Use this skill whenever the user mentions \"board health\", \"борда\", \"гігієна борди\", \"health check\", \"stale tickets\", \"зависші тікети\", \"перевір борду\", \"review prep\", \"підготовка до рев'ю\", or any request to audit the state of the board. Also when run on a schedule before the weekly review. When triggered, execute immediately - do not ask for confirmation."
---

# Board Health Check

## Step 0 - Project config and tracker access (always run first)

1. Determine the project from the user's request. If the project is NOT explicitly
   named, do not guess and do not default: ask the user which project (list the configs
   in `projects/`). See the Default Project Rule in `projects/SKILL.md`.
2. Read the project config `../projects/{project_slug}.md` relative to this skill's
   folder (fallback: Glob `**/projects/{project_slug}.md`).
3. All values marked `{config.xxx}` come from that config. Also read `projects/SKILL.md`
   (cross-cutting rules) and `../projects/_standards.md` section 2: the thresholds
   (stale days, blocked days, WIP) come from `{config.pm_profile.metrics_profile}` and
   the catalog; the numbers below are the defaults when the profile is absent, and the
   report then says `PM Profile: SKIPPED`.
4. **Check tracker access.** This skill is the one case where degradation is not
   possible: board hygiene is a property of a live board, and a manual export cannot
   tell you what has been sitting untouched for five days.

   If `{config.task_tracker.api_access}` is **false**, do NOT invent a report. Say so
   plainly and offer what is possible instead:

   > "Гігієна борди потребує живого доступу до трекера, а у {project} його немає
   > (`task_tracker.api_access: false`). Можу натомість перевірити відкриті треди без
   > відповіді та невиконані action items з мітів, або розібрати ручний експорт,
   > якщо ти його поклав у {export_path}."

   Then stop, or do the alternative if the user asks for it. Do not fabricate a board.

If the config file doesn't exist, tell the user: "Project config not found.
Available projects: [list files in projects/]"

---

Scans the `{config.project_name}` board and produces a structured health report. The
goal is to surface tickets that need PM attention, not to auto-fix anything. The report
is a signal, not an action.

## Connectors

Use the Jira MCP server named in `{config.jira.mcp_read}` (default `jira`): `search_issues`
for JQL and `get_issue` for full ticket details with assignee. This skill only reads;
writes allowed without asking are limited to the report page (5-minute rule).

Watch the config's `known_bug` note: on some servers writes return "Unexpected end of
JSON input" while actually succeeding. This skill only reads, so it should not hit that.

## Scoping rule (mandatory)

Every JQL query MUST start with `project = {config.task_tracker.project_key}`. The
company tracker is shared across clients; an unscoped query pulls another project's
tickets into this report and is the worst failure mode of the system.

Status names come from the config's Workflow table, verbatim. Watch the spaces: a status
like `"On Hold / Blocked"` must be quoted exactly as the table spells it, spaces around
the slash included, otherwise JQL returns a 400.

## Health Check Categories

Run these in parallel where possible, then compile into one report.

### 1. Tickets without labels

```
project = {KEY} AND status != "{done status}" AND labels IS EMPTY ORDER BY updated DESC
```

Invisible in label-based reports and likely miscategorized.

### 2. Stale active work (no updates > 5 days)

For each status the config's Workflow table marks as "in work":

```
project = {KEY} AND status = "{active status}" AND updated <= -5d ORDER BY updated ASC
```

Tickets sitting in active statuses without updates may be silently blocked or forgotten.

### 3. Done without fixVersion

```
project = {KEY} AND status = "{done status}" AND fixVersion IS EMPTY AND resolved >= -30d ORDER BY resolved DESC
```

Only when the config's fixVersion Convention is not `none`: it says when fixVersion is
set (e.g. retrospectively by resolved month). Missing fixVersion then means the ticket
will not appear in release reports. With `none`, skip this category with one line.

### 4. Long-blocked tickets (blocked > 14 days)

```
project = {KEY} AND status = "{blocked status from config}" AND updated <= -14d ORDER BY updated ASC
```

These need either escalation or a decision to close or descope.

### 5. Testing pipeline depth

For the statuses the config marks as testing or verification queues:

```
project = {KEY} AND status in ("{queue statuses from config}") ORDER BY updated ASC
```

Shows where work piles up. Note: if the config's Engagement Status says there is no QA
on our side, a growing queue here is a client-side or PM-side signal, not a QA backlog.
Say which it is rather than implying the team has a QA bottleneck it cannot have.

### 6. Active work without an assignee

```
project = {KEY} AND status in ("{active statuses}") AND assignee IS EMPTY
```

Active work with no owner needs immediate attention. Cross-check the config's Assignment
Rules: some domains legitimately have "no internal resource, leave unassigned, flag to
PM". Those are expected, not defects: list them separately.

## Report Format

**Template** (`jira-board-health`): resolve it first per "Document templates" in `projects/SKILL.md` (registry `../projects/_templates.md`). The format below is the built-in default; a house or project template replaces its sections, order and fixed wording, never the invariants listed there.

Generate in Ukrainian:

```
Джерела: Jira OK · PM Profile {OK | SKIPPED}
## Здоров'я борди {KEY} - [date]

### Критичні (потребують дії)
- **Без лейблів** (X): {KEY}-123, {KEY}-456, ...
- **Активні без оновлень >5 днів** (X): {KEY}-789 (assignee, N днів), ...
- **Без assignee в активному статусі** (X): {KEY}-101, ...

### Увага
- **Done без fixVersion** (X за 30 днів): {KEY}-111, ...
- **Blocked >14 днів** (X): {KEY}-222 (причина з коментарів, якщо є), ...

### Очікувано (не дефекти)
- **Без assignee за правилами конфігу** (X): [домени без внутрішнього ресурсу]

### Інформаційно
- **Тестова черга**: X тікетів
  [розбивка по статусах з конфігу]

### Рекомендації
[1-3 конкретні дії для PM, з ключами тікетів]
```

## Behavior

1. Execute the queries (parallel where possible).
2. For each found ticket fetch: key, summary, status, assignee, updated date.
3. For blocked tickets, read the last comment for context on why.
4. Compile the report in the format above.
5. Keep it a signal, not a lecture: if the board is clean, say so in two lines instead
   of padding the report.
6. If running as part of a scheduled task, save to the outputs folder and to the Notion
   Reports DB (see Report Storage). If running manually, present in chat.

## Context

Everything project-specific comes from the config: project key, board type, server and
version, labels taxonomy, fixVersion convention, workflow statuses and transition IDs,
assignment rules, team roster, engagement status. Do not hardcode any of it here.

## Report Storage

Save to the Notion Reports DB: `{config.notion.reports_db}`.

Use `notion-create-pages` with these properties (Reports uses relations `Project` and
`Workspace`):

| Property | Value |
|----------|-------|
| Report Name | `[Report Title] - [date]` |
| date:Date:start | Today's date in ISO format (YYYY-MM-DD) |
| Type | `Board Health` |
| Skill | `jira-board-health` |
| Summary | 2-3 sentence summary of key findings |
| Visibility | `Internal` |
| Workspace | `["https://app.notion.com/p/{config.notion.workspace_page_id}"]` (ID without dashes) |
| Project | `["https://app.notion.com/p/{config.notion.project_page_id}"]` (ID without dashes) |

The **full report content** goes as the page body (Notion Markdown).