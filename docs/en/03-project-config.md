# 03. Project registry `projects/`: the single source of truth

## Why

Until August 2026, project facts (team, channels, database IDs, transition IDs) were scattered across skill bodies. When the Acme team shrank from 9 people to 3 in two months and access to half of the repositories disappeared, it turned out that dozens of skills kept "knowing" the old reality. Hence the config registry: one file per project that every skill reads, and a hard rule that the config wins.

The registry lives as a synced skill `projects/` (a folder next to all the other skills). It is not a user-facing skill, it is never invoked on its own, it is infrastructure. Historically it was `_projects/` in CLAUDE.md; that name is obsolete.

Folder contents:

| File | Purpose |
|---|---|
| `SKILL.md` | registry rules: Rule Zero, Default Project Rule, Naming Convention, how skills read the config, how to add a project |
| `_standards.md` | standards that are identical for all projects (the machine-readable version of the PM Toolkit, `14`) |
| `_template.md` | empty config template |
| `<slug>.md` | project config, for example `acme.md` (~29 KB) |

## Three rules

### Rule Zero: config wins
The config is the single source of truth about the STATE of a project: team, scope, access, meetings, integrations, IDs, deploy model. If the text of a skill contradicts the config, the config is right and the skill is outdated (and the user must be told about it). Facts in the config carry "as of" dates. Every state change is recorded the same day as a line in the Changelog at the bottom of the config.

### Default Project Rule: never guess
If the user's request does not name the project explicitly (name, slug, an unambiguous identifier such as the key prefix `PROJ-` or a project-specific Slack channel), the skill MUST ask, listing the registered projects. Never guess silently, even if only one project is active. Mixing projects (writing one project's data under another's relation, applying one project's credentials to another) is the worst failure mode of the system.

A project counts as active if the config has no `status: archived`.

### Naming Convention for skills
- `{project}-...` (for example `acme-debug`, `acme-beneficiary-audit`): the skill is hard-bound to a single project and never fires for others.
- No prefix (`slack-collector`, `jira-management`, `weekly-overview`): an engine, independent of any project. It must read the registry (Step 0), follow the Default Project Rule and keep all project facts in the config rather than in its own body.
- Personal or other-domain skills (`t2-*`, `marken-order`, `ukr-dissertation-format`, `signal-desktop`) live outside the system and do not read the registry.

## How a skill reads the config (Step 0)

Every engine starts with the same block:

1. Determine the project from the request. Not named, ask.
2. Read `../projects/{slug}.md` relative to its own SKILL.md; if not found, `Glob **/projects/{slug}.md` across the skills folder.
3. All values of the form `{config.xxx}` come from there.
4. If the task touches repositories, scope, capacity or reporting, read the Access Matrix and Engagement Status sections first, because they are what defines what is ours and what is the client's, with dates.

If the config is not found: "Project config not found. Available projects: [...]".

## Anatomy of a config (per `_template.md`, with comments from `acme.md`)

### General
`project_name`, `project_slug`, `status` (active / archived), `description`, `board_type` (Kanban / Scrum), `default_language` (language of internal reports), `client_language`.

### Access Matrix (READ THIS FIRST)
A table: resource, access (✅/❌), since which date, notes. Every resource the skills touch: repositories, databases, monitoring, communication tools. On Acme it records that the MO/CP/Mobile repos are client-owned, and that the local clones and knowledge bases are frozen snapshots as of 2026-07-31, read-only institutional memory rather than current code.

### Internal Infrastructure
Current URLs of corporate systems. Needed so that skills read old links in tickets as historical and do not rewrite what has not changed (for example the local path `/Users/our-company/` is a username, not a domain).

### Task Tracker (access mode; not yet in `_template.md`)
A section that comes before Jira and defines whether skills can read the tracker directly at all:

```yaml
task_tracker:
  type: jira_server        # jira_cloud | linear | trello | asana | monday | client_notion | manual
  api_access: true         # whether MCP/REST access exists; often false at clients with SSO/Okta/MDM
  fallback_source: manual_export   # manual_export | meeting_action_items | email_summaries
  export_path: ~/work/<slug>/exports/   # for manual_export: the PM drops tracker CSV/xlsx here
  browser_access: false    # whether the tracker can be read via the Chrome skill (no token, under the PM session)
```

On Acme: `jira_server`, `api_access: true`. On a project where the client only granted a login to their Jira Cloud: `jira_cloud`, `api_access: false`, `browser_access: true`, `fallback_source: manual_export`. Engines read this section right after Step 0 and, when `api_access: false`, switch to the fallback without an error (the graceful degradation rule in `04`).

