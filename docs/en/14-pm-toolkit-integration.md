# 14. PM Toolkit in Control Tower: standards for all projects and for the whole life of a project

> All parts are saved in the live system: `projects.skill` v0.7.2 uploaded, the `project-lifecycle`, `change-request`, `risk-register`, `client-report` cards saved, the synced copies verified byte-for-byte against the drafts. None of the new skills has had a real run on a project yet: the first scheduled health check run is 2026-10-02.

## 1. The decision and why

Bohdan approved the direction: the PM Toolkit in Notion stops being only a library for a human and becomes the standard that skills follow on all projects.

The state before this day:
- The Toolkit physically lived in Control Tower (Knowledge Base / Project Management / PM Toolkit), but no skill referenced it: a search across the synced skills found neither the IDs of its pages, nor Charter, RAID or Stakeholder Register, nor a "decisions from the reader" section in the reports.
- The config had no fields for its artifacts: contract, hours cap, SLA, decision rights, stakeholders.
- `06-pm-functions-coverage.md` described the gap five times as "there is a template in the PM Toolkit, done manually" (domains 2, 4, 11, 17, 21).

The point of the decision: the methodology a PM already knows (metrics, agendas, RAID, Change Request, KT, health check) should work the same way on every project, without the PM having to recall and duplicate templates each time. Skills take the standard from one place, and a project refines it in its own config.

## 2. Architecture: three layers

| Layer | Where | What it holds | Who edits it |
|---|---|---|---|
| Standards, the same for all projects | `projects/_standards.md` | the metrics catalog with 🚩 thresholds, profiles by phase, cadence, meeting agendas with keys, the reader rule for reports, the minimum set of documents per case A/B/C, early warning signals, RAID, the decision standard, the estimation rule | Claude with approval, during an optimization run |
| Project profile (state) | the `PM Profile` section in `projects/<slug>.md` + stakeholder columns in `Team - Client` + the `Agenda` key in the Meetings Schedule | case, phase, approach, metrics_profile, WIP limit, contract and hours cap, goodwill budget, SLA, milestones, decision rights (a short RACI), document IDs (Charter, KT, Extras Log), the date of the last health check | the PM, the same day something changes (Rule Zero) |
| Methodology ("why") | the Notion PM Toolkit | explanations, senior practices, full templates for the manual case | the PM |

Precedence: the project config > `_standards.md` > the Toolkit in Notion. If the Toolkit and `_standards.md` have diverged, `_standards.md` is the authority for skills, and the discrepancy is fixed in one of the two places the same day. Every Toolkit page that has a machine version or has been replaced by a database carries a blue callout with a link; the Toolkit root has a "where everything lives" table.

The cross-cutting rules that apply to all engines live in `projects/SKILL.md` (see `04`, "Cross-cutting rules"): Rule Zero, Default Project Rule, graceful degradation, JQL Isolation Validator, Data Completeness header and, since 0.7.0, "PM standards and PM Profile" (seven rules: the reader rule, metrics by profile, prep by agenda, Risks DB = RAID, a full decision record, stakeholders from the config, the estimate comes from the person who does the work).

## 3. The PM Toolkit across the stages of a project

The main idea: the Toolkit works not as a set of "for the start" templates, but as support across the whole life of a project. At each stage it is visible what the system takes on and what stays with the PM.

