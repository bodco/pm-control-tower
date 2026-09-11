---
name: projects
description: >
  Project configuration registry. Contains per-project config files with all
  project-specific variables (task tracker access mode, Jira, Slack, Sentry,
  team, Notion IDs and relation names, email routing, local paths, meetings,
  access matrix, engagement status, deploy config). All PM skills read from
  these configs instead of hardcoding values. This is NOT a user-facing
  skill - it's infrastructure used by other skills. DO NOT trigger this skill
  directly.
---

# Project Configurations

This directory contains one `.md` config file per project. All PM automation skills read their project-specific variables from these files.

## Rule Zero - config wins

The per-project config is the single source of truth for project STATE: team,
scope, access, meetings, integrations, IDs, deploy model, email routing. If a
skill's own text contradicts the config, the config wins and the skill text is
stale (report the discrepancy to the user). Facts in configs carry "as of"
dates; every state change is recorded the same day with a Changelog line at the
bottom of the config.

## Default Project Rule - NEVER guess the project

If the user's request does not explicitly name a project (by name, slug, or an
unambiguous identifier such as a ticket-key prefix like `PROJ-` or a
project-specific Slack channel), the skill MUST ask which project is meant,
listing the projects registered here. Do not default silently - not even when
only one project is active. Cross-project mixing (writing one project's data
under another project's relations, or applying one project's credentials to
another) is the worst failure mode of this system.

A project is **active** unless its config contains `status: archived`.

## Naming Convention for skills

- `{project}-...` prefix (e.g. `acme-debug`, `acme-beneficiary-audit`) = the
  skill is hard-bound to that single project. It must never trigger for other
  projects. This is a normal adapter pattern, not a design flaw: every project
  ends up with a few of its own.
- No project prefix (e.g. `slack-collector`, `jira-management`,
  `weekly-overview`) = a project-agnostic engine. It MUST read this registry
  (Step 0), obey the Default Project Rule, and keep every project-specific fact
  in the config, not in its own body.
- Non-PM personal/other-domain skills (t2-*, marken-order, ukr-dissertation-format,
  signal-desktop, calyx-export, signant-export, dila-lab-order) live outside this
  system and do not read the registry.

## How skills use this

Every project-agnostic PM skill (slack-collector, mac-mail-collector,
weekly-overview, daily-team-prep, client-meeting-prep, stability-scan,
jira-board-health, velocity-report, client-report, risk-register,
client-satisfaction-tracker, deploy-analysis, inbox-responder, topic-manager,
jira-management, sentry-assistant, thread-ticket-sync) starts with:

1. Determine the project from the user's request. If not explicitly named - ASK
   (Default Project Rule above)
2. Read the config file `projects/{project_slug}.md`. Resolution order:
   - `../projects/{project_slug}.md` relative to the calling skill's own SKILL.md
     (the `projects` folder sits next to every other skill folder);
   - if that fails, locate it with Glob: `**/projects/{project_slug}.md` under the
     skills directory.
   - Note: the legacy `_projects/` directory does not exist any more; older skill
     copies that mention it are stale.
3. Use values from the config instead of hardcoded constants
4. Read the "Access Matrix", "Task Tracker" and "Engagement Status" sections
   FIRST when the task touches repos, tickets, scope, capacity or reporting -
   they define what is reachable and what is ours vs client-owned, with dates
5. If the task produces a report, a meeting prep, metrics, a risk entry or a
   decision entry, ALSO read `projects/_standards.md` and the `PM Profile`
   section of the config (see "PM standards and PM Profile" below)

If the config file doesn't exist, tell the user: "Project config not found.
Available projects: [list files in projects/]"

## Task tracker access and graceful degradation - MANDATORY

Not every client gives API access to their tracker. Client infosec (SSO, Okta,
MDM) frequently refuses tokens for AI agents, and the framework must survive
that instead of failing.

Every config declares the access mode:

```yaml
task_tracker:
  type: jira_server | jira_cloud | linear | trello | asana | monday | client_notion | manual
  api_access: true | false
  project_key: {KEY or none}
  fallback_source: none | manual_export | meeting_action_items | email_summaries
  export_path: {path or none}
  browser_access: true | false
```

Rules for every skill that reads tickets:

1. After Step 0, check `{config.task_tracker.api_access}`.
2. `true` → normal path. Every JQL/query MUST be scoped to the project
   (`project = {config.task_tracker.project_key}`). A tracker query without an
   explicit project filter is forbidden: the company Jira hosts many clients and
   an unscoped query leaks another project's data into this project's report.
