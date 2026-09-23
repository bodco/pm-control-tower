---
name: client-report
description: "Generates professional client-facing weekly, monthly or steering (executive) reports in English for any project registered in the project registry (per-project details come from the project config). Covers completed work, team time allocation, progress metrics, blockers, and outlook, without exposing internal team discussions. Includes Tempo time report data from local files. Use this skill whenever the user mentions \"client report\", \"звіт клієнту\", \"monthly report for client\", \"weekly client report\", \"report for the client PM\", \"звіт для клієнта\", \"тайм репорт\", \"tempo report\", \"що показати клієнту за місяць\", \"місячний звіт клієнту\", \"тижневий звіт клієнту\", \"steering update\", \"exec update\", \"MBR\", \"звіт для керівництва клієнта\", or any request to produce a deliverable report for the client team. When triggered, execute immediately."
---

# Client Report

## Step 0 - Project config and source availability (always run first)

1. Determine the project from the user's request. If NOT explicitly named, ask (list the
   configs in `projects/`). See the Default Project Rule in `projects/SKILL.md`.
2. Read `../projects/{project_slug}.md` relative to this skill's folder (fallback:
   Glob `**/projects/{project_slug}.md`).
3. All values marked `{config.xxx}` come from that config.
4. **Check the sources:**

| Config value | If present | If absent |
|---|---|---|
| `task_tracker.api_access: true` | query the tracker for completed work and pipeline | use `task_tracker.fallback_source`; state in the report that the ticket list comes from an export of that date |
| `local_paths.time_reports` not `none` | Tempo section | omit the time section and say the export was not provided |
| `sentry.url` not `none` | Platform Stability section (monthly) | omit the section entirely rather than writing "no data" to a client |

5. **Standards.** Read `../projects/_standards.md` (section 1, the reader rule; section 2,
   `hours_burn`) and `../projects/SKILL.md` (JQL Isolation Validator, Data Completeness
   header, the 5-minute rule: writes allowed without asking are the report file and the
   Reports DB page; sending is always manual). From the config read `PM Profile`
   (`contract`, `milestones`, `decision_rights`, `reporting.locked_template_page_id`)
   and any report distribution line in `Team - Client`.
6. **Secrets.** Not in the config. Read at runtime, never print, never include in the
   report:

```bash
SENTRY_TOKEN=$(grep '^{config.sentry.token_env}=' {config.sentry.secrets_file} | cut -d= -f2-)
```

If the config file doesn't exist: "Project config not found. Available projects:
[list files in projects/]"

---

