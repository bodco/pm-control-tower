---
name: velocity-report
description: "Monthly team velocity and performance metrics for any registered project: throughput, cycle time, label distribution, assignee workload, backlog health, estimate accuracy, and trends versus the previous period, with mandatory annotation whenever a comparison crosses an engagement change. Use this skill whenever the user mentions \"velocity\", \"throughput\", \"метрики команди\", \"cycle time\", \"продуктивність\", \"скільки тікетів закрили\", \"team performance\", \"місячний звіт метрик\", \"velocity report\", \"capacity analysis\", or any request for quantitative team performance data. When triggered, execute immediately."
---

# Velocity Report

## Step 0 - Project config and tracker access (always run first)

1. Determine the project from the user's request. If NOT explicitly named, ask (list the
   configs in `projects/`). See the Default Project Rule in `projects/SKILL.md`.
2. Read `../projects/{project_slug}.md` relative to this skill's folder (fallback:
   Glob `**/projects/{project_slug}.md`).
3. All values marked `{config.xxx}` come from that config. Also read `projects/SKILL.md`
   (cross-cutting rules) and `../projects/_standards.md` section 2: the metric set
   comes from `{config.pm_profile.metrics_profile}` and the 🚩 thresholds from the
   catalog; without a PM Profile derive the profile from `{config.board_type}` and
   write `PM Profile: SKIPPED` in the Data Completeness header.
4. **Tracker access.**
   - `{config.task_tracker.api_access}` true: normal path.
   - false: metrics are still possible if `{config.task_tracker.fallback_source}` is a
     `manual_export` that carries created and resolved dates. Compute what the export
     supports, skip what it does not (worklog hours and estimate accuracy usually are
     not in an export), and open the report with the export date. If the fallback is
     `meeting_action_items` or `email_summaries`, there is nothing to count: say so and
     do not invent numbers.

If the config file doesn't exist: "Project config not found. Available projects:
[list files in projects/]"

---

Monthly quantitative analysis of team performance on the `{config.project_name}` board.
Provides hard data for capacity planning, retrospectives, and client conversations about
timelines.

## Data Collection

### Period

Default: the previous calendar month. Can be overridden by the user.

### Queries

Every query MUST be scoped with `project = {config.task_tracker.project_key}`: the
company tracker is shared across clients.

**Completed in period:**
```
project = {KEY} AND status = "{done status from the Workflow table}" AND resolved >= "YYYY-MM-01" AND resolved < "YYYY-(MM+1)-01" ORDER BY resolved DESC
```

**Created in period:**
```
project = {KEY} AND created >= "YYYY-MM-01" AND created < "YYYY-(MM+1)-01" ORDER BY created DESC
```

For each ticket fetch via the Jira MCP server from `{config.jira.mcp_read}` (default
`jira`, operations `search_issues` / `get_issue`): key, summary, issue type, labels,
assignee, created and resolved dates, time spent, original estimate.

**Previous period:** run the same queries for the month before, for deltas.

## Metrics

### 1. Throughput
- total completed
- breakdown by label, using the config's Labels Taxonomy (not a hardcoded list; labels
  marked HISTORICAL appear only if tickets actually carry them)
- delta vs previous month, absolute and percentage

### 2. Cycle time
- calendar days from creation to Done
- median, average, P90
- breakdown by label
- exclude the operational-support label (the one whose Purpose in the Labels Taxonomy
  describes quick operational requests) from cycle time stats: those are quick tasks that
  skew the distribution

### 3. Throughput by assignee
- tickets completed per person, hours logged per person if worklog data exists
- **This is capacity visibility, not individual performance evaluation.** Never rank
  people or imply someone underperformed; a low number usually means part-time
  availability or a different kind of work. Availability is the `Availability` column of
  the config's Team - Internal table; people in Former Members appear only for the
  months they were on the project

### 4. Backlog health
- open tickets at period end
- net flow: created minus completed (positive means the backlog grew)
- aging: open more than 30, 60, 90 days

