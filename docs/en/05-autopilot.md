# 05. Autopilot: scheduled tasks

## The idea

A skill you start by hand saves time. A skill that starts by itself and puts the result where you will see it changes the way you work: you arrive to a prep that is already done instead of making it. The autopilot is a set of short prompts on a cron schedule, each of which calls one or more skills for a specific project and requires the result to be saved into the Reports DB.

## The two schedulers

| | Cowork Scheduled Tasks | Cloud Routines (Claude Code Remote) |
|---|---|---|
| Where it runs | Claude Desktop on the Mac (the Mac has to be on and the app running) | a cloud container, no Mac needed |
| Access to Mac files | yes, directly | only through the bridge, if the Mac is online |
| Local MCP (jira (two servers), notion REST, confluence) | yes | through the bridge |
| Cloud connectors (Slack, Notion, Gmail, Calendar) | yes | yes |
| Where it is defined | the folder `~/Documents/Claude/Scheduled/<task-id>/SKILL.md` (the prompt) + the schedule in the app | `create_trigger` / `list_triggers` through the Claude_Code_Remote MCP |
| What is there right now (the author's instance) | 17 local tasks on Acme | 6: Automation Health Check (monthly), Monthly Memory Digest (monthly), Client Satisfaction (the 1st), **Project Health Check** (the 2nd), **Acme daily Slack sync** (daily at 07:05 Kyiv), **Acme threads -> Jira tickets** (daily at ~09:15 Kyiv) |

| Control | Cowork → Scheduled Tasks (list / update / enable / run now) | `list_triggers`, `update_trigger`, `fire_trigger`, `delete_trigger` |
| When to choose it | anything that reads the disk (logs, repos, the mail buffer) or local connectors | anything that works only with cloud connectors and has to run independently of the Mac |

> ⚠️ **A lesson about local tasks.** The enabled state of a local scheduled task is controlled only by the Claude Desktop app: Claude cannot switch it off from a session. When the local `acme-daily-slack-sync` started calling a non-existent skill name after the renames, its body was replaced with a stub, but the task itself had to be disabled by hand in Claude Desktop → Scheduled Tasks. A stub in the prompt is not the same as disabling, and a rename of an engine is not finished until the prompts of every task have been checked (the lesson in `04`).


Historical note: in April 2026 a migration of the Cowork automations to Claude Code Routines was considered (the `acme-slack-collector` pilot). The conclusion: local dependencies (the Mail.app buffer, CloudWatch exports on disk, the local Jira connectors) keep the main autopilot on the Mac; only the audits that do not need the Mac went to the cloud.

## The schedule (author's instance, Acme, local time Europe/Kyiv)

> The schedule below is the author's instance, shown as an example. Scheduled tasks are not part of the handover package: a colleague creates their own from the prompt template below and the minimum set in `08` Phase 6.

### Daily
| Time | Task ID | What it does |
|---|---|---|
| 07:05 daily | **the cloud Routine `Acme daily Slack sync`** (replaced the local `acme-daily-slack-sync`) | `slack-collector` for yesterday and today with an overlap, auto-classification, the 14-day review pass. The reason for the move: the local prompt called a non-existent `acme-slack-collector` and the failure could not be diagnosed from the cloud. Steps 2 (JSON) and 4 (Jira) are deliberately skipped in the cloud prompt: there is no disk and no local Jira MCP |
| ~09:15 daily (06:15 UTC) | **the cloud Routine `Acme threads -> Jira tickets`**  | A queue (not a time window): it takes threads whose `Jira Sync` is empty or `Error`, a three-level duplicate check (the Notion log → the Slack permalink anchor in the Jira description → a semantic search), at most 10 threads per run, older threads go to a backlog for manual confirmation. Covers what `slack-collector` Step 4 cannot do in the cloud |
| 09:01 Mon-Fri | `daily-work-report` | The daily work report in Ukrainian (calendar, meetings, threads, Jira, Slack; yesterday + the plan for today) → Reports DB + `~/work/Daily Reports/` |
| 09:12 daily | `daily-process-mail-0910` | `mac-mail-collector` → `inbox-responder` |
| 09:32 daily | `inbox-responder` | Draft replies to new threads (a separate run for the threads that came in from Slack) |
| 11:08 Mon-Fri | `daily-team-prep` | Prep for the 12:00 internal sync (the skill decides from the config whether today is a sync day) |
| daily at 15:30 | `daily-current-state-distillation` | An incremental update of the Current State pages of all active projects (currently Acme and Beta) for the last 2 days |
| daily at 15:30 | `deploy-analysis-daily` | Stage vs prod across the repos from the config for the last 24 h, local refs only |
| working days 10/12/14/16/18 | `acme-branch-review` | A scan of the dev channel from the config for messages of the form `REVIEW: <branch>`; if there is one, a code review in Ukrainian in the thread; later runs read the replies in the thread as clarifications and can change the verdict; if there is none, an immediate exit |

### Weekly
| Time | Task ID | What it does |
|---|---|---|
| Mon 06:32 | `topic-manager` (weekly mode) | A scan of Meetings + Threads (and Gmail, when configured) for shared themes → Topics DB |
| Mon 08:09 | `weekly-overview` | A full overview of the past week |
| Mon 16:09 | `monday-planning-prep` | `client-meeting-prep` type Planning before 17:00 |
| Tue 16:02 | `tuesday-client-prep` | `client-meeting-prep` type Status Sync |
| Thu 16:04 | `thursday-1-1-prep` | `client-meeting-prep` type 1-1 (pre-planning) |
| Thu 22:10 | `stability-scan` | Sentry + CloudWatch digest, an EN report, Jira tickets, phase 2 from acme-debug |
| Fri 16:02 | `friday-review-prep` | `jira-board-health` + `client-meeting-prep` type Review (two separate reports) |
| Fri, as part of the review cycle | `risk-register` | There is no separate scheduled task: the skill runs as part of the Friday review cycle or by hand with "check the risks" |

### Monthly
| Time | Task ID | Where | What it does |
|---|---|---|---|
| the 1st, 09:00 | `monthly-velocity` | Mac | `velocity-report` for the previous month |
| the 1st, 09:00 | `client-satisfaction-bimonthly-1st` | Mac | The full 30-day client sentiment report |
| the 15th, 09:00 | `client-satisfaction-bimonthly-15th` | Mac | A mid-month report, compared against the 1st |
| the 1st, 06:00 UTC | `Automation Health Check (monthly)` | cloud | An audit of all of our own skills against the configs → Reports DB |
| the 1st, 07:00 UTC | `Monthly Memory Digest (all projects)` | cloud | For every active project: a digest of the month (events, decisions, metrics with caveats, risks, unfinished action items, lessons), appending the decisions that were never recorded into the Decisions DB → Reports DB |
| the 2nd, 05:30 UTC | `Project Health Check (monthly)` | cloud, auto | The `project-lifecycle` skill, health-check mode, for every active project separately: 8 RAG areas with evidence, ⚪ where there is no data; it takes the Monthly Digest and Client Satisfaction from the 1st; Tempo and Jira only through the bridge to the Mac, otherwise SKIPPED; it creates no new risks, only candidates → Reports DB, Type `Project Health Check` |

### The week at a glance

- **Every morning (Mon-Fri):** slack-sync 07:05 → work-report 09:01 → mail + inbox-responder 09:12 → inbox-responder 09:32 → team-prep 11:08 → the 12:00 meeting → 15:30 current-state + deploy-analysis; branch-review at 10/12/14/16/18.
- **Monday:** topics 06:32 + weekly-overview 08:09 + planning-prep 16:09 → planning at 17:00.
- **Tuesday:** status-prep 16:02 → status at 17:00.
- **Thursday:** 1-1 prep 16:04 → 1-1 at 17:00; stability-scan 22:10.
- **Friday:** board health + review prep 16:02 → review at 17:00.
- **The 1st:** velocity, satisfaction, skill health, memory digest. **The 15th:** satisfaction mid-month.

The prep skills are timed deliberately ~55 minutes before the meeting: enough for the PM to read them and add "My notes for the discussion", while the data is still fresh.

## The scheduled task prompt template

The prompt has to be short and refer to the skill instead of retelling it. The mandatory elements:

```
Use the <skill-name> skill for the <Project> project.
<Period / mode: for yesterday / for last week / the meeting type>.
<Special conditions: local refs only, do not fetch; mount the logs folder first>.
After generating the report, save it to the outputs folder AND to the Notion Reports DB
(see the Report Storage section in the skill for exact properties and DB ID).
The report page in Notion should contain the full report as page content.
```

The project is always named explicitly: that is exactly how the Default Project Rule is satisfied in autonomous mode.

On a project with `task_tracker.api_access: false` the prep tasks and weekly-overview run on the same schedule, but their prompt gets one extra sentence: "The tracker has no API: use the fallback from the config and note the date of the last export in the report". If the manual export is more than 3 days old, the skill says so in the first line instead of staying quiet.

For expensive tasks, explicit token saving at the start of the prompt: "First a light scan; touch the repos, the KB and generation ONLY if there is an unprocessed trigger; if there is none, exit quickly" (`acme-branch-review`). For incremental ones: "only the last 2 days, do not rescan the history" (`daily-current-state-distillation`).

Cloud Routines require a fully self-contained prompt (a fresh session with no memory of the conversation): where to find the skills and the configs (a Glob over `**/projects/*.md`), which data source IDs, which page properties, which language to answer in, and what to send the user at the end.

## Mac-bound versus Cloud-eligible (the migration plan)

| Stay on the Mac (they read the disk or local connectors) | Candidates for cloud Routines (cloud connectors only) |
|---|---|
| `daily-process-mail-0910` (the Mail.app buffer) | `weekly-overview` |
| `deploy-analysis-daily`, `acme-branch-review`, `acme-env-audit` (local git refs) | `client-satisfaction-bimonthly-1st` / `-15th` |
| `stability-scan` (CloudWatch exports on disk) | `monthly-velocity` |
| `daily-work-report` (writes into `~/work/Daily Reports/`) | already there: Automation Health Check, Monthly Memory Digest |
| prep tasks: they could go to the cloud if Jira is reachable through a cloud connector | `daily-current-state-distillation` (Notion only); **`Acme daily Slack sync` (moved to the cloud)**; **`Acme threads -> Jira tickets` (a new cloud task, not a migration: the Jira write goes through the local `jira` MCP (`jira.mcp_write` in the config))** |

**Cron in the cloud is counted in UTC.** "07:05 Kyiv time" is `5 4 * * *` in summer and `5 5 * * *` in winter; without a manual fix twice a year every cloud task shifts by an hour. The local desktop scheduler works in local time and does not have this problem. The decision has not been made (open question #42 in `13`).

A risk the review named explicitly: after the Mac wakes up, the overdue tasks can fire in an avalanche and blow through the limits. For now there is only one answer: do not rerun everything by hand, but look at what is actually missing in Today's Reports.

## Where the results land

1. **The Notion Reports DB** - always (Type, Skill, Date, Summary, Project, Workspace, the full text).
2. **The session's local outputs folder** - a duplicate for Cowork tasks; for daily-work-report also `~/work/Daily Reports/`.
3. **Side effects in external systems** - limited and explicit: Jira tickets from stability-scan, pages in Threads/Topics/Risks/Decisions, comments in the Slack thread from acme-branch-review (only as a reply to an explicit `REVIEW:`), a CSV for the client's Notion. Nothing is sent to the client automatically.

## What breaks and how you see it

- The Mac went to sleep or the app was closed - the local tasks did not run. Visible from the empty Today's Reports section in the morning. The fix: `Run now` in Cowork.
- A cloud task does not see the Mac - it is not supposed to; if a task needs the disk, it has to be a local one.
- A skill has fallen behind its config - Automation Health Check will show it on the 1st; between audits the signal is odd names of people or components in the reports.
- Notion returned a 2000-character error, or a relation was silently not written - visible in the skill's report ("saved with warnings") or from a missing page; check the property names.
- `git fetch` hangs in the cloud - the proxy; the skill has to work with local refs only.

## Control command cheat sheet

Cowork (Mac): open Scheduled Tasks in the app: the list, enable/disable, change the cron or the prompt, Run now. Creating a new task: through the app.

Cloud (in any Claude session): `list_triggers` (state and last attempt), `update_trigger` (cron, prompt, enabled), `fire_trigger` (run now), `delete_trigger`. Cron in UTC.
