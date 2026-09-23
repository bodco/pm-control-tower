# 08. New project: the flow from the first call to autopilot

## Incoming situations

The flow is the same in all three cases, only the first steps differ:

| Case | Distinctive feature | What is added |
|---|---|---|
| **A. New project from scratch** (kickoff with the client) | No history, the stack is still being chosen | More time for Phase 1 (intake), the Decisions DB starts with "project started, scope =..." |
| **B. Taking over an existing project** (from another PM or team) | There is history, there are someone else's artifacts, there are agreements nobody wrote down | A one-off migration of history into Notion (meetings, threads, decisions), the KT/Handover Checklist from the PM Toolkit, the trust but verify principle |
| **C. A non-development project** (clinical trials, operational tasks) | No Jira/Sentry/repos, but there is email, documents, external portals | A config with "none" in most sections, domain-specific skills instead of engineering ones |

Total time to a stable autopilot: 2 weeks. Day one gives you a minimally working loop (Notion + config + one skill), after that you build up.

## Phase 0. The "should we plug this in" decision (30 min)

Questions worth asking before you start:
1. How many communication channels are there and what is their volume? (If it is one Slack channel with 5 messages a week, you do not need a collector, weekly-overview is enough.)
2. Are there regular meetings with the client? (This determines which prep tasks to create.)
3. Which systems have an API or MCP, and what is available only through a browser or files? Separately and honestly: will the client's security team give an API token to an agent? In outsourcing the answer is often "no" (SSO, Okta, MDM). In that case plan for `task_tracker.api_access: false` from day one, plus a fallback: manual CSV export into `~/work/<slug>/exports/`, action items from Meeting Notes, email. This is not a blocker for the framework, it is a different mode.
4. Is there engineering responsibility (repos, deploys, monitoring)? If not, the whole block of 7-8 functions drops out.
5. Will this project run alongside others in the same Control Tower? (Yes by default: shared databases, separate relations.)
6. The Pre-start Checklist from the PM Toolkit (the human part, before decisions on scope and team): contract type, budget and margin are clear; the SOW / contract has been read word for word; all accesses have been requested; stakeholders on both sides are known; team roster with allocations and PTO; delivery approach chosen (Scrum / Kanban / hybrid). Case A: presale estimates checked for realism (the number comes from the person doing the work, not from AI). Case B: KT sessions scheduled, an inventory of artifacts collected.

Result: a list of the sources you are plugging in, a list of the functions from `06-pm-functions-coverage.md` that you need, and the Pre-start answers, which go into the PM Profile.

## Phase 1. Intake: gather the facts for the config (day 1, 2-3 h)

Fill in `projects/_template.md` → `projects/<slug>.md`. Section order by importance:

1. **General**: name, slug (Latin letters, short, it will be the prefix for skills), status active, board type, languages.
2. **Access Matrix**: every resource a skill might need, with a date and the state of access. If there is no access, write exactly that: it stops skills from trying to reach in there.
3. **Team**: our team with Jira usernames, roles for reports, availability; the client team with roles and Stakeholder Register columns (Influence, Interest, Channel, Cadence, Notes: whose silence is normal); emails for both sides; Transcript Alias Map (filled in after the first transcripts).
4. **Meetings Schedule**: day, time, type, **Agenda** (a key from `_standards.md` section 5, for example `client_status_sync`), the ID suffix of the future scheduled tasks, focus. Non-standard cadence goes in as plain text.
5. **Task Tracker**: type, `api_access`, `fallback_source`, `export_path`, `browser_access`. If `api_access: true` and it is Jira: URL, key, connectors, labels (you can start with the standard 5), transition IDs (via `getAvailableStatuses` or `get_transitions`), epics, assignment rules. If `false`: agree with yourself on a rhythm for the manual export (for example every Monday and before every client meeting) and record it in the Meetings Schedule as a prep step.
6. **Slack**: workspace, channels (dev, stability, all of them).
7. **Sentry / monitoring**: URL, token, scope, or "none".
8. **Local Paths**: create `~/work/<slug>/` with subfolders as needed: `AWS Logs/`, `Time Reports/`, `repos/`, `Acme Documentation/_ for AI-assisted work/` (KB), `presentment/` or other data. Anything that does not exist is "none".
9. **Deploy Config**: repos, branches, windows, or "none".
10. **Gmail filter**: the client's addresses, or "none".
11. **Engagement Status**: model, team size, QA, scope, end date. Metric Continuity: if there is a gap (a handover from another team), record the date and the reason.
12. **Cultural Profile**: the client's country, the reference profile from the skill, individual notes after the first contacts.
13. **PM Profile**: case A/B/C, phase, approach, `metrics_profile`, WIP limit, contract (type, monthly hours cap, budget, billing, period), SLA, milestones, `decision_rights` (a short RACI). Unknown = "to be clarified", not invented.
14. **Changelog**: the first line "config created".