### 5. Estimate accuracy (if data exists)
- tickets with both original estimate and time spent
- ratio actual/estimated
- if the sample is under about 10 tickets, report it as indicative and say so

## Report Format

**Template** (`velocity-report`): resolve it first per "Document templates" in `projects/SKILL.md` (registry `../projects/_templates.md`). The format below is the built-in default; a house or project template replaces its sections, order and fixed wording, never the invariants listed there.

Generate in Ukrainian:

```
Джерела: Jira OK · Tempo {OK | SKIPPED (time_reports: none)} · PM Profile {OK | SKIPPED}
## Velocity Report - {config.project_name} - [month year]

### Throughput
**Загалом:** X тікетів Done (попередній місяць: Y, delta: +/-Z%)

**По лейблах:**
| Label | Цей місяць | Попередній | Delta |
|-------|------------|------------|-------|
(лейбли з конфігу)

### Cycle Time (без операційного лейбла)
| Метрика | Цей місяць | Попередній |
|---------|------------|------------|
| Медіана | X днів | Y днів |
| Середнє | X днів | Y днів |
| P90 | X днів | Y днів |

**По лейблах (медіана):**
| Label | Cycle Time |
|-------|-----------|

### Навантаження по команді
| Assignee | Доступність | Done | Logged (h) |
|----------|-------------|------|-----------|
| **Всього** | | **X** | **Yh** |
(доступність з конфігу: part-time / full-time)

### Здоров'я беклогу
- Відкриті тікети: X
- Створено: X | Закрито: Y | **Net flow: +/-Z**
- Aging: >90 днів: X | 60-90: X | 30-60: X

### Точність естімейтів
- Вибірка: X тікетів
- Середній ratio (actual/estimated): X.Xx
- [інтерпретація]

### Тренди та висновки
[2-3 аналітичні спостереження, не переказ цифр]

### Рекомендації
- [1-3 конкретні дії на основі даних]
```

## Behavior

1. The report opens with the Data Completeness header (`projects/SKILL.md`), listing
   Jira, Tempo (`{config.local_paths.time_reports}`) and PM Profile.
2. Collect both periods for comparison.
3. Calculate every metric programmatically. Never estimate a number.
4. Cycle time uses calendar days (resolved minus created), not business days.
5. If worklog data is sparse, say so and drop the hours column rather than showing
   misleading partial totals.
6. "Тренди та висновки" is the most valuable section: interpret, do not restate.
7. If running as a scheduled task, save to the outputs folder and to the Notion Reports
   DB. If running manually, present in chat and offer specific deep-dives.

## Metric continuity - MANDATORY GUARD

Read `{config.engagement.metric_continuity}` before writing any comparison. If it is
set and the period comparison crosses the date it names, every table, delta and trend
sentence crossing it MUST carry its text as an explicit annotation, and the report must
never present the drop as a performance problem. Example wording: "Зниження показників
відображає планове звуження команди і скоупу з <дата>, а не падіння продуктивності".
Assignee tables legitimately show fewer people after such a date.

## Report Storage

Save to the Notion Reports DB: `{config.notion.reports_db}`.

Use `notion-create-pages` with these properties (Reports uses relations `Project` and
`Workspace`):

| Property | Value |
|----------|-------|
| Report Name | `[Report Title] - [date]` |
| date:Date:start | Today's date (YYYY-MM-DD) |
| Type | `Velocity Report` |
| Skill | `velocity-report` |
| Visibility | `Internal` |
| Summary | 2-3 sentence summary of key findings |
| Workspace | `["https://app.notion.com/p/{config.notion.workspace_page_id}"]` (ID without dashes) |
| Project | `["https://app.notion.com/p/{config.notion.project_page_id}"]` (ID without dashes) |

Writes allowed without asking (the 5-minute rule in `projects/SKILL.md`): the report page. Nothing else.

The **full report content** goes as the page body (Notion Markdown).