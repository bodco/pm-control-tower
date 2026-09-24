# 04. Skills library

## What a skill is

A skill = a folder with a `SKILL.md` file (plus, if needed, `README.md`, `scripts/`, `references/`, `inputs/`) that Claude reads and executes. `SKILL.md` has frontmatter (`name`, `description` up to 1024 characters, because sync rejects longer ones) and a body with instructions. The description is both a description and a trigger: Claude decides to apply the skill when the request matches the description (trigger words in two languages).

Skills are synced between Claude Desktop (Cowork) and cloud sessions. Two different numbers that should not be confused:

- **The handover package** (the `pm-control-tower` plugin): **21 skills**, all of type E (engines) plus the infrastructure skill `projects`. This is what a colleague receives.
- **The author's instance**: about 50 entries in the synced folder: the same engines, project adapters (P), frozen adapters (H), other-domain skills (X) and stock Anthropic skills (S). No exact count is kept, because it goes stale every week. In the catalog below, types P/H/X/S are not part of the package and are shown as examples of what the 20% of adapters looks like.

## Anatomy of a PM skill (an engine)

```
---
name: daily-team-prep
description: >
  What it does. For which kind of projects. Triggers: "підготовка до міту", "team prep", "daily prep",
  "agenda for standup"... Also triggers as part of the 11:00 scheduled prep. When triggered, execute immediately.
---

# Name

## Project Config
Step 0 - always run first:
1. Determine the project from the request; if not named, ask (Default Project Rule).
2. Read ../projects/{slug}.md (fallback: Glob **/projects/{slug}.md).
3. All {config.xxx} values come from there.

## Data Sources
In parallel: Jira (JQL with {config.jira.project_key}), Slack ({config.slack.channels_all}),
Notion Meetings (last 3 days, action items), Sentry (quick check on {config.sentry.projects_in_scope}).

## Report Format
Result template (language, sections, what to write if a source is empty).

## Behavior
Parallelism, brevity, what to do when a source fails, scheduled vs manual differences.

## Report Storage
Notion Reports DB ({config.notion.reports_db}), properties: Report Name, Date, Type, Skill, Summary,
Workspace, Project; full text in the page body.
```

Three things separate a good skill from a bad one: an explicit Step 0 (project and config), explicit behavior when a source is empty or unavailable, and an explicit place to store the result.

## Catalog

Type legend: **E** = engine (core, project-agnostic, reads the registry), **P** = project adapter (bound to one project; this is normal, not debt), **H** = historical (frozen adapter, only on an explicit request), **X** = outside the PM system (personal/other domains; technically also adapters for other stacks), **S** = stock Anthropic.

### 1. Collectors (sources to Notion Threads)

| Skill | Type | What it does | Triggers | Schedule |
|---|---|---|---|---|
| `slack-collector` | E | The project's Slack channels for a period to the Threads DB with automatic status classification, a red icon, a 14-day review pass, gap analysis. Modes from the config (`slack_access`): `mcp` (the Claude connector), `mcp_local` (the PM's own local MCP server), `chrome` (reading the web UI, last resort), `none` | "collect Acme slack for the week", "collect slack" | daily 07:05 via `acme-daily-slack-sync` |
| `mac-mail-collector` | E | Reads the buffer `~/work/Mail/<account>/incoming/` (AppleScript + LaunchAgent export new incoming and sent mail from Mail.app every 15 min as JSON + EML, `fix_recipients.py` fills `to`/`cc` and `date_utc`), processes everything that sits in `incoming/`, filters out noise and calendar invites, routes by project (outgoing mail by recipients only), writes to Threads (sent mail with no reply gets the 📤 icon), moves items to `processed/` only after a successful write, reports the collector state | "check the mail", "process the mail" | daily 09:12 |
| `signal-desktop` | X | Reading/sending in Signal Desktop via computer use | "read signal" | on-demand |

> `gmail-collector` has been removed. All of the PM's work mailboxes are connected to Mail.app, so `mac-mail-collector` picks them up; the only account that remained on Gmail is connected directly over MCP and needs no collector. The email routing registry that lived in that skill's body has moved to the `email_routing` section of the project configs (see `03`).