For case B: the Access Matrix and Engagement Status are filled in with particular care, with lines saying "as of <handover date>" and "unknown, to be clarified" wherever the previous PM did not give an answer.

## Phase 2. Notion: anchor pages and memory (day 1, 1 h)

> **Do not do this by hand.** Items 1-4, 6 and 7 are done by `project-lifecycle` in `kickoff` mode (K3): pages, relations, the first decision, IDs in the config. The PM only switches on AI Meeting Notes (item 8) and clicks the "New project" template if the tool did not apply it. Step by step with prompts: `16`.

1. **Projects DB**: create the project page from the database's "New project" template (5 built-in views filtered by project), fill in Status, Start date, Workspace. Copy the ID into the config as `notion.project_page_id`.
2. **Workspaces DB**: if this is a new client/company, create a page; the ID goes into `workspace_page_id`. If it is the same client, use the existing one.
3. **Decisions DB**: the first line "Project <name> started, scope =..., team =..., model =...", Area = Scope, Source = the kickoff meeting or the SOW.
4. **Current State**: a page under the project page with the first manual distillation (5-10 lines: what is happening, open questions, the nearest dates). Add its ID to the `daily-current-state-distillation` prompt.
5. **Knowledge Base**: a project folder (even an empty one) for documentation, the SOW, contacts.
6. **Project Charter**: a copy of the PM Toolkit template under the project page, filled in from the config (contract, scope, milestones, team, stakeholders, risks, communication). The ID goes into `pm_profile.documents.charter_page_id`. The Decision Log, RAID, Stakeholder Register and RACI are NOT duplicated as separate pages: they are the Decisions DB, the Risks DB (Kind) and the config.
7. **Relation**: `Project` and `Workspace` in every database, cross-relation without emoji. If the live schema differs, Notion is right and the template gets fixed the same day.
8. **Meetings**: make sure Notion AI Meeting Notes is enabled for the project's calendar events and that the meeting name contains a recognizable suffix (e.g. "<Client> Weekly Sync").

For case B, a one-off migration of history (the most expensive operation, done once):
- Old transcripts/notes → Meetings DB (import or links) with a relation to the project.
- Key threads from the last 1-3 months → `slack-collector` for that period; email comes in through `mac-mail-collector` once the addresses are added to `email_routing`.
- Decisions: run `topic-manager` over the quarter, then pull the decisions into Decisions (Gemini `notion-project-brief` with its large context is most useful here, or a Monthly Memory Digest done manually for the past months).

## Phase 3. Registration in Claude's brain (day 1, 30 min)