### Jira
Filled in if `task_tracker.type` is jira_server or jira_cloud with `api_access: true`. `server_url`, `server_version`, `project_key`, `mcp_write`, `mcp_read`, `known_bug` (on Jira Server 7.13 both connectors return "Unexpected end of JSON input" on writes: this is cosmetic, HTTP 204, the updates go through, verify by reading back).

Subsections:
- **Labels Taxonomy**: labels and their purpose (feature, enhancement, bug-fix, ops-support, security, external-dev marked HISTORICAL with a date).
- **fixVersion Convention**: monthly versions `vYYYY-MM`, named releases `Prod release DD.MM.YYYY`, fixVersion is set retrospectively at Done.
- **Workflow & Transition IDs**: exact status names for JQL and transition IDs. The trap: `"On Hold / Blocked"` with spaces, otherwise 400.
- **Key Epics**: key, name, purpose.
- **Assignment Rules**: domain to assignee, with an "as of" date; explicitly "No internal resource, leave unassigned, flag to PM" for whatever moved to the client.
- **External-Dev Workflow**: if there are client developers whose PRs we review (on Acme this ended 2026-07-31, kept as history).

### Slack
`workspace`, `channels_dev`, `channels_stability`, `channels_all`.

### Sentry
`url`, `token`, `org_slug`, `projects_in_scope`, `projects_out_of_scope` (with dates and reason), the full list of projects on the instance. If there is no Sentry: `url: none`, skills skip it.

