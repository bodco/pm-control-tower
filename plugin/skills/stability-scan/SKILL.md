---
name: stability-scan
description: "Weekly stability digest combining Sentry unresolved issues and CloudWatch log analysis for a project. Reads scope and paths from the project config and the Sentry token from the project's secrets file; skips a source with one line when it is not configured. Use this skill whenever the user mentions \"stability scan\", \"скан стабільності\", \"помилки за тиждень\", \"weekly errors\", \"cloudwatch\", \"aws logs\", \"лог аналіз\", \"error digest\", \"що ламається\", \"stability report\", or any request to review application health across Sentry and CloudWatch. Also when run on a schedule (typically weekly, in the evening). When triggered, execute immediately."
---

# Stability Scan

## Step 0 - Project config, sources and token (always run first)

1. Determine the project from the user's request. If the project is NOT explicitly
   named, do not guess and do not default: ask (list the configs in `projects/`). See
   the Default Project Rule in `projects/SKILL.md`.
2. Read the project config `../projects/{project_slug}.md` relative to this skill's
   folder (fallback: Glob `**/projects/{project_slug}.md`) and `projects/SKILL.md` for
   the cross-cutting rules. Writes allowed without asking (the 5-minute rule): the
   report page and new tickets in the backlog; everything else is a recommendation.
3. All values marked `{config.xxx}` come from that config.
4. **Check the two sources.** If BOTH are absent, say the project has nothing to scan
   and stop. If one is absent, scan the other and say which is missing:

| Config value | If present | If absent |
|---|---|---|
| `sentry.url` not `none` | Data Source 1 | one line: "Sentry не підключений для цього проєкту" |
| `local_paths.aws_logs` not `none` | Data Source 2 | one line: "CloudWatch експортів для цього проєкту немає" |
| `task_tracker.api_access: true` | ticket creation section | skip ticket creation, list findings as recommendations only |

5. **Token.** Not in the config. Read at runtime, never print:

```bash
SENTRY_TOKEN=$(grep '^{config.sentry.token_env}=' {config.sentry.secrets_file} | cut -d= -f2-)
```

If the config file doesn't exist, tell the user: "Project config not found.
Available projects: [list files in projects/]"

---

Combines two data sources into one weekly stability digest for `{config.project_name}`:

1. **Sentry** - unresolved issues for the in-scope projects (`{config.sentry.projects_in_scope}`) via REST API
2. **CloudWatch** - log files from the project's local AWS Logs directory

The goal is proactive visibility: catch trends before they become incidents.

---

## Data Source 1: Sentry

All requests via bash with curl:
```bash
curl -s -H "Authorization: Bearer $SENTRY_TOKEN" "{url}"
```

### Projects to scan

Only `{config.sentry.projects_in_scope}`. Slugs in
`{config.sentry.projects_out_of_scope}` belong to the client: scan them ONLY if the user
explicitly asks, and never include them in the report, the counts or the tickets by
default.

### Known API limitation

Self-hosted Sentry may reject `statsPeriod`. Try `statsPeriod` first; on an error fall
back to explicit `start` / `end` ISO dates for the exact period (the same approach as
the other Sentry-reading skills) and say so in the report so the numbers are read for
the right window.

### Queries

For each in-scope project:
```
GET {config.sentry.url}/api/0/projects/{config.sentry.org_slug}/{slug}/issues/?query=is:unresolved&statsPeriod=14d&sort=freq&limit=10
```

Collect: issue ID, title, event count (`count`), first seen, last seen, level, short ID,
users affected (`userCount`).

**For the top 3 issues by event count**, fetch the latest event and a few recent events:
```
GET {config.sentry.url}/api/0/issues/{issue_id}/events/latest/
GET {config.sentry.url}/api/0/issues/{issue_id}/events/?limit=5
```

Extract: full stack trace, device info, timestamps of specific occurrences, and the
issue URL `{config.sentry.url}/organizations/{config.sentry.org_slug}/issues/{issue_id}/`.

---

## Data Source 2: CloudWatch Logs

### Reaching the directory

Logs live on the user's Mac at `{config.local_paths.aws_logs}` and are NOT directly
readable from a cloud session. Use the device bridge:
`mcp__remote-devices__device_list_dir` on that path, then
`mcp__remote-devices__device_stage_files` for the files you need. If the bridge reports
no folder access, ask the user to connect the folder in the desktop app.