**The limit on collectors: completeness, not convenience.** Principle 10 in `00` (all messages and meetings must be in Notion) works as a filter on acceptable collection modes, not as a wish. A collection mode is acceptable only when it produces a **complete** slice of the channel for the period, with message bodies and threads. Slack email notifications, partial browser reads of "the last 20 messages" and manual digests do not pass this bar and are not a "worse but acceptable" alternative: they are disqualified, because they create false confidence that the context has been collected.

The practical consequence for Slack, **resolved**: the Claude connector holds one authorization per account, but the second and every further workspace is connected through the PM's own read-only integration (an `xoxp` token) via the local MCP server `slack-mcp-server` in `claude_desktop_config.json`. Verified on our own company workspace: channel list, history, threads with comments. The token is read from `secrets.env` at startup and is not stored in the JSON. So `slack_access` has four values: `mcp` (the Claude connector), `mcp_local` (own server, Step 1B in `slack-collector`), `chrome` (fallback) and `none`. The full description, connection checklist and limits: the "Slack without a connector" page in the author's Knowledge Base (not part of the package).

### 2. Prep skills (before meetings)

| Skill | Type | What it does | Schedule |
|---|---|---|---|
| `daily-team-prep` | E | Compact prep for the internal sync: who is working on what, board movement, blockers, topics from Slack, outstanding action items, Sentry for the period, points for discussion. The window runs from the previous prep (if it is not older than 7 days) or from the last sync in the calendar; the sync time comes from the PM, then the calendar, then the config | weekdays 11:08 (before 12:00) |
| `client-meeting-prep` | E | Adaptive prep for the meeting types in the config (Planning, Status Sync, 1-1, Review): progress, blockers, risks, open questions, what to ask | Mon/Tue/Thu/Fri 16:0x before 17:00 |
| `jira-board-health` | E | Board hygiene: no labels, stale In Progress, Done without fixVersion, long-blocked, stuck statuses | Fri 16:02 together with review prep |

### 3. Reports and overviews

| Skill | Type | What it does | Schedule |
|---|---|---|---|
| `weekly-overview` | E | Monday overview of the past week across all projects: Jira throughput, meetings, threads, risks, open questions, outlook | Mon 08:09 |
| `client-report` | E | Client weekly/monthly/steering report in English: status 🟢🟡🔴, work done as outcomes, Tempo and hours against the cap, blockers, "Decisions Needed From You", optionally "Delivered beyond scope", outlook; Steering Update as a separate format (wave 2) | on-demand (docx) |
| `velocity-report` | E | Monthly metrics: throughput, cycle time, labels, load per person, trend vs the previous month, with the Metric Continuity annotation | 1st of the month 09:00 |
| `deploy-analysis` | E | Stage vs prod across the repositories from the config: stage release notes, the delta, what has not been promoted yet; local refs only | daily (`deploy-analysis-daily`) |
| `stability-scan` | E | Phase 1: Sentry unresolved + CloudWatch logs from disk to a digest with traces, an English report for the client, Jira tickets. Phase 2: `acme-debug` for deep RCA | Thu 22:10 |
| `daily-work-report` (scheduled prompt) | E | Daily work report in Ukrainian across all of our company: yesterday (calendar, meetings, threads, Jira, Slack) and the plan for today; in the Reports DB and locally | weekdays 09:01 |

### 4. Analytics and memory