### Notion
`project_page_id`, `workspace_page_id` (project-level), plus the shared `reports_db`, `threads_db`, `meetings_db`, `topics_db`, `knowledge_base_db`, `risks_db`, `decisions_db`, `inbox_review_page`, and if needed `client_dev_board_db` (the client's workspace).

### Local Paths
`aws_logs`, `time_reports`, `repos_root`, `kb_root`, `presentment` and so on. "none" means the skill skips that source. Note for cloud sessions: the paths are reachable through the bridge.

### Engagement Status (READ THIS FIRST)
Model (delivery / support), end date, team size, whether there is QA, scope of responsibility per component with dates, **Metric Continuity warning** (on Acme: periods before 2026-08-01 are not comparable, team 9 to 3, scope narrowed; any chart crossing that date must carry an annotation, otherwise it reads as a productivity collapse).

### Team - Internal / Former Members / Client
The current team with Jira username, role name for reports, availability (part-time / full-time, until what date), focus. A separate **Former Members** table with the last day on the project: facts are not deleted, they get an end date. Emails and the sender classification rule (anything `@our-company.com` is internal). Transcript Alias Map (how transcripts mangle names). The client team with roles and notes.

### Meetings Schedule
Day, time, type, scheduled task ID suffix, focus. Plus a text description of any non-standard cadence (on Acme the internal sync runs every other day: week A Mon/Wed/Fri, week B Tue/Thu).

### Deploy Config
Repo, prod branch, pending branch, whether it is in the default scope. Deploy windows, promotion rules, hotfix policy. If there are no repositories: "none", and deploy-analysis politely declines.

### Gmail - Client Search Filter
A ready-made Gmail query for the client's mail, or "none".

### Cultural Profile (Erin Meyer, Culture Map)
Positions of our culture and the client's on 7 scales, individual calibration of each member of the client team (downgrader multipliers, key "tells"), a table translating indirect phrasing into severity. Read by `client-satisfaction-tracker` and `client-meeting-prep`. For a new project at least the client's country has to be filled in; reference profiles for 10 countries are in the skill.

### PM Profile
Case A/B/C, phase, approach, `metrics_profile` (profile key from `_standards.md`), WIP limit, contract (type, `hours_cap_month`, budget, billing, period), SLA, milestones, `decision_rights` (a short RACI), IDs of Toolkit documents (Charter, KT, Extras Log), `goodwill_budget_pct` for `change-request` and the date of the last health check (the Extras fields were added in 0.7.2). Together with the stakeholder columns in `Team - Client` (Influence, Interest, Channel, Cadence) and the `Agenda` column in Meetings Schedule, this is what turned the PM Toolkit into project state. A missing section does not break the skills: the profile is derived from `board_type` and the report says `PM Profile: SKIPPED`.

### Changelog (append-only, newest on top)
Date and what changed. This is the "memory of changes" that the Skill Health Check compares against the skills.

## Config maintenance discipline

- Any state change (a person joined or left, access gained or lost, meeting cadence changed, scope changed) = the same day: edit the config + a Changelog line + a line in the Decisions DB. The skills pick it up automatically; the fact is NOT copied into the skills.
- Facts are not deleted, they are moved to historical with an end date (see Former Members, external-dev).
- Archiving a project: `status: archived` in General. Skills stop offering the project, while the data and history stay readable.
- Once a month the cloud Skill Health Check compares every skill against the configs and reports drift (`05-autopilot.md`).

## What is duplicated outside the config (deliberately, and must be kept in sync)

1. **The email registry in the collectors**: ~~`gmail-collector` and `mac-mail-collector` have built-in tables~~.: `gmail-collector` has been removed, and `mac-mail-collector` reads the `email_routing` section from the project configs. Addresses shared between projects are no longer maintained by hand: an address counts as shared if it appears in `client_emails` of two or more active configs. There is one source of truth: the config.
2. **Global Cowork instructions** ("PM Workspace"): the table of active projects and a short cheat sheet for the default one. Right now they still point at `_projects/`, the old Jira URL and the old team. The review recommendation (accepted as the v0.2 plan): cut it down to the role model and meta-rules (Rule Zero, Default Project Rule, no inventing facts, language/style) plus a "project to slug" table; all facts are read from `projects/`.
3. **Scheduled tasks**: task prompts name the project explicitly ("for the Acme project"). This is not duplication of facts, it is the correct way to supply the project for the Default Project Rule.

## Planned extensions to the config schema

These sections will appear in `_template.md` once the PM decides; for now this is a plan and the skills do not read them.

| Section | What it contains | What it solves |
|---|---|---|
| `task_tracker` | tracker type, `api_access`, `fallback_source`, `export_path`, `browser_access` (described above) | Zero-API Access at clients; graceful degradation of the engines. Priority 1 among the extensions |
| `methodology` | **Partly done** via `pm_profile.delivery_approach` and `metrics_profile`; sprint length and the capacity source are not yet there. `kanban` / `scrum`; for scrum: sprint length, capacity source | Scrum projects get `sprint-planning-prep` instead of Kanban logic |
| `email_routing` | all client addresses, unique ones, shared ones, team addresses, unique domains | One registry instead of three (config + two collectors); AppleScript exports everything, the skill routes by config |
| `secrets` | **Done.** The config holds only `token_env` and `secrets_file`; the values live in `/Users/our-company/work/Secrets/secrets.env` (a visible folder, chmod 600, outside sync). The same file is read by the local Slack MCP server through `sh -c` in `claude_desktop_config.json`. Git credentials (the GitHub PAT for `pm-control-tower`) live next to it, in `Secrets/.git-credentials`, a separate file because git does not understand the `KEY=value` format (`13` #47). `jira-cosmix`/`jira-rixbeck`/`confluence-our-company` have not moved to this pattern yet, `13` #43 | Tokens end up neither in synced skills nor in the desktop JSON config |
| `languages` | `internal_language`, `client_language` (partly present as default_language/client_language) | All generative prompts take the language strictly from here |
| `data_policy` | `allow_llm_code_inspection`, `allow_llm_slack_reading`, `anonymize_pii` | Clients who forbid sending code/correspondence to an LLM: the skills switch off the corresponding sources automatically |
| `notion.relations` | **Not needed:** the databases are unified (`Project` / `Workspace` everywhere). Historical description: the exact relation name for Project and Workspace in each database (`Projects`/`Project`, `Workspace`/`🏛️ Workspaces`/`Workspaces`) | Until the databases are unified, skills take the names from here instead of remembering them |
| `git.repositories` | list of repos with path, prod/pending branches, stage branch (partly present in Deploy Config) | `env-audit` and `branch-review` without a project prefix |
| `budget` | **Done** as `pm_profile.contract` (`hours_cap_month`, `budget_cap`) plus the `hours_burn` metric in `_standards.md`. A cap in hours or money per period, and the source of actual hours (Tempo) | A minimal burn rate for domain 21 |

## Example: how one config line changes the behavior of ten skills

`acme.md` records Sentry `projects_in_scope: authorizer-api`, everything else `out_of_scope` with a reason. The result, without editing a single skill: stability-scan scans one project instead of seven, client-report does not mention MO/CP errors, daily-team-prep does its quick check only on authorizer-api, risk-register does not create risks on client-owned components, velocity-report adds the annotation about non-comparable periods. This effect is exactly why the registry exists.