1. Register the config in the `projects` skill. In the plugin: put `<slug>.md` into `plugin/skills/projects/` next to `_template.md`, add a row to the Files table in SKILL.md and reinstall the plugin. In the standalone variant a new file inside a skill cannot be added as a card (a card replaces only SKILL.md), so Claude assembles `projects.skill` from the current synced copy + the new config + a row in the Files table, and the PM uploads it via Settings → Skills → Upload. In both cases check that a new session sees `projects/<slug>.md` (Glob) and that the other configs did not get lost.
2. Add a row to the "Projects" table in the Cowork global instructions ("PM Workspace"): name, slug, path to the config. This is the single place for the project list; a duplicate of that table in Claude's personal preferences goes stale first, so it is better to remove it.
3. Optional: a Project on claude.ai for chat and mobile. The instructions hold only the name, the slug, "source of truth = `projects/<slug>.md` and the Notion Control Tower" and the language rules; the knowledge holds only static documents (SOW, contract, specifications). Nothing about state (team, meetings, accesses, statuses): otherwise it becomes a fourth place that will go stale (principle 13).
4. Fill in the `email_routing` section in the new project's config: `client_emails`, `team_emails`, ignore rules. Nothing else needs updating, the collector reads the configs and works out the shared addresses itself.
5. Claude's memory: one sentence about the new project and its specifics (the client's language, cultural specifics), if it changes behavior.
6. Default Project Rule check: ask Claude "prep me for the daily" without naming a project, it should list all active projects and ask.

## Phase 4. Local data and knowledge bases (days 2-5, depending on engineering scope)

Only if there is engineering responsibility:
1. Clone the repositories into `~/work/<slug>/repos/`. Agree with yourself that fetch is done manually; skills work with local refs.
2. Create the KB: `SYSTEM.md` (components, flows, integrations), `SDLC.md` (branches, envs, deploy windows, who approves), a KB per component (for code review), an empty `LESSONS.md`. The first version is produced by Claude from the code in 1-2 sessions, then extended.
3. DB schema: if you have access, export the schema and build an equivalent of `acme-db-assistant` (a project skill `<slug>-db-assistant`).
4. Set up log export into `AWS Logs/` (manual or a script) and Tempo into `Time Reports/`.
5. A Sentry token with project:read, event:read rights.

For case C: instead of a KB, a folder of documents (SOW, regulations, contacts) and, if needed, browser skills for external portals (modeled on `<portal>-export`).

## Phase 4b. Project adapters (when routine appears, usually weeks 2-4)

By the 80/20 principle, every project will grow its own 20%: a parser for a manual CSV from the client's tracker, a browser skill for a portal with no API (modeled on `<portal>-export`), a reconciliation of specific data (modeled on `acme-beneficiary-audit`), a codebase KB. The rules: the `<slug>-` prefix, project facts in the config, a README in Notion under Claude Skills & Prompts. Do not try to turn an adapter into an engine until the same scenario has shown up on a second project.

## Phase 5. The first skill by hand (day 2)

Do not turn on autopilot until the skills have been run in manually on this project:
1. "collect slack <Project> for last week" → check Threads: correct relations, statuses, icons.
2. "prep me for <meeting type> <Project>" → check the prep: names, channels, links. On a project with no API: check that the skill picked up the latest export from `exports/` and wrote down its date instead of failing on a missing Jira MCP.
3. "weekly overview <Project>" → check that the report lands in the Reports DB with the correct Project/Workspace.
4. Every flaw you find is either a config fix (more often), or a skill fix (if it really is an engine bug, it will affect all projects, so fix it carefully).

## Phase 6. Autopilot (end of week 1)

Create scheduled tasks with IDs taken from the config (Meetings Schedule → ID Suffix). The minimum set:

| Order | Task | Schedule | Prompt (abbreviated) |
|---|---|---|---|
| 1 | `<slug>-daily-slack-sync` | daily 07:0x | slack-collector for yesterday for <Project>, auto-classify, 14-day review |
| 2 | `daily-team-prep` (shared, if there is one internal sync) or `<slug>-team-prep` | working days, 55 min before the sync | daily-team-prep for <Project> |
| 3 | prep tasks for each client meeting | 55 min before each one | client-meeting-prep type <X> for <Project> |
| 4 | `weekly-overview` (shared across all projects) | Mon 08:0x | already exists, picks up the new project automatically |
| 5 | `daily-process-mail` (shared) | daily | mac-mail-collector + inbox-responder; add the project to the prompt |

