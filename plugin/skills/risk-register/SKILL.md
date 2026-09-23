---
name: risk-register
description: "Maintains a living RAID register (Risks, Assumptions, Issues, Dependencies) for a registered project by scanning the tracker, Slack, Notion meetings, Threads and Sentry plus the early warning signals from projects/_standards.md, and writes to the Notion Risks DB with kind, severity, likelihood, visibility, owner and mitigation. Produces an internal and a sanitized external report with a Decisions needed section. Never defaults to a project. Use when the user mentions \"risk register\", \"ризики\", \"реєстр ризиків\", \"RAID\", \"assumptions\", \"залежності\", \"issues log\", or runs it as the weekly scheduled task."
---

# Risk Register (RAID)

Scans the project's operational data (tracker, Slack, Notion meetings, Threads, Sentry)
and maintains a structured RAID register in the Notion Risks DB. The goal is to surface
risks **before they become incidents**, to keep assumptions and dependencies visible
until they are resolved, and to keep every entry's status fresh automatically.

The Risks DB is the project's RAID log (PM Toolkit, `_standards.md` section 8): the
`Kind` property says what an entry is. Standards for thresholds, signals and reports come
from `projects/_standards.md`.

## CRITICAL: Execution Rules

**DO NOT ask for confirmation. DO NOT generate prompts for the user to copy. Start
executing immediately.**

The ONLY questions allowed:
- If the project is not explicitly named - ask which project (never default silently;
  Default Project Rule in `projects/SKILL.md`)
- If the time window is ambiguous - ask (default: last 7 days)

Writes follow the 5-minute rule in `projects/SKILL.md` ("Agent write permissions").
Writes allowed without asking: new or updated Risks DB entries with Status `AI Review`,
auto-close status changes, the two Reports DB pages; everything else (any message to the
client, tracker changes) is a draft for the PM.

---

## Step 0 - Project config and source availability (always run first)

1. Determine the project from the user's request. If the project is NOT explicitly
   named, do not guess and do not default: ask the user which project (list the configs
   in `projects/`). See the Default Project Rule in `projects/SKILL.md`.
2. Read the project config `../projects/{project_slug}.md` relative to this skill's
   folder; if that fails, Glob `**/projects/{project_slug}.md` under the skills directory.
3. All Notion DB IDs (including `risks_db`) and the team roster live in that config.
   There is no separate CLAUDE.md - do not look for one.
4. All `{config.xxx}` placeholders below come from that file.
5. Read `../projects/_standards.md` (sections 1, 7, 8) and `../projects/SKILL.md`
   (cross-cutting rules: Default Project Rule, JQL Isolation Validator, Data
   Completeness header, 5-minute rule, PM standards). Read the config's
   `Team - Client` table including `Notes`: some people's silence is normal by design
   and must not be flagged.
6. Right after this step check `{config.task_tracker.api_access}` and follow the
   fallback rules of `projects/SKILL.md` (see the Source availability table below).
7. Components listed as client-owned in the config's Scope of Responsibility (and the
   Sentry `projects_out_of_scope` slugs) are context only: never promise our fix, never
   create tickets or risks for them; route any such draft as "passed to the client team".

**There is no hardcoded fallback.** If the config cannot be read, say "Project config not
found. Available projects: [list files in projects/]" and stop. Writing risks into a
database guessed from memory is the worst failure this skill can produce: it puts one
client's risks into another client's register.

### Source availability

| Config value | If present | If absent or false |
|---|---|---|
| `{config.task_tracker.api_access}: true` | run the JQL scans below through the Jira MCP server from `{config.jira.mcp_read}` (default `jira`, operation `search_issues`) | skip the tracker scans; if `{config.task_tracker.fallback_source}` is `manual_export` with status and updated dates, derive stuck-ticket signals from the newest file in `{config.task_tracker.export_path}` and state the export date in the report; if the fallback is `meeting_action_items` or `email_summaries`, say the tracker produced no signals this run |
| `{config.slack.slack_access}` (values are exactly `mcp | mcp_local | chrome | none`): `mcp` or `mcp_local` | read channels with the Slack tools (see Signal Source 2) | if `chrome`, say Slack signals need a `slack-collector` run first and scan the Threads DB instead of Slack directly; if `none` or missing, skip Slack with one header line |
| `{config.sentry.url}` not `none` | Sentry signal section | skip with one line |
| `{config.notion.risks_db}` set | write the register | stop and ask for the shared Risks DB ID: this skill has no meaning without it |