| Stage | What from the Toolkit | What the system does | What the PM does |
|---|---|---|---|
| **0. Pre-start** (before the official start) | Pre-start Checklist | `project-lifecycle` kickoff runs an interview through the checklist (contract and margin, SOW verbatim, access, stakeholders, roster with PTO, delivery approach) and puts the answers into the PM Profile | answers the questions, checks the pre-sales estimates with the people who will do the work |
| **1. Kickoff** (day 1) | Charter, Stakeholder Register, RACI, Decision Log | a draft config from the template, the Workspace and the project page in Notion, Current State, the Charter from the config, the first row in Decisions, local folders, the `projects.skill` package, an autopilot proposal | proofreads the config, uploads the package, approves the scheduled tasks |
| **2. Technical start** (weeks 1-2, if there is development) | "Technical start with the development team" | unknown NFRs become `Kind = Assumption` records with a check date; candidates for one-way decisions become PM tasks; "architecture on a napkin" tasks and spikes | organizes expert attention on the 3-5 load-bearing decisions, records them in Decisions with `Door = One-way` |
| **3. Steady life: day** | the daily and client sync agendas, work item age | prep by the `Agenda` key, always with a "decisions we need to get" block; stuck items by the metrics profile | runs meetings through to decisions, unblocks |
| **3. Steady life: week** | flow and quality metrics, RAID, early warning signals | `weekly-overview`, `jira-board-health`, `risk-register` keeps the whole RAID (risks, assumptions, issues, dependencies), client and team signals with quotes, bus factor | reads, decides priorities, escalates |
| **3. Steady life: month** | Client Monthly, Steering / Exec Update, the metrics dashboard, Health Check | the 1st: Monthly Digest, Client Satisfaction, Skill Health Check; the 2nd: **Project Health Check** for every active project (8 RAG areas with evidence, ⚪ where there is no data); `client-report` monthly and steering with hours against the cap and "Decisions Needed From You" | proofreads and sends the reports manually, closes the top 3 from the health check |
| **4. Scope changes** (event-driven) | Change Request, "Scope creep and the game of small asks" | `change-request`: every request into bucket A (trivial, logged) / B (hours) / C (touches data, money, security, public contracts: always a CR); an Extras Log including free work; a CR draft in English; the goodwill budget | decides whether to take it on, sends the CR, records the client's decision |
| **5. People** (event-driven) | Team Member Onboarding, Bus factor | `project-lifecycle` team-onboarding / offboarding: an onboarding page with access listed as requests, a config patch, a row in Decisions, a bus factor check when someone leaves | arranges access, assigns a buddy, talks to people |
| **6. Taking over a project** (case B) | KT / Handover Checklist | `project-lifecycle` handover-in: KT with evidence, a list of undocumented verbal promises with quotes, a written "state at the moment of takeover", a health check on day 10 | runs the KT sessions, checks that "everything is green" |
| **7. Transition to support or closure** | "Project closure: from day one to handover" | `project-lifecycle` closure: a checklist with evidence (acceptance, loose ends, access, finances), a handover pack, a config patch (`phase: support` or `status: archived`), a list of scheduled tasks to switch off | final conversations, financial closeout, renewal |

What deliberately stays human at every stage: the sandwich between the client, the company and the team, domain literacy, relationships, any judgment about people. Skills highlight facts with quotes, the PM draws the conclusion. Prep for a 1-on-1 does not analyze a person's mood.

## 4. Mapping the Toolkit onto the system

| Toolkit | Where it lives | Used by |
|---|---|---|
| Metrics dashboard | `_standards.md` sections 2-4, `pm_profile.metrics_profile` | `velocity-report`, `jira-board-health`, `weekly-overview`, `daily-team-prep`, `project-lifecycle` health-check |
| The `sla_adherence`, `hours_burn` metrics (new, they were not in the Toolkit) | `_standards.md` section 2, `pm_profile.sla`, `pm_profile.contract.hours_cap_month` | `client-report`, `project-lifecycle` health-check |
| Meetings: cadences and agendas | `_standards.md` section 5, the `Agenda` column | `client-meeting-prep`, `daily-team-prep` |
| Report templates | the reader rule (`_standards.md` section 1) | `client-report` (weekly, monthly, steering), `weekly-overview`, `risk-register` External |
| Decision Log | Decisions DB + `Trade-off`, `Review trigger`, `Door` | all skills, Monthly Memory Digest, `change-request` |
| RAID Log | Risks DB + `Kind` (Risk / Assumption / Issue / Dependency) | `risk-register`, `project-lifecycle` |
| Stakeholder Register | `Team - Client`: Influence, Interest, Channel, Cadence, Notes | `client-satisfaction-tracker`, `risk-register`, the prep skills |
| RACI | `pm_profile.decision_rights` | the prep skills, `change-request`, `client-report` |
| Project Charter | a page under the project page, from the config | `project-lifecycle` kickoff |
| Pre-start Checklist | Phase 0 in `08`, K1 in `project-lifecycle` | `project-lifecycle` kickoff |
| KT / Handover, Health Check, Team Onboarding, Closure | the `project-lifecycle` modes | the PM on request; health check monthly on schedule |
| Change Request, Scope creep | `change-request`, the Extras Log under the project page | the PM, threads with Category `Scope Change` from `inbox-responder` |
| Technical start | kickoff mode (K4) | `project-lifecycle` |
| Senior practices | early warning signals and bus factor in `_standards.md` section 7; no-surprises in the reader rule | `risk-register`, `client-satisfaction-tracker`, `inbox-responder` |

## 5. What has been done
### Wave 1 (0.7.0): standards and schema
- `projects.skill` v0.7.0: the new `_standards.md`; `_template.md` with the PM Profile, stakeholder columns, `Agenda`, the full list of shared databases and unified relation names; `SKILL.md` with the "PM standards and PM Profile" rules and the restored JQL Isolation Validator and Data Completeness header; the PM Profile in `acme.md` with only the facts from the config itself.
- Notion: Decisions DB + `Trade-off`, `Review trigger`, `Door`; Risks DB + `Kind`; callouts on 8 Toolkit pages, a "where everything lives" table at its root.
- Documents: this file, `08` (Pre-start, PM Profile, Charter, registration via Upload, Claude Projects), `02` brought in line with the live schemas, `03`, `04`, `06`, `12`, the `prompts/new-project-onboarding.md` prompt.