Use the staged path for all file operations, not the original `/Users/...` path.

**If staging fails:** report it in the output and continue with Sentry only. Do NOT skip
silently.

### Directory structure and folder name parsing

| Folder name example | Meaning |
|---|---|
| `2026-03-30-04-01` | March 30 to April 1 |
| `2026-03-22-26` | March 22 to March 26 |
| `2026-04-01` | single day, April 1 |

Parsing rules (split by `-`):
- first 3 segments = `YYYY-MM-DD` = start date
- 2 more segments = `MM-DD` = end date (same year)
- 1 more segment = end day in the same month
- 0 more segments = single-day folder

### File formats

1. **CSV** (older exports): one `.csv` per log group, flat in the folder.
2. **JSONL** (newer exports): subdirectory per log group; each line is
   `{"timestamp": <epoch_ms>, "message": "...", "logStreamName": "...", "ingestionTime": <epoch_ms>}`.

Detect by presence of subdirectories (JSONL) vs flat CSV files.

### File selection

Scan period: **7 days ending today**, inclusive.

1. List subfolders in the staged directory.
2. Parse each name into `[folder_start, folder_end]`.
3. Select a folder if its range overlaps the scan period:
   `folder_end >= scan_start AND folder_start <= scan_end`.
4. A selected folder may contain logs outside the period: include the whole file.
5. If no folder matches, fall back to the most recent folder by end date and note the gap.

### Analysis approach

1. Identify log files (`.csv`, `.jsonl`, `.log`, `.txt`) in the selected folders.
2. **For large files (>5000 lines) use grep/awk via bash.** Do not read entire files.
3. For JSONL, grep patterns inside the `message` field. Use spaced patterns like
   `' ERROR '`, `' CRITICAL '`, `'Traceback'`, `'Exception'`, `'timeout'` to match the
   `[timestamp] ERROR | ...` format.
4. Scan for: `ERROR` / `CRITICAL` / `FATAL` levels, exception stack traces, repeated
   error patterns, timeout patterns (`timeout`, `timed out`, `connection refused`),
   `WARNING` counts per service.
5. Group findings by service or log group and count occurrences.
6. **For each significant pattern (>10 occurrences)** extract 3-5 specific entries with
   full UTC timestamp, log stream name, surrounding context (`grep -B2 -A2`), and
   thread or container info if available.

### Handling missing logs

If the directory is empty or files are older than 14 days, say so:
> "CloudWatch логи не оновлювались з [date]. Рекомендується оновити перед наступним сканом."

---

## Report Format - Ukrainian (internal)

The primary report is in Ukrainian and must include detail a developer can act on:
a timestamp plus a stream name lets them jump straight to the right log instead of
searching blindly.

```markdown
## Stability Scan - {config.project_name} - [date range]

### Sentry: Нові та активні помилки

**Критичні (>50 events):**
| Проєкт | Issue | Events | Останній раз | Тип |
|--------|-------|--------|--------------|-----|

**Помітні (10-50 events):**
| ... |

### Деталі топ-3 помилок

#### 1. [project] Issue Title - Level (~N events) -> {KEY}-XXXX (якщо тікет створено)

**Sentry:** [SHORT-ID](sentry_url)
**Тікет:** [{KEY}-XXXX](url) (якщо є)

[2-3 речення: що відбувається, скільки юзерів зачеплено, коли вперше]

**Stack trace:**
[повний stack trace з event]

**Приклади подій (для пошуку в Sentry):**
- YYYY-MM-DDTHH:MM:SSZ - device: [model] ([OS])

**Ймовірна причина:** [root cause зі stack trace і логів]

---

[повторити для #2 і #3]

### CloudWatch: Аналіз логів

**Період:** [date range] ([N папок]: назви)

**Помилки по сервісах:**
| Сервіс | ERROR | Timeout | Traceback | WARNING | Основний патерн |
|--------|-------|---------|-----------|---------|-----------------|

### Повторювані патерни (з деталями)

#### 1. Pattern Name -> {KEY}-XXXX (якщо тікет створено)

**Кількість:** N за [period]

[опис патерну]

**Timestamps для пошуку в логах:**
- YYYY-MM-DD HH:MM:SS.mmm UTC - stream: [log_stream_name], thread: [thread]
[3-5 конкретних]

**Root cause:** [аналіз з контексту логів]

---

### Загальна оцінка стабільності

**Стан: [оцінка]**

[3-5 речень: загальний стан, найгірші компоненти, тренди, що потребує уваги]

### Рекомендації та створені тікети

| # | Пріоритет | Тікет | Опис | Assignee |
|---|-----------|-------|------|----------|

**Додатково (без тікетів):**
- [що обговорити, але ще не тікетовано]
```