| Skill | Type | What it does | Schedule |
|---|---|---|---|
| `notion-meeting-topics` | E | Turns a Notion meeting page into a detailed bilingual report (decisions, action items, topics) and appends it to the same page | on-demand: "meeting <url>" |
| `topic-manager` | E | Meetings + Threads (and Gmail when the config sets `gmail.client_search_filter`) for a period to created/updated Topics DB pages with a relation to the sources; on-demand and weekly mode in one skill (the merge of `topic-analyzer` + `weekly-topics-db-update`) | on-demand + Mon 06:32 |
| `risk-register` | E | RAID register: scans Jira/Slack/Meetings/Threads/Sentry and the early warning signals from `_standards.md`, groups them, creates/updates the Risks DB with `Kind` (Risk / Assumption / Issue / Dependency), generates two reports (Internal UA / External EN with "Decisions needed from you"). Card v0.7.1: Kind, the corrected title field name `Name`, signals and bus factor | Fri (before the review) |
| `change-request` | E | Every client wish goes into bucket A (trivial, logging only) / B (hours) / C (touches data, money, security, public contracts: always a CR); a per-project Extras Log including free work; a CR draft in English; the client's decision in Decisions; a goodwill budget (default 10% of the hours cap, to be calibrated) | on-demand + threads with Category Scope Change |
| `project-lifecycle` | E | Modes: kickoff (config, Notion anchors, Charter, first decision, tech start, config registration), handover-in (KT with evidence, baseline, undocumented promises), health-check (8 RAG areas with evidence), team-onboarding/offboarding, closure / transition to support | on-demand + monthly health check (the 2nd) |
| `client-satisfaction-tracker` | E | Client sentiment from Slack/Gmail/transcripts with cultural calibration (Culture Map, individual profiles, 4 signal levels, 6 cultural patterns) | 1st and 15th of the month |
| `thread-ticket-sync` | E | Two-phase: threads without tickets in the client's Notion, then turning selected threads into tasks (individual / consolidated) | on-demand |
| `inbox-responder` | E | Awaiting Reply threads to a category, context (Sentry, logs, Jira, Topics), a reply draft in the thread's language, Inbox Review | daily after the mail run |

### 5. Tracker and monitoring management

| Skill | Type | What it does |
|---|---|---|
| `jira-management` | E | Create/update/search/transition/label according to the rules from the config (taxonomy, transition IDs, epics, assignment rules) |
| `sentry-assistant` | E | Direct REST to the self-hosted Sentry: unresolved, details with the trace, search, status changes |
| `acme-jira-estimate-setter` | P | Bulk setting of originalEstimate by rules (bug-fix 4h, everything else timeSpent), via Chrome + Jira REST because of the Bug type limitation |
| `acme-notion-jira-sync` | P | Jira to CSV for import into the client's Notion DEV Board (fixVersion + active tickets, Work Dates from Tempo) |

### 6. Project engineering skills (Acme)

| Skill | Type | What it does |
|---|---|---|
| `acme-debug` | P | RCA of any bug: local KBs (components + SYSTEM.md + SDLC.md), the code on the branch deployed to the affected env, DB schemas, Sentry + CloudWatch, live APIs |
| `acme-db-assistant` | P | Knowledge of the platform's two database schemas (about 100 tables), SQL, data debugging |
| `acme-env-audit` | P | Audit of branches and envs on local git refs: dev/master drift, direct commits, unbackported hotfixes, twin commits; verdicts on deploy readiness; five verification laws |
| `acme-beneficiary-audit` | P | Three-way reconciliation of beneficiaries: two database exports against the card provider API (19k+ users), ACTION_PLAN.md in Ukrainian |
| `acme-beneficiary-transactions` | P | Chronology of a beneficiary's operations from all sources, the moment the balance went negative |
| `acme-core-code-review` | P | KB-driven code review of the core service (Java / Spring Boot): KB first, then only the files from the diff; LESSONS.md at the end |
| `acme-<component>-code-review` (three skills) | H | Frozen (the components moved to the client), only on an explicit request |

### 7. Other domains (showing how universal the engines are)

| Skill | Type | Domain |
|---|---|---|
| `beta-worklog-collect`, `beta-worklog-check` | X | Reconciliation of a partner team's logging on the Beta project: collecting files, checking totals, PTO, holidays |
| `<portal>-export` (two skills) | X | Exports from clinical-trial IRT/RTSM portals via Chrome + a Ukrainian comparison with the previous slice |
| `<lab>-order` (two skills) | X | Ordering a lab courier: a docx into the patient's folder + a draft email |
| personal skills | X | for example document formatting to the Ministry of Education requirements |

### 8. Stock and meta

`docx`, `xlsx`, `pptx`, `pdf` (document creation), `canvas-design`, `skill-creator` (creating, iterating and evaluating skills), `learn`, `morning`, `import-memory`, the `design` and `product-management` plugins (brainstorm, spec, roadmap, sprint planning, stakeholder update, metrics review), `finance`.

## Core vs adapters: what to rename and what not to