3. `false` → do NOT fail and do NOT emit an empty section. Switch to
   `{config.task_tracker.fallback_source}`:
   - `manual_export` - read the newest file in `{config.task_tracker.export_path}`
   - `meeting_action_items` - action items from Meetings DB for the period
   - `email_summaries` - Threads DB entries for the period
4. Whatever the source, state it in the report's first line, with freshness:
   "Джерело задач: ручний експорт від 2026-09-05 (свіжість 2 дні)". If a manual
   export is older than 3 days, say so explicitly instead of presenting it as current.
5. The same applies to every other source: `sentry.url: none`, empty
   `slack.channels_all`, `deploy config: none` → skip that source with one line
   in the report, generate the rest.

Some skills have no meaning without a tracker API (`jira-board-health`,
`acme-jira-estimate-setter`). Those decline politely and explain why, rather
than degrading.

A separate `client_tracker` block describes the client's own board when they
keep one (e.g. Acme: client Notion DEV Board, `api_access: false`,
`sync_method: csv_import`). Flow is one-way, our tracker → their board; never
claim to know statuses from a `client_tracker` with `api_access: false`.

## Secrets - never in this directory

Tokens and keys do NOT live in config files: this folder is synced to the cloud
with the rest of the skills. Configs carry only the variable name and the path:

```yaml
token_env: PROJECT_SENTRY_TOKEN
secrets_file: ~~home-folder/work/Secrets/secrets.env
```

Read the value at runtime:

```bash
grep '^PROJECT_SENTRY_TOKEN=' ~~home-folder/work/Secrets/secrets.env | cut -d= -f2-
```

Never print a secret into a report, a Notion page or a chat message.

## Email routing - one place only

The routing registry (which client addresses belong to which project) lives ONLY
in the `Email Routing` section of each config. It used to be duplicated in three
places (config, `gmail-collector`, `mac-mail-collector`); `gmail-collector` was
deleted 2026-09-07 (project mail arrives through Mail.app), and
`mac-mail-collector` now reads all active configs and builds the registry in
memory.

Derived, never maintained by hand: an address is **shared** when it appears in
`client_emails` of two or more active configs. A thread belongs to a project only
when a `unique_emails` entry or a `unique_domains` suffix matches. Noise and
calendar filters are engine logic and stay in `mac-mail-collector`.

## Notion relation property names (unified 2026-09-08)

All shared Control Tower databases use the same names: `Project` and
`Workspace` (singular, no emoji). Cross-relations have no emoji either:
`Meetings`, `Threads`, `Topics`, `Knowledge Base`. Values are always a JSON
array of page URLs. The old per-database table (`Projects`, `Workspaces`,
`🏛️ Workspaces`, emoji-prefixed names) is gone; a skill body that still uses
those names is stale. If a live schema ever diverges from this paragraph, the
live schema wins: fetch the data source, write with the real name, and report
the discrepancy so this file is fixed the same day.

## JQL Isolation Validator - MANDATORY (all modes, including debugging)

Before ANY query to a task tracker:

1. Check that the query contains `project = {config.task_tracker.project_key}`
   (or the tracker's equivalent project filter).
2. Missing → wrap the query automatically:
   `project = {KEY} AND ({original query})`.
3. No `project_key` in the config → emergency stop: do not send the query,
   tell the user which config field is missing.

A bare, unscoped query is forbidden in every mode. This rule overrides any
example query in the body of an individual skill.

## Data Completeness header - MANDATORY for every report

Every report opens with one line listing the state of EACH source the skill
was supposed to use:

`Джерела: Jira OK · Slack EMPTY (0 повідомлень за період) · Sentry SKIPPED (url: none) · Tempo STALE (експорт від 2026-08-31) · Notion FAILED (401)`

States: `OK`, `EMPTY` (source reachable, nothing in the period), `STALE`
(data older than the freshness rule), `SKIPPED` (not configured / not in
scope), `FAILED` (source unreachable or errored). `EMPTY` and `FAILED` are
never merged into one: that merge once hid a broken Slack collector for
months. The line is present even when everything is OK, so that its absence
is itself a visible defect. Also list `PM Profile` when the skill uses it.

## PM standards and PM Profile

`projects/_standards.md` is the machine version of the PM Toolkit in Notion
(CONTROL TOWER / Knowledge Base / Project Management / PM Toolkit). It holds
cross-project STANDARDS: metric catalog and phase profiles, meeting agendas,
the reader rule for reports, the document minimum, early warning signals,
RAID and decision standards. The config's `PM Profile` section holds the
project-specific choices (case, phase, metrics_profile, contract and hours
cap, SLA, milestones, decision rights). Config beats `_standards.md` for this
project; `_standards.md` beats the Notion Toolkit for skills.

Rules every engine applies:

1. **Reader rule.** Every report or prep addressed to a reader (client,
   management, team) contains: Status 🟢/🟡/🔴 with a reason; progress as
   outcomes; risks with actions; and a **"Decisions needed from you"**
   section (client-facing: English). If nothing is needed, write it
   explicitly ("No decisions needed this period"). Bad news never goes
   without a plan and a next-update date, and is flagged to the PM as
   "BAD NEWS DRAFT". Sending stays manual.
2. **Metrics.** Metric-producing skills (`velocity-report`,
   `jira-board-health`, `weekly-overview`, `daily-team-prep`) take the metric
   set from `pm_profile.metrics_profile` and the 🚩 thresholds from
   `_standards.md` section 2. No PM Profile → derive the profile from
   `board_type` and write `PM Profile: SKIPPED` in the completeness header.
   `hours_burn` only when `contract.hours_cap_month` is a number.
3. **Meeting preps.** The `Agenda` column of Meetings Schedule selects the
   prep structure from `_standards.md` section 5; client preps end with
   "Decisions to obtain in this meeting". `one_on_one` preps never analyse
   a person's mood or psychological state.
4. **Risks DB = RAID.** Property `Kind`: `Risk | Assumption | Issue |
   Dependency`; empty means `Risk` (all entries before 2026-09-10).
5. **Decisions DB.** Besides `Decision`, `Context`, `Alternatives rejected`,
   `Stated by`: fill `Trade-off`, `Review trigger` and `Door`
   (`One-way` / `Two-way`) when the source states them. Never invent a
   trade-off or alternatives; missing ones are reported to the PM as "decision
   not mature".
6. **Stakeholders.** `Team - Client` in the config is the Stakeholder
   Register (Influence, Interest, Channel, Cadence, Notes). Read `Notes`
   before flagging someone's silence as a warning signal.
7. **Estimates.** The number comes from the assignee; skills decompose and
   show history, never propose or anchor a figure.

## Files in this directory

| File | Purpose |
|------|---------|
| `<your-project>.md` | Your project config. Copy `_template.md`, rename it to your project slug and fill it in. One file per project |
| `_standards.md` | Cross-project PM standards (machine version of the Notion PM Toolkit): metrics, profiles, agendas, reader rule, document minimum, RAID, decisions |
| `_template.md` | Blank template for adding a new project |

## Adding a new project

Full runbook: `08-new-project-flow.md` in the Control Tower docs; ready-made
prompt: `prompts/new-project-onboarding.md` there.

1. Copy `_template.md` to `{new_project_slug}.md`
2. Fill in: status, Access Matrix, **Task Tracker access mode** (`api_access`,
   `fallback_source`), Client Tracker if the client keeps their own board, Jira
   (incl. epics/assignment rules) or "none", Slack, Sentry or "none", team,
   Notion IDs, local paths, meetings (with the `Agenda` key), Deploy Config,
   **Email Routing**, **PM Profile** and the stakeholder columns of
   `Team - Client`
3. Create the Project page (Projects DB template "New project") and, if the
   client is new, the Workspace page; under the project page create Current
   State and the Project Charter (duplicate of the PM Toolkit template, filled
   from the config); put all IDs into the config
   (all shared DBs - Threads, Meetings, Topics, Reports, Risks, Decisions,
   Tasks Tracker - use these as relation values, so tagging is what keeps
   projects separate)
4. Email routing: fill the `Email Routing` block in the config. Nothing to update
   in the collector skills any more (this replaced the old three-place registry)
5. Secrets: put any tokens into `~~home-folder/work/Secrets/secrets.env`,
   reference them from the config by variable name only
6. Add a first row to the Decisions DB: "project started, scope = ..." (Area = Scope)
7. Adding a new config file means re-uploading the whole `projects` skill
   (Settings → Skills → Upload of a rebuilt `projects.skill`); a skill card
   replaces only SKILL.md and cannot add a file
8. Skills pick the project up automatically when the user mentions it by name;
   the monthly digest and skill health check iterate over all active configs

## Maintaining a config (the memory discipline)

- Any state change (person joins/leaves, access gained/lost, meeting cadence
  change, scope change, tracker access granted or revoked) = same-day edit of the
  config + one line in its Changelog + one row in the Decisions DB. Skills pick
  the change up automatically; do NOT copy the fact into skills.
- Never delete facts: move them to a "historical" marking with an end date
  (see the Former Members table and the external-dev label in `acme.md` for the
  pattern).
- Archiving a finished project: add `status: archived` to its General section
  (skills stop offering it as a choice; its data and history stay readable).
- The monthly skill health check compares every skill against the configs and
  reports drift.