Never emit a silent empty section. A source that did not run is named in the report.

### Secrets

Not in the config. Read at runtime, never print, never put into a risk page or report:

```bash
SENTRY_TOKEN=$(grep '^{config.sentry.token_env}=' {config.sentry.secrets_file} | cut -d= -f2-)
```

---

## Notion Risks DB - the shared register

`{config.notion.risks_db}` is ONE Control Tower database shared by all projects; entries
are separated only by their `Project` and `Workspace` relations. Never create a separate
Risks DB per project. If the key is `none` or missing, stop and ask the user for the
shared Risks DB ID (it is the same value in every active config).

Expected schema:

| Property | Type | Options |
|---|---|---|
| Name | title | - (the live title property is `Name`, not `Risk Name`) |
| Status | select | `AI Review`, `Open`, `Monitoring`, `Mitigated`, `Closed`, `Realized` |
| Severity | select | `Critical`, `High`, `Medium`, `Low` |
| Likelihood | select | `Almost Certain`, `Likely`, `Possible`, `Unlikely` |
| Category | select | `Technical`, `Resource`, `Scope`, `Client`, `Dependency`, `Security`, `Timeline`, `External` |
| **Visibility** | **select** | **`Internal`, `External`, `Both`** |
| **Kind** | **select** | **`Risk`, `Assumption`, `Issue`, `Dependency` (empty = Risk)** |
| Owner | text | who is accountable |
| First Seen | date | - |
| Last Updated | date | - |
| Source | multi_select | `Jira`, `Slack`, `Meeting`, `Email`, `Manual`, `Sentry` |
| Summary | text | 1-2 sentences |
| Mitigation | text | plan or action taken |
| Project | relation | link to the project page |
| Workspace | relation | link to the workspace page |
| Related Jira | text | comma-separated ticket keys |
| Topics | relation | related Topics pages, when known |

The `AI Review` status is reserved for items created or updated by automations; the PM
changes it after confirming.

### Step 0b - verify the live schema

Fetch the Risks DB data source once per run (`notion-fetch` on `{config.notion.risks_db}`)
before the first write and use the real property names. If `Kind` (or any property this
skill writes) is missing in the live schema, create the property (`Kind` = select
Risk / Assumption / Issue / Dependency) or, if that is impossible, write the value into
the page body and report the discrepancy so the config and this file are fixed the same
day. Do the same for the Reports DB before saving the reports.

Relation names are `Project` and `Workspace` (singular, no emoji) in every Control Tower
database. If a write ever fails on an unknown property, read the actual schema before
guessing.

---

## Kind Classification (RAID)

Every entry MUST have `Kind` set when created or updated. Entries created before the
`Kind` property existed have an empty `Kind`: read them as `Risk`, and set `Kind` the
first time you update them.

| Kind | Means | Typical signal | Status use | Body adds |
|---|---|---|---|---|
| `Risk` | may happen | trend, weak signal, pattern | `AI Review` / `Open` / `Monitoring` / `Mitigated` / `Closed`; `Realized` when it happens (then create a linked `Issue`) | standard dossier |
| `Assumption` | we are assuming it; wrong = consequence | "we assume", "припускаємо", NFR unknowns from a kickoff, plans built on unconfirmed input | `Open` until validated; `Closed` when confirmed; proven wrong → `Realized` and create the `Issue` | "Якщо невірне → наслідок", "Перевірити до {date}" |
| `Issue` | already happening, needs a plan | production incident, blocker in effect, missed date | `Open` while unresolved, `Closed` when resolved | "Вплив зараз", "План і owner", "Наступне оновлення" |
| `Dependency` | we depend on someone | "waiting on", "чекаємо на", pending client decision, vendor, access request | `Open` until delivered; `Closed` when received | "Від кого", "Потрібно до {date}", "Що блокує" |