The review appendix dropped the idea of "de-Acme-ing everything": project skills are a normal adapter pattern for someone else's stack. Renaming only makes sense where a genuinely universal engine is hiding under the `acme-` prefix and the project facts can be moved into the config:

| Skill today | What is universal in it | What should move to the config | Proposed name |
|---|---|---|---|
| `acme-env-audit` | audit of branch/env drift, the five verification laws, its own `audit.sh` inside the skill folder | the branch-to-env map, author aliases, deliberate divergences (`references/acme-map.md`) | `env-audit` |
| `acme-jira-estimate-setter` | bulk setting of estimates by rules | the rules (bug-fix 4h, everything else timeSpent), the Bug type workaround | no rename needed: after v0.3 this is a correct adapter |
| `acme-branch-review` (scheduled) | reacting to `REVIEW:` in a channel, thread review | the channel, the review skill | `branch-review` with the review channel in the config |
| `acme-daily-slack-sync` (scheduled) | daily ingest + review pass | the project | **Done**: the cloud Routine `Acme daily Slack sync`, the prompt only supplies the project and the period |

Adapters that stay project-specific forever: `acme-beneficiary-audit`, `acme-beneficiary-transactions`, `acme-db-assistant`, `acme-debug` with its KB, `acme-notion-jira-sync` (the client's Notion), `<portal>-export` (portals without an API), `<lab>-order`. At a new client their own equivalents will appear in their place: a parser for a manual CSV from Linear, browser collection from Trello, reconciliation of their exports. The rename of the two engines (`env-audit`, `branch-review`) is deferred: until the scenario repeats on a second project, the adapters stay project-specific.

### The graceful degradation rule for engines
Every engine that reads the tracker must, after Step 0, check `{config.task_tracker.api_access}`:
- `true`: the normal path over MCP/REST with `project = {config.task_tracker.project_key}`.
- `false`: switch without an error to `{config.task_tracker.fallback_source}`: `manual_export` (the latest file in `~/work/<slug>/exports/`), `meeting_action_items` (action items from the Meetings DB for the period), `email_summaries` (Threads DB for the period). Mark it explicitly in the report: "Task source: manual export from <date>", so the reader understands how fresh it is.
- The same applies to Sentry (`url: none`), repositories (`none`), Slack (empty `channels_all`): the source is skipped with a single line in the report, and the rest of the report is generated.

## The life cycle of a skill

### Creation ("without Skills 101")
1. **The idea is born out of routine.** You catch a repeating "I am asking Claude the same thing again" and record it as a skill. Do not read the documentation up front.
2. **Debug right in the chat.** You run it, spot the flaw, say "fix this", and Claude edits SKILL.md itself.
3. **README-as-you-go.** Documentation is written during the work, not after. The skill's page in Notion (under Claude Skills & Prompts) is created right away.
4. The meta-skill `skill-creator` for evals and description optimization, once the skill is stable and the triggers need improving.

### Quality rules
- Description up to 1024 characters, triggers in two languages, and at the end "When triggered, execute immediately" for skills that need no confirmation.
- Project facts only in the config (Naming Convention).
- No silent project defaults.
- Explicit behavior when a source is unavailable: note it briefly and move on.
- For a skill that works with repositories: never `git fetch/pull` in the cloud (the corporate proxy blocks it), local refs only.
- Date-stamped facts ("VERIFIED 2026-08-17") are re-checked every 90 days.

### Renaming and deprecation
A skill is not deleted, it becomes a tombstone: the description starts with "DEPRECATED <date> - RENAMED to <new>", and the body says to do nothing and report the rename. Examples: `beneficiary-audit` to `acme-beneficiary-audit`, `jira-server-management` to `jira-management`, `acme-slack-collector` to `slack-collector`. Tombstones are deleted manually in Settings → Skills whenever convenient (all five have been deleted).

> **Lesson.** Renaming costs more than it seems. When `acme-slack-collector` became `slack-collector`, the project specifics were supposed to move into the config but did not: `acme.md` had neither the channel IDs, nor `permalink_base`, nor `json_output_folder`, nor `slack_access`, even though the skill referenced all four. The skill substituted emptiness and said nothing. In parallel, the scheduled task prompt kept calling the old name. Hence two rules: (1) renaming an engine is not finished until every `{config.xxx}` from its body is found in the config; (2) when renaming, ALL scheduled task prompts are checked for the old name.

Frozen skills (the component went to the client) get "OUT OF SCOPE since <date>: HISTORICAL REFERENCE ONLY. Trigger ONLY when the user explicitly asks" in the description. This keeps the knowledge about the codebase while preventing the skill from firing proactively.

### Audit
The monthly cloud Automation Health Check compares every one of our skills against the configs: contradictions with the facts, references to non-existent paths/tools, hardcoded values, expired date-stamped facts, frozen skills with proactive triggers, naming violations, silent defaults, overlong descriptions. The report goes to the Reports DB with a "skill | discrepancy | severity | what to fix" table.

### Installation and sync
- Cowork: Settings → Cowork → Skills → Upload skill (a folder or a `.skill` zip).
- After changing SKILL.md on disk: upload again or edit through Cowork; cloud sessions see the synced copy.
- Local `.skill` archives are kept in `~/work/Skills/` and `~/work/<project>/` as a backup.

## Knowledge bases for the engineering skills

Code review and RCA do not work across the whole repo, they go through local knowledge bases: `SYSTEM.md` (how the system is built), `SDLC.md` (branches, envs, deploys), per-component KBs, `LESSONS.md` with dated lessons after every review. The skill reads the KB, then only the files from the diff. This keeps tokens under control and accumulates institutional memory about the codebase. For a new project the KB is created once (the most expensive operation) and extended from there.

## Which skills do not exist yet (for the function matrix in `06-pm-functions-coverage.md`)

Retro facilitation, sprint planning for Scrum projects (there is only the plugin `sprint-planning`), an estimation document, project budget and margin in money, automatic publishing to Confluence (there is a connector and 5 planned use cases, but no skills yet). Covered by cards: change request (`change-request`), onboarding a new team member and the stakeholder map (`project-lifecycle` + the stakeholder columns in the config).

## Cross-cutting rules: one block instead of a copy in every skill

Rules that must apply across all skills at once live in `projects/SKILL.md` rather than being duplicated in skill bodies. Skills read that file at Step 0, since they already reference it because of the Default Project Rule.

| Rule | What it does | Added |
|---|---|---|
| Rule Zero | the config beats the skill text | v0.1 |
| Default Project Rule | never guess the project | v0.1 |
| Graceful degradation | `api_access: false` does not break the skill | v0.3 |
| **JQL Isolation Validator** | no tracker query goes out without `project = {key}`; if the key is not in the config, hard stop | v0.6.0 |
| **Data Completeness header** | every report starts with a line on the state of each source; `EMPTY` and `FAILED` are never merged into one | v0.6.0 |
| **PM standards and PM Profile** | reports, preps, metrics, risks and decisions follow `projects/_standards.md` and the `PM Profile` section of the config: the reader rule with a mandatory "Decisions needed" section, the metrics profile, agendas by key, RAID via `Kind`, the decision standard | v0.7.0 |
| **The 5-minute rule** | a write to an external system without confirmation is allowed only when the effect can be undone within 5 minutes (a page, a row, a backlog ticket, a draft); messages to the client, production changes, transitions to Done, deletions and the client's board need approval | v1.1 |
| **Document templates** | every document has a key; before composing, a skill looks for a template at the project level, then house (`_templates.md`), then uses its built-in format; a template never changes the invariants, and `Template` is shown in the Data Completeness header (`15`) | v1.2 |

> **Lesson.** The rules turned out not to be in the live `projects/SKILL.md`, even though the documents described them as being in force: the card was either not saved or was overwritten by the next save. Restored in the v0.7.0 package. Conclusion: the state of a cross-cutting rule is verified by grepping the synced copy (`~/.claude/skills/synced/.../projects/SKILL.md`), not by the documentation.

The reason for this construction is simple: a cross-cutting rule copied into ten skills diverges after the first edit to any one of them. A copy in each skill is acceptable only when the rule really does differ between skills.

**Consequence for the library revision:** during a pass over the skills, every engine must get an explicit reference to these two rules in its Step 0. A skill that sends an unscoped JQL or prints a report without the completeness line counts as outdated, and the monthly Automation Health Check now catches this with a dedicated check.