Generates polished, client-facing reports in **English** for the
`{config.project_name}` team. Three formats: weekly, monthly and steering (a one-page
executive update for the client's leadership). These are deliverables:
they go directly to the client, so they must be professional, factual, and free of
internal team discussion.

## User Input

- **Project**: from the request
- **Period**: month name for monthly, date range for weekly
- **Type**: weekly, monthly or steering (infer weekly/monthly from the period; steering
  only when asked: "steering", "exec update", "MBR", "for the CEO / leadership")

## Data Sources

Every tracker query MUST be scoped with `project = {config.task_tracker.project_key}`:
the company tracker is shared across clients and an unscoped query would put another
client's tickets into this client's report. That is the worst possible failure here.

### 1. Completed work

Monthly:
```
project = {KEY} AND status = "{done status}" AND resolved >= "YYYY-MM-01" AND resolved < "YYYY-(MM+1)-01" ORDER BY resolved DESC
```
Weekly:
```
project = {KEY} AND status = "{done status}" AND resolved >= "YYYY-MM-DD" AND resolved < "YYYY-MM-DD+7" ORDER BY resolved DESC
```

For each ticket fetch key, summary, labels, assignee, resolved date, fixVersion via
`get_issue` on the Jira MCP server from `{config.jira.mcp_read}` (default `jira`). Group
by the config's Labels Taxonomy.

### 2. Current pipeline

```
project = {KEY} AND status != "{done status}" AND status != "{backlog status}" ORDER BY status ASC
```
Group by status using the config's Workflow table.

### 3. Blocked tickets

```
project = {KEY} AND status = "{blocked status from config}" ORDER BY updated ASC
```
Include the reason from the last comment when it is client-relevant. Never surface
internal tooling problems as client-facing blockers.

### 4. Tempo time reports

Local directory `{config.local_paths.time_reports}` on the Mac. In a cloud session stage
the files via the device bridge (`device_list_dir` + `device_stage_files`).

Files are Excel or CSV exports containing team member, date, hours, ticket key,
description. Pick the file whose name matches the target period; if several match, the
most recent. Parse with Python (openpyxl/pandas).

Extract: hours per team member, hours per label category (map ticket -> label), total,
and a weekly breakdown for monthly reports.

If no file matches: "Time report data not available for this period - please upload the
Tempo export."

### 5. Threads (client-relevant only)

Threads DB (`{config.notion.threads_db}`) for this project in the period. Include only
Status `Closed` or `Replied` and only threads that involved client communication.
Exclude internal-only discussion, tooling, infrastructure and team process.

### 6. Platform stability (monthly only)

Only the slugs in `{config.sentry.projects_in_scope}`:
```
GET {config.sentry.url}/api/0/projects/{config.sentry.org_slug}/{slug}/issues/?query=is:unresolved&statsPeriod=30d&sort=freq&limit=5
```
with `Authorization: Bearer $SENTRY_TOKEN`. Present high-level metrics, not raw error
dumps. Components the config marks as client-owned are not ours to report on.

### 7. Decisions and milestones

Decisions DB (`{config.notion.decisions_db}`) and Meetings DB for the period. Include
only decisions and completed action items relevant to the client. Exclude internal
retrospectives and team process.

### 8. Hours against the agreed capacity (monthly and steering)

Only when `{config.pm_profile.contract.hours_cap_month}` is a number: Tempo total vs cap
(`hours_burn`). Present overage or underuse as a fact with its context (for example
"N hours above the agreed monthly capacity at no additional cost, driven by two
production incidents"), never as "overdelivery" or as a deviation of normal operations. No cap in the
config → no capacity line.

### 9. Delivered beyond scope (monthly, optional)

If the project has a "Scope & Extras Log" page (kept by `change-request`), take the
month's free items and offer the block "For transparency: delivered beyond the agreed
scope" in client language. Mark it in chat as optional: the PM decides whether it goes out.

### 10. Decisions needed from the client

From the Risks DB: `Kind = Dependency` entries with Visibility External/Both that wait
on the client; from open Change Requests (Reports DB, Type `Change Request`) without a
decision; from the prep and meeting action items assigned to client people. Each: what,
who (from `decision_rights` / Team - Client), by when, what happens without it.

## Locked template (wins over the formats below)

If the config (`{config.pm_profile.reporting.locked_template_page_id}`) or the PM names a
previous report as the locked template for a report type, that report's sections, order and visual language win over
the formats in this skill: only the content changes. Reader-rule elements the locked
template lacks (status line, "Decisions Needed From You", capacity line, beyond-scope
block) are NOT inserted silently; list them in chat as a proposal for the PM.

## Reader rule (all three formats)

Per `_standards.md` section 1: the report opens with **Overall status 🟢/🟡/🔴 and a
one-line reason**, describes progress as outcomes (what the client can now do), pairs
every risk with what we are doing, and always contains **"Decisions Needed From You"**.
If nothing is needed, write "No decisions needed this period." Bad news never goes
without a plan and the date of the next update; flag such a report to the PM in chat as
"BAD NEWS DRAFT".

The Data Completeness header is for the PM, not the client: show it in chat and put it
as an HTML comment on the first line of the saved `.md` (`<!-- Sources: ... -->`). Never
put source states or internal tooling names into the client text.

## Weekly Report Format

```
# {config.project_name} - Weekly Status Report
**Period:** [start date] - [end date]
**Prepared by:** Project Manager
**Overall status:** [🟢/🟡/🔴] - [one-line reason]

## Summary
[2-3 sentences: outcomes achieved, key progress, notable events]

## Completed This Week
| # | Ticket | Description | Category | Assignee |
|---|--------|-------------|----------|----------|
**Total: X tickets completed**

## In Progress
| Ticket | Description | Assignee | Status | Notes |
|--------|-------------|----------|--------|-------|

## Time Allocation
| Team Member | Role | Hours | Focus Areas |
|-------------|------|-------|-------------|
| **Total** | | **Xh** | |

## Blockers & Risks
- **{KEY}-XXX**: [description] - [what is needed to unblock]
(If none: "No active blockers this week.")

## Decisions Needed From You
- [decision] - [who] - [by when] - [what happens without it]
(If none: "No decisions needed this period.")

## Next Week Outlook
- [planned work, key deliverables, dependencies on the client team]
```

## Monthly Report Format

```
# {config.project_name} - Monthly Status Report
**Period:** [Month Year]
**Prepared by:** Project Manager
**Overall status:** [🟢/🟡/🔴] - [one-line reason]

## Executive Summary
[3-5 sentences: major achievements, key metrics, overall trajectory]

## Accomplishments

### By Category
| Category | Count | Key Items |
|----------|-------|-----------|
(categories from the config's Labels Taxonomy)

### Full Ticket List
| # | Ticket | Description | Category | Assignee | Resolved |
|---|--------|-------------|----------|----------|----------|
**Total: X tickets completed** (Previous month: Y, Delta: +/-Z%)

## Time Report

### Team Allocation
| Team Member | Role | Hours | % of Total |
|-------------|------|-------|------------|
| **Total** | | **Xh** | **100%** |

### Weekly Breakdown
| Week | Hours | Tickets Completed |
|------|-------|-------------------|

### Hours by Category
| Category | Hours | % of Total |
|----------|-------|------------|

### Hours vs Agreed Capacity (only when the config has a cap)
[total] of [cap] hours ([%]); [context for any difference]

## Current Pipeline
| Status | Count |
|--------|-------|
(statuses from the config's Workflow table)

## Platform Stability
[high-level summary: error trends, resolved vs new, overall health]

## Key Decisions & Milestones
- [date]: [decision/milestone]

## Risks & Blockers
- **[Risk]**: [description, impact, mitigation]
(If none: "No active risks or blockers at end of month.")

## Delivered Beyond Scope (optional, PM decides)
- [free extra delivered this month, in client language]

## Decisions Needed From You
- [decision] - [who] - [by when] - [what happens without it]
(If none: "No decisions needed this period.")

## Outlook - [Next Month]
- **Planned focus areas**, **Expected deliverables**, **Dependencies**
```

## Steering / Exec Update Format

One page, decision level, for the client's leadership (from the PM Toolkit template).
No ticket lists, no names of our engineers.

```
# {config.project_name} - Steering Update
**Period:** [Month Year or quarter] · **Overall status:** [🟢/🟡/🔴] - [one-line reason]

## Business Outcomes
- [what the business gained this period, in outcomes]

## Capacity and Budget
[hours vs agreed capacity when the config has a cap; money only if the PM provided
figures; otherwise "Capacity used: X hours" without a target]

## Top Risks
| Risk | Severity | Mitigation / ask |
|------|----------|------------------|
(3-5 entries, Risks DB Visibility External/Both, sanitized per risk-register rules)

## Decisions Needed at Leadership Level
- [decision] - [by when] - [what happens without it]
(If none: "No leadership decisions needed this period.")

## Next Milestones
- [milestone from pm_profile.milestones] - [date] - [on track / at risk]
```

## Behavior

1. Determine the report type from the period.
2. Collect available sources in parallel.
3. Parse the Tempo file for the period; map ticket keys to labels for the category
   breakdown.
4. **Critical filter:** exclude internal discussions, team process, tooling and
   infrastructure detail that is not client-relevant.
5. Write in English, professional tone.
6. Save the report to the outputs folder as `.md`.
7. Save to the Notion Reports DB (see Report Storage).
8. If running manually, present the key highlights in chat.

## Content Guidelines

- **Language:** English only
- **Never include:** internal team discussion, retrospective notes, tooling or
  infrastructure issues, internal Slack conversation, team process improvements, risks
  whose `Visibility` is `Internal`
- **Do include:** completed work with clear descriptions, time data, metrics,
  client-relevant decisions, risks that affect deliverables
- **Assignee names:** full names from the config's Team section. Never list anyone from
  Former Members as active
- **Ticket descriptions:** client-friendly summaries, not raw internal titles
- **Never** put a token, an internal URL or a Notion link into a client report

## Report Storage

Save to the Notion Reports DB: `{config.notion.reports_db}`.

Use `notion-create-pages` with these properties (Reports uses relations `Project` and
`Workspace`):

| Property | Value |
|----------|-------|
| Report Name | `{config.project_name} - [Weekly/Monthly] Client Report - [period]` or `{config.project_name} - Steering Update - [period]` |
| date:Date:start | Last day of the report period (YYYY-MM-DD) |
| Type | `Client Weekly Report`, `Client Monthly Report` or `Steering Update` (create the option if missing) |
| Skill | `client-report` |
| Visibility | `External` |
| Summary | 2-3 sentence summary of key deliverables and metrics |
| Workspace | `["https://app.notion.com/p/{config.notion.workspace_page_id}"]` (ID without dashes) |
| Project | `["https://app.notion.com/p/{config.notion.project_page_id}"]` (ID without dashes) |

The **full report content** goes as the page body (Notion Markdown).

## Scope and continuity guards - apply to every report

- Report only on components the config's Scope of Responsibility marks as ours.
  Client-owned components are not our delivery and must not appear as our work.
- Platform Stability uses `{config.sentry.projects_in_scope}` only.
- **Metric continuity:** if `{config.engagement.metric_continuity}` is set and the
  comparison crosses that date, annotate it with the wording from the config as a planned
  engagement change, not a performance drop. The dates and the reason live only in the
  config, never in this skill.
- **Distribution:** if `Team - Client` or Engagement Status names the report recipients
  (To / Cc), list them in the chat summary for the PM. Sending stays manual.