Rules:
- A pending **client decision** is a `Dependency` (source = the client person, Owner =
  the PM). External and Both dependencies on the client feed the "Decisions needed from
  you" section of the external report.
- An `Assumption` past its "Перевірити до" date without validation raises Severity by one
  step and appears in Рекомендації.
- A `Risk` that became real: set `Realized`, create or link an `Issue` entry (same
  Project, link each other in the body), do not overwrite the history.

## Visibility Classification (Internal / External / Both)

Every risk MUST have a **Visibility** property set. This determines which reports
include it.

### Definitions

- **Internal** - risks discussed only within our team. The client should NOT see these.
  Examples: staffing concerns, bus factor, internal process gaps, infrastructure ops
  detail, internal tooling issues, developer workload imbalances.
- **External** - risks visible to the client. These appear in client-facing risk reports.
  Examples: feature delivery timelines, onboarding blockers, end-user-facing bugs,
  compliance deadlines the client co-owns.
- **Both** - risks with an internal dimension (technical detail, root cause) and a
  client-facing dimension (impact, timeline). The external report shows a **sanitized
  version**; the internal report shows full detail.

### Classification Rules

1. **Source-based heuristic**: if the risk was discussed in a meeting with people listed
   in the config's `Team - Client` table, it is at least `External` or `Both`. If it was
   discussed only in internal meetings or internal channels, it is `Internal`.
2. **Content-based heuristic**: staffing, salaries, internal process, bus factor,
   workload distribution are `Internal`. Client deliverables, compliance, end-user impact
   are `External` or `Both`.
3. **Default**: when unsure use `Both` - safer to include in both reports and let the PM
   adjust.

### External Report Sanitization Rules

When generating the **external** (client-facing) report:
- **NO links to internal Notion pages** (no notion.so URLs)
- **NO references to internal team dynamics** (staffing, workload, bus factor)
- **NO internal channel links or meeting references** - use neutral phrasing like
  "identified during technical review"