### Detail requirements for recurring patterns

Each pattern must include: exact count, 3-5 specific timestamps with stream names,
context lines where they reveal the cause, root cause analysis, and a ticket link if one
was created. "There were 4000 errors" is not actionable; a timestamp and a stream name is.

---

## Report Format - English (client-facing)

After the Ukrainian report, create an English client-facing version as a separate file:
`stability-report-YYYY-MM-DD-EN.md`.

Differences:
- entirely in English
- **remove** internal team member names from assignee columns, use roles instead
  ("Backend Developer", "DevOps Engineer")
- **remove** references to internal tools and processes
- **keep** all technical detail: stack traces, timestamps, Sentry links, ticket links,
  root cause analysis
- **add** an Executive Summary at the top (3-4 sentences)
- same tables and pattern detail as the Ukrainian version

Save both to the outputs folder.

---

## Ticket Creation

Only when `{config.task_tracker.api_access}` is true. Otherwise list the findings as
recommendations and say tickets were not created because the tracker has no API access.

Create a ticket when the scan finds a critical or high-impact issue:
- FATAL-level errors with >1000 events
- errors affecting >500 unique users
- new patterns not seen in previous scans
- infrastructure failures (SFTP, DB, deployment)

**Check for an existing ticket first**, always scoped to the project:
```
project = {config.task_tracker.project_key} AND summary ~ "[keyword]" AND status != Done
```

If none exists, create one with the write connector from the config:
- **Project:** `{config.task_tracker.project_key}`
- **Type:** Bug
- **Priority:** High (FATAL/critical) or Medium (recurring non-critical)
- **Label:** from the config's Labels Taxonomy (`bug-fix` for code bugs, `ops-support`
  for infra, `enhancement` for improvements)
- **Assignee:** per the config's Assignment Rules. If the rules say there is no internal
  resource for that domain, leave unassigned and flag it to the PM instead of guessing
- **Summary:** `[Component] Short description - impact metric`
- **Description:** Sentry link, stack trace, CloudWatch timestamps, root cause, expected
  outcome

Link created tickets in both report versions.

**Known connector bug** (see the config's `known_bug`): writes may return "Unexpected end
of JSON input" while succeeding (HTTP 204). Always verify with a follow-up search.

---

## Behavior

0. The report (both languages) and the chat summary OPEN with the Data Completeness
   header (`projects/SKILL.md`), e.g. `Джерела: Sentry OK (2 проєкти) · CloudWatch STALE (export from 2026-08-31) · Jira SKIPPED (api_access: false)`.
1. Stage CloudWatch logs via the device bridge (if configured).
2. Run Sentry queries for the in-scope projects (parallel curl where possible).
3. Grep the logs for error patterns.
4. For top issues, fetch detailed events for timestamps and stack traces.
5. For significant log patterns, extract specific entries with context.
6. Check for existing tickets; create new ones for critical findings (if allowed).
7. Compile the Ukrainian report with full detail.
8. Compile the English client report.
9. Save both to the outputs folder.
10. Save the Ukrainian report to the Notion Reports DB.

---

## Report Storage

Save to the Notion Reports DB: `{config.notion.reports_db}`.

Use `notion-create-pages` with these properties (Reports uses relations `Project` and
`Workspace`):

| Property | Value |
|----------|-------|
| Report Name | `Stability Scan - {config.project_name} - DD.MM.YYYY` |
| date:Date:start | Today's date in ISO format (YYYY-MM-DD) |
| Type | `Stability Scan` |
| Skill | `stability-scan` |
| Summary | 2-3 sentence summary of key findings |
| Visibility | `Internal` |
| Workspace | `["https://app.notion.com/p/{config.notion.workspace_page_id}"]` (ID without dashes) |
| Project | `["https://app.notion.com/p/{config.notion.project_page_id}"]` (ID without dashes) |

**Important:** relation properties require full Notion URLs, not bare UUIDs. Remove
dashes from the page ID when constructing the URL.

The **full Ukrainian report** goes as the page body (Notion Markdown).