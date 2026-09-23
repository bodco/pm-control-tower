---
name: project-lifecycle
description: "Project lifecycle engine for Control Tower: kickoff of a new project (config, Notion anchor pages, Charter, first decision, tech start), handover-in from another PM (KT and baseline), monthly Project Health Check, team member onboarding and offboarding, and project closure or transition to support. Follows projects/_standards.md and the PM Profile of the config. Never defaults to a project. Use when the user mentions \"новий проєкт\", \"заведи проєкт\", \"kickoff\", \"онбординг проєкту\", \"прийом проєкту\", \"приймаю проєкт\", \"KT\", \"handover\", \"project health check\", \"аудит стану проєкту\", \"здоров'я проєкту\", \"новий член команди\", \"онбординг розробника\", \"хтось іде з проєкту\", \"закриття проєкту\", \"project closure\", \"переходимо в саппорт\", \"перевір шаблони\", \"template check\", or when it runs as the monthly health-check task."
---

# Project Lifecycle

One engine for the moments that happen once or rarely in a project's life: it starts,
it changes hands, it is audited, people join and leave, it ends. Each moment is a mode.
The human playbooks live in the Notion PM Toolkit; the machine standards live in
`projects/_standards.md`; the project state lives in `projects/{slug}.md`.

## Modes

| Mode | Trigger examples | Output |
|---|---|---|
| `kickoff` | "новий проєкт X", "заведи проєкт", "kickoff" | draft config, Notion anchor pages, Charter, first Decision, local folders, config registered (plugin or `.skill`), autopilot proposal |
| `handover-in` | "приймаю проєкт від ...", "KT", "handover" | KT page filled from evidence, written baseline, undocumented commitments list, health check scheduled |
| `health-check` | "project health check X", "аудит стану", monthly task (2nd of the month) | 8-area RAG report with evidence and top-3 |
| `team-onboarding` / `team-offboarding` | "новий розробник на X", "Y іде з проєкту" | onboarding page, access request list, config patch, Decision row |
| `closure` | "закриваємо проєкт", "переходимо в саппорт" | closing checklist with evidence, handover pack, config patch, list of tasks to disable |
| `template-check` | "перевір шаблони", "template check", "які шаблони використовуються" | table: document key, resolved template source, missing invariants (chat only) |

If the mode is unclear from the request, ask which one (one question, list the modes).

## Execution rules

- Allowed questions: which project (never guess, Default Project Rule in
  `projects/SKILL.md`); which mode if ambiguous; facts the config needs that the user
  has not given (via AskUserQuestion, section by section, never a wall of questions).
- **Never invent a fact.** Unknown = "уточнити" in the config and in documents.
  Estimates and numbers come from people, not from this skill (`_standards.md` section 10).
- **Nothing goes to the client.** Drafts only. No emails, no Slack messages.
- **Config files are not edited silently.** Every config change is produced as an exact
  patch block for the PM. Where the file lives depends on the installation
  (`projects/SKILL.md`, "Adding a new project", step 7): with the plugin, a new config
  is added inside the installed plugin through Cowork's plugin customization flow
  ("customize the pm-control-tower plugin: add project {slug}"); with standalone
  skills, the `projects` folder is rebuilt as a `.skill` zip and uploaded. Never upload
  a separate skill named `projects` next to the plugin. Never claim the config was
  updated until the PM confirms it.
- **Writes allowed without asking** (the 5-minute rule in `projects/SKILL.md`): Notion
  pages under the project page, rows in Decisions / Risks / Tasks Tracker / Reports,
  local folders. Config changes, scheduled tasks and anything on the client's side are
  proposals.
- **Scheduled tasks are proposed, not created**, unless the user says yes explicitly
  in this conversation. Then use the scheduled-task tools (cloud for anything that does
  not need the Mac, the Mac for Mail.app and local files).
- No deletions anywhere (Notion, local folders).
- Internal outputs in `{config.default_language}` (Ukrainian); client-facing drafts in
  `{config.client_language}` (English).

---

## Step 0 - Project, config, standards, sources (always run first)

1. Determine the project. `kickoff` needs a new project name and slug from the user;
   every other mode needs an existing project named explicitly. Not named → ask,
   listing the configs in `projects/`.