### Wave 2 (0.7.1): the engines
- New skills `project-lifecycle` (kickoff, handover-in, health-check, team-onboarding / offboarding, closure) and `change-request` (buckets A/B/C, Extras Log, CR, the decision in Decisions, the goodwill budget).
- Updated `risk-register` (RAID through `Kind`, early warning signals, bus factor, "Decisions needed from you", Assumptions and Dependencies are not closed silently, the corrected title property name `Name`) and `client-report` (Steering Update, status and "Decisions Needed From You" in all formats, hours against the cap, "Delivered beyond scope", the locked template rule, a project fact removed from the engine body).

### Finishing it off (0.7.2): cadence and registry
- Health check **monthly, not quarterly** (Bohdan's decision): the cloud task "Project Health Check (monthly)", the 2nd of the month at 05:30 UTC, automatic approval, one page per project in the Reports DB. `_standards.md` and `project-lifecycle` updated for the monthly cadence.
- `projects.skill` v0.7.2: the `goodwill_budget_pct` and `extras_log_page_id` fields in the template; Gamma `status: archived` (the project is effectively finished, a row in the Decisions DB); in `acme.md` only what the PM confirmed was corrected (DevOps hours under the new contract, the hours cap).

New select values are created by the skills on first write (Notion creates the option automatically, as already happened with `Monthly Digest` and `Skill Health Check`): Reports `Type` = `Project Kickoff`, `Project Handover`, `Project Health Check`, `Team Change`, `Project Closure`, `Change Request`, `Steering Update`; Reports `Skill` and Tasks Tracker `Source` = `project-lifecycle`, `change-request`.

## 6. Findings and lessons

1. **The documentation said a rule was in force, but it was not in the live skill.** The JQL Isolation Validator and the Data Completeness header from version 0.6.1 were missing from the synced `projects/SKILL.md`: either the card did not save, or a later save overwrote it. Restored in 0.7.0. Lesson: the state of a skill is checked by grepping the synced copy, not by reading the documentation; after every save, verify byte-for-byte.
2. **A template goes stale unnoticed.** `_template.md` still described the divergent relation names two days after the database had been unified. A new project created from such a template would have silently failed to write the relation. The template now points to the live schema as the authority.
3. **An engine must not know project facts.** `client-report` had the date and the size of the Acme team in its body, `risk-register` wrote into a non-existent `Risk Name` property. Both were fixed; the Skill Health Check catches this class of error (item f).
4. **Shared work stays shared.** When a framework is being built, project-specific discrepancies (contracts, people's hours) are not sorted out along the way: they go into their own project context. Recorded as a rule for working with Bohdan.
5. **A library without wiring is dead.** The Toolkit lived next to the system for a year and did not influence a single report. Value appeared when the standard got one machine-readable place and the rule "the engines read it at Step 0".

## 7. Known limitations

- The new skills have not been run in on a real project yet. The first scheduled health check run is 2026-10-02; `change-request` and the `project-lifecycle` modes are launched on request.
- Thresholds marked `(calibrate)` were operationalized by Claude from the qualitative wording in the Toolkit. They will be verified against the first real reports.
- In a cloud run without the bridge to the Mac, Tempo and the local Jira connectors are unavailable: the corresponding health check areas become SKIPPED or ⚪, which is visible in the report.
- The engines pick up the cross-cutting rules through the reference to `projects/SKILL.md` in Step 0; an explicit reference to `_standards.md` in the body of each older engine will appear during the library revision (backlog in the README).
- The PM Profile, the stakeholder columns and `Agenda` are only partially filled in in the active configs; while they are missing, skills work on defaults and write `PM Profile: SKIPPED`.

## 8. Next

| Wave | What | Closes |
|---|---|---|
| 3 | metric thresholds in `velocity-report` and `jira-board-health` by profile; `sla_adherence` and `lead_time`; `hours_burn` in the monthly report; explicit reading of `_standards.md` in `client-meeting-prep` and `daily-team-prep` (agendas) | 06 #11, at minimum #21 |
| after the first run | calibration of the thresholds against the first health check and risk-register; a decision on whether `Kind` is needed in the external risk report | - |

## 9. What we do not do

- We do not copy Toolkit texts into the bodies of skills (principle 6: engines separate from facts, cross-cutting rules in one place).
- We do not create per-project RAID and Decision Log pages: databases with relations do this better and give a cross-project view.
- We do not automate judgment: the sandwich, domain literacy, relationships. A skill highlights a signal with a quote, the PM draws the conclusion.
- We do not invent numbers: the estimate comes from the person who does the work, money only from the PM's figures, unknown = "to be clarified".
- We do not send anything to the client automatically.