The second wave (week 2), if there is engineering scope: `stability-scan` (once a week in the evening), `deploy-analysis-daily`, `friday-review-prep` with board health, `<slug>-branch-review` if needed. The third wave (month 1): `risk-register` before the review, `client-satisfaction` on the 1st/15th, `monthly-velocity`.

The cloud audits (Automation Health Check, Monthly Memory Digest) pick up the project automatically, because they iterate over all active configs.

## Phase 7. Calibration (weeks 2-4)

- 5 minutes every day: are the reports telling the truth? Odd names, extra components, the wrong cadence = a config fix the same day + a Changelog entry.
- The Transcript Alias Map fills up from the first transcripts.
- The Cultural Profile gets individual observations added after 3-4 meetings.
- The first project skills come out of real routine (for example a weekly data reconciliation, a specific client report).
- After the first Automation Health Check: close every finding on the new project.
- Project Health Check: for case B on day 10 after the handover, then monthly and automatically (the 2nd of the month, a cloud task).
- For case B, the PM Toolkit page on the first month on a project runs in parallel (the human part of taking over: stakeholders, trust, a technical start with the team).

## Phase 8. Optional: a second agent (once history has accumulated)

Plugging in Gemini and the `.ai/` protocol makes sense when: a) Notion holds more than a few months of meetings and threads that Claude cannot re-read in one go; b) the project has regular engineering tasks with briefs; c) you need an independent QA of decisions against what was agreed. The launch checklist is in `09-gemini-optional-layer.md`: the `.ai/` structure, gitignore, Decisions DB, a first small task.

## Phase 9. Steady life and closure

- Any change of state: config + Changelog + Decisions the same day.
- People who left go into Former Members with a date. Accesses that disappeared go into the Access Matrix with a date.
- Closing a project (`project-lifecycle` closure): `status: archived` in the config; a final Monthly Memory Digest as the handover document; the KT/Handover Checklist from the PM Toolkit; `.ai/` is archived; scheduled tasks are disabled (not deleted, so the prompts survive).

## Checklist (short version for printing)

```
[ ] Phase 0: list of sources and needed functions; Pre-start Checklist done
[ ] Phase 1: projects/<slug>.md filled in (General, Access, Team with stakeholders, Meetings with Agenda, task_tracker with api_access, tracker, channels, monitoring, paths, deploy, email routing, engagement, culture, PM Profile, changelog)
[ ] Phase 2: Projects page (New project template), Workspace page, first Decision, Current State, Charter, KB folder, Meeting Notes enabled
[ ] Phase 2B (handover): history migration (meetings, threads, decisions)
[ ] Phase 3: config registered (plugin or projects.skill), row in the global instructions, email routing, (optional) Claude Project, Default Project Rule check
[ ] Phase 4: ~/work/<slug>/ structure, repos, KB (SYSTEM, SDLC, components, LESSONS), DB schema, logs, Tempo
[ ] Phase 4b: first project adapters as needed (<slug>- prefix, README in Notion)
[ ] Phase 5: three skills run by hand with no errors (in no-API mode: with a fallback and the export date)
[ ] Phase 6: minimal autopilot (sync, team prep, client preps, weekly, mail)
[ ] Phase 7: calibration over 2-4 weeks, alias map, cultural profile, first health check closed
[ ] Phase 8: (optional) .ai/ + Gemini
[ ] Phase 9: discipline around changes; a closure plan
```

## What it costs

An estimate from the experience of Acme and three smaller projects: day 1, 4-5 hours of the PM's time; week 1, another 4-6 hours on the KB and manual runs (if there is code); weeks 2-4, 15 minutes a day on calibration. It pays off from the second week, when prep and sync are already doing the work themselves.