2. Except in `kickoff`, read `../projects/{project_slug}.md` relative to this skill's
   folder (fallback: Glob `**/projects/{project_slug}.md`). Not found → "Project config
   not found. Available projects: [...]" and stop.
3. Read `../projects/_standards.md` and `../projects/SKILL.md` (Rule Zero, JQL Isolation
   Validator, Data Completeness header, PM standards). Read the config's `PM Profile`;
   if absent, derive the profile from `board_type` and say `PM Profile: SKIPPED`.
4. Source availability (never fail on a missing source, name it in the report):

| Source | If present | If absent |
|---|---|---|
| `task_tracker.api_access: true` | tracker queries, always scoped `project = {config.task_tracker.project_key}` | `task_tracker.fallback_source` with its date and freshness |
| `local_paths.time_reports` not `none` | Tempo hours for burn | burn area = SKIPPED |
| Notion Threads / Meetings / Decisions / Risks / Reports | always | - |
| `sentry.url` not `none` | quality signal | skip with one line |
| device bridge (`mcp__remote-devices__device_bash`) | local folders and files on the Mac | say which local step waits for the Mac |

5. Every report this skill writes opens with the Data Completeness header
   (`OK / EMPTY / STALE / SKIPPED / FAILED` per source).

---

## Mode `kickoff`

Implements document 08 of the Control Tower docs ("New project flow",
`docs/en/08-new-project-flow.md` in the repository) end to end. Case A = new from
scratch, B = taken over from another PM (run `handover-in` right after kickoff),
C = not software (no tracker, repos, Sentry).

### K1. Pre-start interview
Go through `_standards.md` section 6 and the Pre-start Checklist with the user: contract
type, budget and margin understood; SOW read verbatim; access requested; stakeholders on
both sides; roster with allocations and PTO; delivery approach. Case A: presale estimates
checked (by the people who will do the work). Case B: KT sessions planned. Record the
answers; they feed `pm_profile`.

### K2. Config draft
Copy `../projects/_template.md` to `{slug}.md` in the working directory. Fill section by
section: General, Access Matrix (with "as of" dates), Task Tracker (`api_access` asked
honestly: will client infosec give an agent a token?), Client Tracker, Jira or `none`,
Slack, Sentry, Notion (IDs after K3), Local Paths, Team - Internal, Team - Client with
Influence / Interest / Channel / Cadence / Notes, Meetings Schedule with the `Agenda`
key from `_standards.md` section 5, Deploy Config or `none`, Email Routing, Engagement
Status, PM Profile, Changelog "config created". Secrets: variable names only.

### K3. Notion anchors
Relation names are `Project` and `Workspace` in every database.
1. Workspace: `notion-search` in the Workspaces DB for the client; reuse if found,
   otherwise create one page.
2. Project page in the Projects DB using the database template "New project" (apply the
   template if the tool supports it; otherwise create the page and tell the PM to apply
   the template in Notion). Set Status `In progress`, Start date, Workspace.