- **Reframe owners**: use role titles familiar to the client ("Backend Team" instead of
  a developer's name for internal concerns)
- **Focus on impact and mitigation**, not root cause internals
- For `Both` risks: write a **separate, sanitized summary** that omits internal detail
- Language: the config's `client_language` (English by default)

---

## Signal Sources and Detection

Scan each available source for risk signals within the time window (default: last 7 days).

### 1. Tracker - stuck or escalating tickets

Only when `{config.task_tracker.api_access}` is true. Run `search_issues` on the Jira
MCP server from `{config.jira.mcp_read}` (default `jira`); if `mcp_read` names a second
server with different tool names, map the operations by meaning. **Every query MUST be
scoped with the project key** (JQL Isolation Validator in `projects/SKILL.md`): the
company tracker is shared across clients and an unscoped query would pull another
client's tickets into this register. Status names come ONLY from the config's Workflow
table (quote names with spaces or slashes exactly as written there); labels come from the
Labels Taxonomy and a label marked HISTORICAL is never queried.

Let `{KEY}` = `{config.task_tracker.project_key}` (`{config.jira.project_key}` carries the
same value).

**Long-blocked tickets (>10 days):**
```
project = {KEY} AND status = "{blocked status from the config's Workflow table}" AND updated <= -10d
```
Signal: dependency or decision risk.

**Reopened tickets** (only if the Workflow table has a status meaning "reopened";
otherwise skip this scan with one line):
```
project = {KEY} AND status was "{reopened status from the config's Workflow table}" ORDER BY updated DESC
```
Signal: technical or QA risk.

**Critical bugs open >14 days:**
```
project = {KEY} AND labels = "{bug label from the config's Labels Taxonomy}" AND priority in (Highest, Critical) AND status != "{done status from the config's Workflow table}" AND created <= -14d
```
Signal: quality risk.

**Stale in-flight work (>7 days):**
```
project = {KEY} AND status in ({in-progress statuses from the config's Workflow table}) AND updated <= -7d
```
Signal: resource or scope risk.

**Tickets waiting for review or QA for >7 days** (the status the Workflow table marks as
"waiting for review or QA"; skip with one line if there is none):
```
project = {KEY} AND status = "{review/QA status from the config's Workflow table}" AND updated <= -7d
```
Signal: QA capacity risk. If the Labels Taxonomy has an active label for tickets
developed by the client's own team, add `AND labels = "{that label}"` and read the
result as a client-dependency risk instead.

### 2. Slack - concerning keywords

If `{config.slack.slack_access}` is `mcp`: for each channel in `{config.slack.channels_all}`
read the time window with the Slack connector tools (`slack_read_channel`,
`slack_read_thread`, `slack_search_public_and_private`, `slack_list_user_channels`).
If it is `mcp_local`: use the local server named in `{config.slack.mcp_local_server}`
(typically `conversations_history`, `conversations_replies`, `channels_list`, with the
IDs from `{config.slack.channel_ids}`). If `chrome`: do not scrape here. Scan the Threads
DB (`{config.notion.threads_db}`) for this project in the window instead, and say in the
report that Slack signals come from the last collector run and name its date. If `none`
or `{config.slack.channels_all}` is empty: skip with one header line.

Flag messages containing (case-insensitive) Ukrainian and English keywords:
- `blocker`, `заблоковано`, `блокер`, `stuck`, `не можемо`, `can't proceed`
- `deadline`, `дедлайн`, `slipping`, `late`, `запізнюємось`
- `regression`, `регресія`, `broke`, `зламалось`
- `escalate`, `escalation`, `ескалація`, `critical`, `production issue`
- `dependency`, `залежимо`, `waiting on`, `чекаємо на`
- `unclear`, `не зрозуміло`, `чекаємо рішення`, `waiting on decision`
- `security`, `vulnerability`, `leak`, `security issue`

For each flagged message capture: channel, timestamp, author, thread link, one line of
context.

### 3. Notion meetings - explicit risks and concerns

Search recent meetings:
`notion-search(query: "{config.project_name} {current_month}", data_source_url: "{config.notion.meetings_db}")`.

For each meeting in the window use `notion-fetch` and scan for:
- "Risks" / "Ризики" heading
- "Blockers" / "Блокери" heading
- "Open Questions" / "Відкриті питання" heading
- "Concerns" / "Побоювання"
- "Action Items" with an unclear owner or owner = PM

Extract each risk mention with meeting page URL, date, quoted text.

### 4. Sentry (optional) - production signal

If `{config.sentry.url}` is not `none`, query the REST API with curl (token read at
runtime as in Secrets above, never printed) for the slugs in
`{config.sentry.projects_in_scope}`: new unresolved critical issues in the window. Try
`statsPeriod` first and fall back to explicit `start`/`end` ISO dates if the server
rejects it. A high error count is a stability risk. Slugs in
`{config.sentry.projects_out_of_scope}` belong to the client: do not scan them and never
create risks for them.

### 5. Early warning signals and bus factor (`_standards.md` section 7)

Human signals lead metrics. From Threads, meetings and Slack in the window, flag with a
quote and link (never a conclusion about a person):
- **Client**: suddenly quieter or slower approvals; tone from warm to dry and
  transactional; senior people pulled in; nervous questions about dates; "we need to talk".
  Before flagging silence, check `Team - Client` Notes: documented delegation or a
  structural change of contact is not a signal.
- **Team** (work artifacts only): questions stopped; stand-ups turned one-word; a key
  person disconnected or PTO grew; quality dropped; "all fine" where metrics say otherwise.
- **Commercial**: invoice questions; tense scope conversations; silence about renewal.
- **Bus factor**: a component where one person was the only assignee of all tickets in
  the last 30 days (tracker, only with `api_access: true`); all client communication
  going only through the PM with no deputy.

Team and bus-factor entries are always Visibility `Internal`. Never infer mood,
personality or psychological state; describe observable facts only.

---

## Risk Correlation and Enrichment

Group signals that refer to the **same underlying risk** using semantic matching:

- the same ticket mentioned plus a Slack discussion plus a meeting note = **one risk**,
  not three
- multiple blocked tickets on the same feature = **one scope risk**
- repeated stability complaints from the client = **one client-perception risk**

For each grouped risk assign:

**Severity** (impact if realized):
- `Critical`: release block, client trust break, data loss, security breach
- `High`: significant delay (>1 week), multiple features affected, major rework
- `Medium`: single feature delay, manageable rework, quality concern
- `Low`: minor friction, workaround exists

**Likelihood** (signal strength):
- `Almost Certain`: already happening or confirmed
- `Likely`: multiple signals converging, visible trend
- `Possible`: signal detected but not yet impacting delivery
- `Unlikely`: hypothetical concern, single weak signal

**Kind**: per the Kind Classification above.

**Category**: Technical / Resource / Scope / Client / Dependency / Security / Timeline /
External.

**Visibility**: per the classification rules above.

**Owner**: infer from the ticket assignee, mentions, meeting attendees, or default to the
PM. Names come from the config's `Team - Internal` and `Team - Client` tables; never
invent one.

---

## Create or Update Risks

### Check existing first

For each identified risk, search the Risks DB:
```
notion-search(query: "{risk_keywords}", data_source_url: "{config.notion.risks_db}")
```

Use **semantic matching**: "API timeouts on the payments provider" matches an existing
"Payments provider integration instability". Do not duplicate.

### A. Create a new risk

Use `notion-create-pages`:

```
{
  parent: { data_source_id: "{config.notion.risks_db}" },
  pages: [{
    properties: {
      "Name": "Short descriptive title",
      "Kind": "Risk",
      "Status": "AI Review",
      "Severity": "High",
      "Likelihood": "Likely",
      "Category": "Dependency",
      "Visibility": "Both",
      "Owner": "[name from the config's Team or Client Team section]",
      "date:First Seen:start": "YYYY-MM-DD",
      "date:Last Updated:start": "YYYY-MM-DD",
      "Source": "Jira, Slack",
      "Summary": "1-2 sentence summary of the risk and its potential impact.",
      "Mitigation": "Proposed mitigation plan or current action.",
      "Project": "[\"https://app.notion.com/p/{config.notion.project_page_id without dashes}\"]",
      "Workspace": "[\"https://app.notion.com/p/{config.notion.workspace_page_id without dashes}\"]",
      "Related Jira": "{KEY}-1234, {KEY}-1250"
    },
    content: "[formatted risk dossier - see Risk Dossier Format below]"
  }]
}
```

Relation properties need full page URLs, not bare UUIDs: always the
`["https://app.notion.com/p/<id-without-dashes>"]` form, for `Project`, `Workspace` and
`Topics` alike.

### B. Update an existing risk

1. `notion-fetch` the existing risk page
2. update `date:Last Updated:start` to today
3. append new signals to the dossier via `notion-update-page` with the `update_content`
   command: find the `## Signal History` heading and insert new entries under it
4. if `Kind` is empty, set it now (see Kind Classification)
5. if severity or likelihood increased, update those properties
6. if the linked tickets changed, update "Related Jira"
7. if the entry is resolved, set Status to `Mitigated` or `Closed` (per its Kind)

### C. Auto-close stale risks

Applies to `Kind` = `Risk` (or empty) only. Assumptions close when validated,
Dependencies when delivered, Issues when resolved; silence does not close them. For
those, 30+ days without an update puts them into Рекомендації as "перевірити стан".

If a risk has Status `Open` or `Monitoring`, Last Updated more than 30 days ago, and no
new signals in the current scan:
- `Open` becomes `Monitoring`
- `Monitoring` becomes `Closed`
- add to the dossier: "Auto-closed [date] - no signals in 30 days"

---

## Risk Dossier Format

Page body, written in `{config.default_language}` (Ukrainian by default):

```markdown
## Опис
Kind: {Risk / Assumption / Issue / Dependency}
{2-3 sentences: what could go wrong / what we assume / what is happening / what we wait for, and why it matters.}

{Kind-specific block, one of:
 Assumption: "Якщо невірне → наслідок: ..." та "Перевірити до: YYYY-MM-DD"
 Issue: "Вплив зараз: ...", "План і owner: ...", "Наступне оновлення: YYYY-MM-DD"
 Dependency: "Від кого: ...", "Потрібно до: YYYY-MM-DD", "Що блокує: ..."}

## Ознаки
- {Signal 1 - what was observed}
- {Signal 2}

## Потенційний вплив
- {Impact 1 if realized}
- {Impact 2}

## План пом'якшення
1. {Action 1 with owner}
2. {Action 2}

## Тригери ескалації
- {Condition that would require escalation to the client or management}

## Signal History
- **{YYYY-MM-DD}** - {Source} - {brief description of the new signal, link if available}
- **{YYYY-MM-DD}** - {Source} - {...}

## Зв'язані артефакти
- Tracker: [{KEY}-1234](link), [{KEY}-1250](link)
- Slack: [thread link]
- Meeting: [meeting page link]
```

---

## Chat Output Summary

After processing, produce **TWO** summaries: internal and external.

### Internal summary (Ukrainian, shown to the PM in chat)

All risks (Internal + External + Both). Full detail, Notion links, real names.

```
## Risk Register Update (Internal) - {project_name} - {date}

Джерела: {Data Completeness header per projects/SKILL.md: tracker / Slack / Threads / Meetings / Sentry / PM Profile, each OK / EMPTY / STALE / SKIPPED / FAILED; in English when default_language is English}
Статус: {🟢/🟡/🔴} - {one-line reason}

### RAID коротко
| Kind | Open | Нові | Закриті |
|---|---|---|---|
| Risk | {n} | {n} | {n} |
| Assumption | {n} | {n} | {n} |
| Issue | {n} | {n} | {n} |
| Dependency | {n} | {n} | {n} |

### Критичні (потребують дії цього тижня)
- 🔴 **{Risk Name}** ({Kind}, {Category}, {Visibility}) - {1-line summary}
  Owner: {name} | Status: {status}

### Високі
- 🟠 **{Risk Name}** ({Kind}, {Category}, {Visibility}) - {1-line summary}
  Owner: {name} | Status: {status}

### Середні (моніторинг)
- 🟡 {Risk Name} - {1-line}

### Нові цього тижня ({N}):
{list of new risks created}

### Оновлені ({M}):
{list of updated risks}

### Автоматично закриті ({K}):
{list of auto-closed risks}

### Assumptions на перевірку і прострочені Dependencies
{assumption past "Перевірити до", dependency past "Потрібно до", or "немає"}

### Early warning signals
{quote + link + source; or "сигналів не знайдено"}

### Рішення, які потрібні від ПМа
{what the PM has to decide or escalate this week, or "немає"}

### Рекомендації
1. {Top action the PM should take}
2. {Second priority}
3. {Third priority if applicable}
```

### External summary (client language, client-facing)

Only risks with Visibility `External` or `Both`. Apply the sanitization rules above.

```
## Risk Register - {project_name} - {date}

Overall status: {🟢/🟡/🔴} - {one-line reason}

### Critical (action needed this week)
- {Risk Name} (Severity: Critical) - {sanitized 1-line summary}
  Owner: {client-appropriate role} | Status: {status} | Mitigation: {1-line}

### High
- {Risk Name} (Severity: High) - {sanitized summary}
  Owner: {role} | Status: {status} | Mitigation: {1-line}

### Medium (monitoring)
- {Risk Name} - {sanitized 1-line}

### Dependencies on your side
- {Dependency with Visibility External/Both: what we need, by when}

### Decisions needed from you
- {decision, who, by when, what happens without it}
(Always present. If none: "No decisions needed this period.")

### Recommendations
1. {Client-actionable recommendation}
2. {Second priority}
```

The external report lists `Issue` entries as current issues with their plan, and lists
`Assumption` entries only when their Visibility is External/Both and the client co-owns
them.

**External report rules reminder:**
- NO notion.so links anywhere
- NO internal team member names for internal concerns - use roles
- NO references to internal meetings, channels, or the board
- Focus on what the client needs to know and can act on
- Mention tickets only if the client has tracker access or the ticket is relevant to them
- Never a token, never an internal URL

---

## Report Storage

Save **TWO** report pages to the Notion Reports DB: `{config.notion.reports_db}`.
All Control Tower databases use the same relation names: `Project` and `Workspace`.

### Internal report

| Property | Value |
|---|---|
| Report Name | `Risk Register (Internal) - {config.project_name} - {date}` |
| date:Date:start | Today (YYYY-MM-DD) |
| Type | `Risk Register` |
| Skill | `risk-register` |
| Visibility | `Internal` |
| Summary | 2-3 sentences covering ALL risks |
| Workspace | `["{config.notion.workspace_page_id}"]` |
| Project | `["{config.notion.project_page_id}"]` |

Body: the internal summary (Ukrainian, full detail, all links).

### External report

| Property | Value |
|---|---|
| Report Name | `Risk Register (External) - {config.project_name} - {date}` |
| date:Date:start | Today (YYYY-MM-DD) |
| Type | `Risk Register` |
| Skill | `risk-register` |
| Visibility | `External` |
| Summary | 2-3 sentences of client-visible risks only |
| Workspace | `["{config.notion.workspace_page_id}"]` |
| Project | `["{config.notion.project_page_id}"]` |

Body: the external summary (client language, sanitized, no internal links).

---

## Scheduled Execution

Designed to run weekly (e.g. before the weekly review with the client). Register it as a
Cowork scheduled task via the app's scheduled-tasks feature - there is no `schedule`
skill. The task prompt names the project and the period; it does not restate this skill.

---

## Critical Pitfalls

1. **Always check for existing risks BEFORE creating** - semantic duplicates clutter the
   register and hide trends
2. **Severity is impact, Likelihood is probability** - do not confuse them
3. **Do not flag every stuck ticket as a risk** - only a pattern, client impact, or a
   timeline threat
4. **Owner must be real** - "Team" or "PM" is a red flag that the risk lacks
   accountability; note that in Mitigation
5. **Keyword scans are noisy** - cluster signals, do not create a risk per keyword hit
6. **Time window defaults to 7 days** - "last month" means 30 days
7. **Transcript aliases** - always translate via the project config's Transcript Alias
   Map table (not a `{config.x}` scalar key - it's a table) before attributing a signal
   to a person
8. **Visibility must always be set** - never blank; default to `Both` if unsure
9. **External reports must NEVER contain Notion links** - no notion.so URLs, no internal
   meeting references, no thread links. Hard rule
10. **Internal risks in external reports** - a `Both` risk with internal detail must be
    reframed: "Backend team capacity is being closely managed" rather than naming an
    overloaded person. Never use real names of former team members in examples
11. **No hardcoded database IDs** - every ID comes from the config. If the config is
    unreadable, stop; do not fall back to a remembered database
12. **Relation property names** - `Project` and `Workspace` in every Control Tower
    database since the 2026-09-08 unification. Do not reintroduce `Projects` or
    `🏛️ Workspaces`
13. **Title property is `Name`** - not `Risk Name`. Read the live schema if a write fails
14. **Kind must always be set** on create and on the first update of an old entry;
    only `Risk` auto-closes on silence
15. **People signals are facts, not diagnoses** - quote and link; team and bus-factor
    entries are Internal only