3. Under the project page: **Current State** (5-10 lines: what is happening, open
   questions, next dates) and **Project Charter** (template key
   `project-lifecycle.charter`, resolved per "Document templates" in `projects/SKILL.md`;
   when no house or project template is set, duplicate the Toolkit Charter
   template, the page under `{config.pm_profile.documents.pm_toolkit_page_id}` named
   "Project Charter", with `notion-duplicate-page`, move it under the project page,
   fill it from the config; unknowns stay "уточнити"; if the Toolkit page ID is `none`,
   create a plain Charter page with the Toolkit's sections).
4. Decisions DB: first row "Project {name} started, scope = ..., team = ..., model = ...",
   Area `Scope`, Source = SOW or kickoff meeting, Stated by = who set the scope.
5. Do NOT create Decision Log, RAID, Stakeholder Register or RACI pages: those are the
   Decisions DB, the Risks DB with `Kind`, and the config.
6. Put project page, workspace page, Current State and Charter IDs into the config draft.

### K4. Tech start (only when the engagement includes engineering)
From the Toolkit page "Технічний старт з командою розробки":
- NFR and constraint questions (scale now and in a year, PII and data residency,
  security and roles, compliance, multitenancy, integrations and their owners, uptime,
  localisation) → each unknown becomes a Risks DB entry with `Kind = Assumption`,
  Status `Open`, the assumption stated, "Якщо невірне → наслідок" and "Перевірити до"
  in the body.
- Candidate one-way decisions (`_standards.md` section 9 list) → Tasks Tracker tasks for
  the PM "Зафіксувати рішення: {topic}" (Source `project-lifecycle`, Project relation,
  due within 2 weeks). When a decision is made it goes to the Decisions DB with
  `Door = One-way`, alternatives, trade-off and review trigger.
- One task "Архітектура на серветці: context + компоненти + data flow" and one
  "Spike по найризикованішому невідомому" (owner = tech lead from the config).

### K5. Local folders
Via `device_bash` on the Mac (or directly when local): `mkdir -p` for
`~/work/{slug}/` and only the subfolders in scope (`exports/` when `api_access: false`,
`Time Reports/`, `repos/`, KB). Never delete or move existing files.

### K6. Registration
1. Register the config where the library is installed (`projects/SKILL.md`, "Adding a
   new project", step 7): **plugin** → add `{slug}.md` inside the installed plugin's
   `skills/projects/` through Cowork's plugin customization flow and repackage;
   **standalone skills** → rebuild the `projects` folder as a `.skill` zip with the new
   file inside and hand it to the user for Settings → Skills → Upload. Either way,
   check afterwards that every existing config is still present and that a request
   without a project name lists the new project.
2. Give the exact row for the projects table in the Cowork global instructions, if the
   user keeps one.
3. Optional Claude Project on claude.ai: instructions = name, slug, "source of truth is
   `projects/{slug}.md` and Notion Control Tower", language rules; knowledge = static
   documents only (SOW, contract, specs). Never team, meetings, access or statuses.

### K7. Autopilot proposal
Table (not created without a yes): task name, schedule in the user's time zone, where it
runs (cloud / Mac), prompt. Minimum per document 08 Phase 6: Slack sync, team prep, a
prep per client meeting (with the `Agenda` key), and the user's shared scheduled tasks
whose prompt must list the new project (mail processing, current-state distillation, if
configured). Second wave (stability, deploy, board health) only with engineering scope.

### K8. Verification and report
- No empty config section without `none`; relation names match the live schema;
  a request without a project name must produce a choice of all active projects.
- Report to the Reports DB: Type `Project Kickoff`, Skill `project-lifecycle`,
  Visibility `Internal`, body = the document 08 checklist with "зроблено / чекає на ПМа" per
  line, the config patch status, and the list of open "уточнити" items.

---

## Mode `handover-in` (case B, from the Toolkit KT / Handover Checklist)

Principle: trust but verify. The main trap is inheriting "all green" on faith.

1. Resolve the template `project-lifecycle.kt-checklist` ("Document templates" in
   `projects/SKILL.md`); when no house or project template is set, duplicate the
   Toolkit KT / Handover Checklist template (under
   `{config.pm_profile.documents.pm_toolkit_page_id}`; if `none`, create a plain page
   with the checklist sections) under the project page; save its ID for
   `pm_profile.documents.kt_checklist_page_id` (config patch).
2. Fill each KT line from evidence, citing sources, and mark what only the previous PM
   can answer:
   - Commercial and budget: `pm_profile.contract`, Tempo totals if available.
   - Scope done / in progress / **promised verbally**: search Meetings and Threads of the
     last 90 days for commitments ("we will", "we'll deliver", "promise", "обіцяли",
     "домовились", "зробимо до") and compare with the Decisions DB and the tracker.
     Every commitment without a Decision row or ticket goes to a list
     "Незадокументовані обіцянки" with the quote and link.
   - Real timeline: throughput or velocity from the tracker (per the metrics profile),
     not the stated plan.
   - People risks: only facts from work artifacts (roll-offs, PTO, single-owner
     components); no judgement about people.
   - Painful topics and open promises with the client: open Threads `Awaiting Reply`,
     Topics `Open`, recent client-satisfaction report.
   - Tech debt and known risks: Risks DB, KB `LESSONS.md` if the config has `kb_root`.
   - Artifacts and access: Access Matrix vs what actually works today.
3. Write **"Стан на момент прийому"** into the KT page (date, RAG per area, the
   undocumented commitments) and add a Decisions row "Baseline at handover as of
   {date}", Area `Scope`, Source = the KT page. This is the PM's protection and the
   starting point for all later comparisons.
4. Propose a `health-check` on day 10 (Toolkit: independent audit in the first 10 days):
   a Tasks Tracker task with that due date, or a one-off scheduled run if the user says yes.
5. Report: Type `Project Handover`, Visibility `Internal`.

---

## Mode `health-check` (Toolkit Project Health Check)

Independent audit. Eight areas, each with RAG 🟢/🟡/🔴, the evidence behind it, and the
source state. No evidence = ⚪ "немає даних", never a guessed colour.

| Area | Evidence | 🟡 / 🔴 (калібрувати) |
|---|---|---|
| Schedule | `pm_profile.milestones` vs today; `schedule_variance`; tracker trend | 🟡 a milestone at risk; 🔴 a milestone slipped without a new agreed date |
| Budget burn | Tempo hours vs `pm_profile.contract.hours_cap_month` (`hours_burn`) | 🟡 forecast > 90% of cap; 🔴 > 100%. No cap → ⚪ |
| Scope | Threads with Category `Scope Change` in 90 days, the Extras Log (if `change-request` keeps one), commitments without a Decision row | 🟡 extras above the goodwill budget or undocumented commitments; 🔴 scope changes delivered without any decision or CR |
| Quality | defect metrics from the profile (`reopen_rate`, `defect_arrival`, `created_vs_resolved`), Sentry trend | per `_standards.md` section 2 thresholds |
| Team (attrition risk) | work artifacts only: roll-offs and PTO in the config, single-owner components (bus factor), unanswered team threads | 🟡 one bus-factor component; 🔴 a key person leaving without handover. Never analyse mood or personality |
| Client satisfaction | the latest `Client Satisfaction` report in the Reports DB (≤ 31 days) | take its level; older than 31 days → STALE and suggest a run |
| Tech debt / architecture | Risks DB Category `Technical`, Decisions with `Door = One-way` past their review trigger, KB lessons | 🟡 one-way decision past its trigger; 🔴 a Critical technical risk without mitigation |
| Open risks / issues | Risks DB for the project, grouped by `Kind` (empty = Risk) | 🟡 any High open > 30 days; 🔴 any Critical open or any Issue without a plan |

Then: overall status (worst area, unless the PM overrides), **top-3 things that need
attention** with a proposed action and owner, and the reader-rule block "Рішення, які
потрібні від ПМа / delivery". Early warning signals from `_standards.md` section 7 are
listed separately with quotes (read `Team - Client` Notes before flagging silence).

Output: Reports DB, Type `Project Health Check`, Visibility `Internal`. Config patch line:
`last_health_check: {date}`. Findings that are new risks → hand them to `risk-register`
(or create with Status `AI Review` if the user asks to record them now; before that,
fetch the Risks data source and confirm `Kind` exists, creating it if it does not).

**Monthly scheduled run** (a cloud task such as "Project Health Check (monthly)" early in
the month, after any monthly digest and client satisfaction runs the user has): the task prompt
names the projects explicitly (or says "усі активні проєкти", which counts as an
explicit cross-project scope) and runs one health check per project, one report each.
In a cloud run without the Mac bridge, Tempo and local Jira connectors are `SKIPPED`,
never guessed; no new Risks DB entries are created, candidates are listed for the PM.

---

## Modes `team-onboarding` / `team-offboarding`

**Onboarding** (Toolkit Team Member Onboarding):
1. Resolve the template `project-lifecycle.onboarding` ("Document templates" in
   `projects/SKILL.md`); when no house or project template is set, duplicate the
   onboarding template (`{config.pm_profile.documents.onboarding_template_page_id}`;
   if `none`, create a plain page with the sections below) under the project page,
   fill it: access list derived from the Access Matrix (as requests the PM makes, never
   granted by this skill), links to the Charter and KB, `decision_rights` as "хто за що",
   meetings from the Meetings Schedule, a first small task suggestion (owner picks it).
2. Config patch: a row in `Team - Internal` (name, role, Jira username, report title,
   availability, focus) + Transcript Alias Map if needed + Changelog line.
3. Decisions DB: "{Name} joined as {role} from {date}", Area `Team`.
4. Tasks for the PM: access requests, buddy assignment, first 1-on-1 date.

**Offboarding**:
1. Config patch: move the person to `Former Members` with the last day (never delete),
   Access Matrix rows that change, Assignment Rules that pointed to them, Changelog.
2. Bus factor check: tracker tickets and components where this person was the only
   assignee in the last 90 days → list with a proposed new owner (the PM decides).
3. Access revocation checklist for the PM; Decisions row Area `Team`.
4. Metric continuity: if team size changes, propose the Metric Continuity note for the config.

---

## Mode `closure` (Toolkit "Закриття проєкту")

1. Ask the type of end: completed, transition to support / T&M, handover to another team
   or PM, client takes it in-house, pause or cancellation, not renewed.
2. Closing checklist with evidence and status per line: acceptance sign-off (Decisions
   row or client email; otherwise "немає підтвердження"), outgoing KT, access and docs
   transfer (from the Access Matrix), loose ends (open Risks with `Kind` Issue / Risk,
   open bugs from the tracker, tech debt) documented, financial closeout (PM or account
   only; the skill lists what to check, never numbers it does not have), team offboarding,
   retrospective, relationship close, renewal / reference ask.
3. Handover pack page under the project page (template key `project-lifecycle.handover-pack`): latest Monthly Memory Digest, active
   Decisions, open Risks and Issues, Access Matrix, KB links. Honest about loose ends.
4. **Transition to support** variant: config patch `phase: support`,
   `metrics_profile: kanban_support`, `sla` to agree, meetings re-mapped; a draft
   expectations note for the client (English) about support vs development.
5. Config patch `status: archived` (full closure only) + Changelog; Decisions row
   "Project closed / moved to support on {date}"; list of scheduled tasks for this
   project to **disable, not delete** (their prompts stay); any agent working folder
   (such as `.ai/`) to archive.
6. Report: Type `Project Closure`, Visibility `Internal`.

---

## Mode `template-check`

Read-only. For the named project (or the house level when the user says "усі" / "house"),
walk the resolution order of every key in `../projects/_templates.md` and output one
table in chat: key, resolved source (`project`, `house`, `Toolkit`, `built-in`), whether
the source is reachable from this session and from cloud runs, and the invariants the
template lacks (reader-rule elements for reader-facing reports, the eight Extras Log
columns, the month heading of topic sections). No writes, no report page.

## Report storage

Template keys of the reports below: `project-lifecycle.kickoff`, `.handover`,
`.health-check`, `.closure` (resolve per "Document templates" in `projects/SKILL.md`;
the mode sections above are the built-in formats).


Reports DB `{config.notion.reports_db}` (in `kickoff`, the shared ID from `_template.md`).

| Property | Value |
|---|---|
| Report Name | `{Mode title} - {project_name} - {date}` |
| date:Date:start | today |
| Type | `Project Kickoff`, `Project Handover`, `Project Health Check`, `Team Change`, `Project Closure` (create the option if missing) |
| Skill | `project-lifecycle` (create the option if missing) |
| Visibility | `Internal` |
| Summary | 2-3 sentences: overall status and the top item |
| Project, Workspace | `["https://app.notion.com/p/{config.notion.project_page_id}"]`, `["https://app.notion.com/p/{config.notion.workspace_page_id}"]` (IDs without dashes) |

Tasks Tracker entries use Source `project-lifecycle` (create the option if missing) and
the `Project` / `Workspace` relations.

## Chat output

Ukrainian. Completeness header, what was done, what waits for the PM (with exact config
patch blocks and the Upload instruction when a package was built), open "уточнити" items.

## Critical pitfalls

1. Never write one project's data under another project's relations; in `kickoff`
   double-check the new project page ID before every write.
2. Never mark a config change as applied: it is a patch until the PM uploads it.
3. Never colour a health area without evidence; ⚪ is an honest answer.
4. Team area = work artifacts only. No mood, personality or psychological inference.
5. Undocumented commitments are quoted with a link, never paraphrased into promises.
6. Toolkit templates are duplicated, never edited in place.
7. Scheduled tasks and client messages: proposals only, unless the user said yes.