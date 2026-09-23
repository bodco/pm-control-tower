# 01. Architecture

## Layer diagram

```
 LAYER 1. SOURCES (periphery: MCP connectors and local files)
 ┌────────┬────────┬────────┬──────────┬────────┬────────────┬─────────────┬──────────┐
 │  Jira  │ Slack  │ Gmail  │ Mail.app │ Sentry │ CloudWatch │ Confluence  │ Calendar │
 │ local  │        │        │ buffer   │  REST  │ exports    │ local MCP   │          │
 │  MCP   │        │        │ on disk  │        │ on disk    │             │          │
 └───┬────┴───┬────┴───┬────┴────┬─────┴───┬────┴─────┬──────┴──────┬──────┴────┬─────┘
     │        │        │         │         │          │             │           │
     ▼        ▼        ▼         ▼         ▼          ▼             ▼           ▼
 LAYER 3. THE BRAIN: Claude Cowork
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │  Cowork global instructions + Claude memory  (who I am, my projects, how I write)│
 │  projects/  config registry  (Rule Zero: the config wins)                        │
 │  Skill library: collectors │ prep │ reports │ analytics │ project │ utilities    │
 │  Mac file system (~/work/<project>/): logs, repos, KB, time reports, .ai/        │
 └──────────────────────────────────────────────────────────────────────────────────┘
                 │ writes                                        ▲ launches
                 ▼                                               │
 LAYER 2. THE HUB: Notion CONTROL TOWER               LAYER 4. AUTOPILOT
 ┌──────────────────────────────────────┐          ┌────────────────────────────────┐
 │ Threads  Meetings  Topics  Decisions │          │ Cowork Scheduled Tasks (Mac)   │
 │ Reports  Risks  Tasks Tracker  Inbox │          │  daily / weekly / monthly      │
 │ Knowledge Base  Projects  Workspaces │          │ Cloud Routines (Claude Code)   │
 │ + Current State pages per project    │          │  monthly audits                │
 └──────────────────────────────────────┘          └────────────────────────────────┘
                 ▲
                 │ reads
 LAYER 5 (optional). SECOND AGENT: Gemini Spark + Notion MCP
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │ notion-project-brief (history briefs)  │  project-decision-qa (QA vs decisions)  │
 │ the .ai/ protocol at the project root: tasks/ current.md reports/ investigations/│
 └──────────────────────────────────────────────────────────────────────────────────┘
                 ▲
 HUMAN: the PM. Priorities, decisions, the client, arbitration between agents.
```

## The same framework as a data flow

The layers above are a static map of components. A new PM finds it easier to understand the system through the movement of data: where it came from and where it settled.

```
 COLLECT         BUFFER               SYNTHESIS                  MEMORY                   DECISION
 Slack ─────┐
 Gmail ─────┼─▶ Threads DB ──┐
 Mail.app ──┘ (disk buffer   ┤
               → Threads)    │   prep skills ────────▶ Reports DB ──┐
 Calendar ──┐                ├─▶ inbox-responder ────▶ Threads (draft)
 Meetings ──┼─▶ Meetings DB ─┤   topic-manager ──────▶ Topics DB     ├─▶ CONTROL TOWER ─▶ Human:
 (Notion AI)                 │   risk-register ──────▶ Risks DB      │   Today's Reports    send,
 Jira ─────────────────────▶ ┤   weekly/monthly ─────▶ Reports DB    │   Awaiting Reply     decide,
 Sentry, CloudWatch ───────▶ ┤   stability/deploy ───▶ Reports + Jira│   Open Risks         record
 Repos, KB (disk) ─────────▶ ┘   digest, distillation ▶ Decisions,   │   Tasks Tracker      the decision
                                                        Current State ┘                     ▲
                                                                                            │
                                 the projects/<slug>.md config drives every step ───────────┘
```

Read it this way: everything that arrives from outside first becomes a record in a database (Threads/Meetings), then skills turn those records into artifacts (prep, draft, topic, risk, report), the artifacts settle into memory (Reports/Topics/Risks/Decisions/Current State), and the human sees them on a single page and acts. The project config defines the filters and rules at every step.

## Core and adapters: what of this is universal

The split that settles the question "is this a framework, or a description of Acme":

| | Core (Core PM Framework, ~80%) | Project adapters (Project Adapters, ~20%) |
|---|---|---|
| What | Notion Control Tower with 11 databases and a relation model; the personal Tasks Tracker; the Mail.app + LaunchAgent mail pipeline; the operating rhythm; the `projects/` registry; engine skills (collectors, prep, reports, analytics); autopilot as a mechanism | Skills with a project prefix, scripts that parse client exports, browser-driven exports from portals without an API, codebase KBs, project-specific business reconciliations |
| Who changes it | The core author; changes go through versions | The project PM, at any time |
| Where it lives | The shared skills folder, the Notion template, this framework | `projects/<slug>.md` + `<slug>-*` skills + `~/work/<slug>/` |
| Acme example | `slack-collector`, `daily-team-prep`, `weekly-overview`, `risk-register`, Reports DB | `acme-beneficiary-audit`, `acme-db-assistant`, `acme-debug` with its KB, `acme-core-code-review`, `<portal>-export` on a different project |
| What happens to it with a new client | Taken as is | Written from scratch for the client's stack, often from manual exports |

Consequence for layer 1: the sources below are what exists on Acme. On another project some of them are missing, or available only through a browser or through files. The project config states explicitly what is available (`task_tracker.api_access`, Access Matrix), and the engines adapt.

## Layer 1. Sources

Everything that information comes from. Two categories:

**Through MCP connectors** (Claude calls them directly):

| Connector | What it provides | Mode |
|---|---|---|
| Slack (the official Claude connector) | reading channels and threads, search, sending, canvas | read + write (write under human control) |
| Slack (`slack-workspace2`, local MCP) | the PM's own read-only integration for the company workspace, used when the official connector is unavailable or occupied by another workspace; the token is read from `secrets.env` via `sh -c` in `claude_desktop_config.json` | read |
| Notion | search, fetching pages, creating and updating pages in databases | read + write, the main output of the system |
| Gmail | thread search, reading, drafts, replies | read + draft |
| Google Calendar | events for the day (for the daily report) | read |
| Jira (`jira`, local MCP; shipped in the plugin's `.mcp.json`) | search/get/create/update/transition/comment/attachment; the server name comes from the config's `jira.mcp_write` / `jira.mcp_read` | read + write |
| Confluence (`confluence`, local MCP) | CQL search, reading, creating, comments, attachments | read + write; works after the domain migration, the token is read from `secrets.env` (`13` #43) |
| Control Chrome (local MCP) | controlling tabs in the real Chrome on the Mac (separate from the Claude in Chrome connector) | read + write under supervision |
| Sentry | REST API directly, with a token from the config (not MCP) | read + status changes |
| Chrome / built-in browser | automation where there is no API: clinical-trial portals, the client's Notion, Jira REST via JS | read + write under supervision |
| Figma, Mermaid, IBKR | auxiliary, outside the PM core | |

The secrets of all the local MCP servers above (except `notion` and `Control Chrome`, which need no separate token) follow a single pattern: the values live in `~/work/Secrets/secrets.env`, and `claude_desktop_config.json` only runs `sh -c` with `grep`/`cut`. The desktop config JSON holds no secret at all (`13` #43); the plugin's `.mcp.json` uses the same pattern.

**Through the Mac file system** (Claude reads the folders through the bridge):

| Path (template) | What is there | Who fills it |
|---|---|---|
| `~/work/<project>/AWS Logs/` | CloudWatch exports (JSONL) | PM manually or a script |
| `~/work/<project>/Time Reports/` | Tempo exports for client reports and estimates | PM manually |
| `~/work/<project>/repos/` | local clones of the repositories (local refs only, no fetch through the proxy) | git |
| `~/work/<project>/Acme Documentation/_ for AI-assisted work/` | knowledge bases for code review and RCA (SYSTEM.md, SDLC.md, per-component KBs) | Claude + PM |
| `~/work/Mail/<account>/incoming/` | the mail buffer from Mail.app: JSON + EML, AppleScript + LaunchAgent every 15 minutes | automatic |
| `~/work/<project>/.ai/` | the second agent's protocol (layer 5) | Gemini + Claude |
| `~/work/Daily Reports/` | local copies of the daily reports | daily-work-report |

The principle: if data cannot be obtained through an API, it appears in the file system and Claude reads it from there. That removes the dependency on having the "right" connector.

"Zero-API Access" mode (the client provides no tokens): the client's tracker is read through a manual export into `~/work/<slug>/exports/` or through the browser; task statuses are reconstructed from action items in the Meetings DB and from the mail buffer. The config records `task_tracker.type`, `api_access: false`, `fallback_source`; the engines do not break in this mode, they work with what is available (see `03`, `04`).

## Layer 2. Knowledge hub: Notion Control Tower

One operations-center page and 11 databases shared by all projects. Projects are separated through the `Project` relation (and `Workspace` for the client/company). Details in `02-notion-control-tower.md`.

The roles of the databases in the data flow:

| Database | Who writes | Who reads | Role |
|---|---|---|---|
| Threads | collectors (Slack, Gmail, Mail.app) | inbox-responder, topic-manager, weekly-overview, client-satisfaction, Current State | incoming communications with status classification |
| Meetings | Notion AI (transcript + summary) | notion-meeting-topics, daily-team-prep, topic-manager, risk-register, Monthly digest | the memory of meetings |
| Topics | topic-manager (on-demand and weekly mode), Gemini | all prep and reporting skills, Gemini briefs | cross-cutting topics that run for weeks |
| Decisions | the human, monthly digest, Gemini (notion-project-brief) | Gemini QA, Claude when checking constraints | the decision log, the source of constraints |
| Reports | all reporting and prep skills | the human, Monthly digest | an archive of everything generated |
| Risks | risk-register | client-meeting-prep, weekly-overview, digest | a live risk register with Visibility |
| Tasks Tracker | the human, prep skills (the Source field) | the human | the PM's personal operating system: all of their tasks across projects and outside them, managing their own capacity; it does not duplicate Jira |
| Inbox | the human (quick capture) | the human (daily triage) | parking lot |
| Knowledge Base | the human, Claude | everyone | documentation, PM Toolkit, guides |
| Projects / Workspaces | the human during onboarding | all skills through the config | anchor pages for relations |
| Current State (one page per project) | daily-current-state-distillation | the human, Gemini, any skill at startup | a distillation of "what is happening right now" |

## Layer 3. The brain: Claude Cowork

Three components:

### 3.1 Memory and context
- **Cowork global instructions** ("PM Workspace"): who I am, the table of active projects, a short cheat sheet for the default project. Loaded into every session.
- **Claude memory** (memory): facts about me, the stack, preferences (the language of reports, the ban on em dashes, and so on). It lives in the account and is available both in Cowork and in chat.
- **The `projects/` registry**: a synchronized skill infrastructure with one file per project. This is not "one more document", it is the single source of truth about the state of a project (`03-project-config.md`). Since 0.7.0 `_standards.md` sits next to it: the PM Toolkit standards shared by all projects (`14`).

### 3.2 Skills library
The handover package contains 21 engines (the `pm-control-tower` plugin). The author's instance keeps about 50 entries in the synchronized folder: the same engines plus project adapters, stock Anthropic skills and personal skills, which are not in the package. Categories, the catalog and the anatomy are in `04-skills-library.md`. The key property: an engine skill starts with Step 0 (identify the project, read the config) and ends with a Report Storage section (where to save the result and with which properties).

### 3.3 Execution environment
Cowork gives Claude: file tools, a bash sandbox, Python/Node, a browser, MCP connectors, and access to Mac folders through the bridge. Sessions can be local (Claude Desktop) or cloud-based (a container that sees the Mac through the bridge). This affects skills: local paths such as `/Users/<user>/...` are reachable only through the bridge, so skills describe how to find the data in both modes.

## Layer 4. Autopilot

Two schedulers:

1. **Cowork Scheduled Tasks** (Claude Desktop, locally on the Mac): 15-20 tasks on a cron schedule, each of them a short prompt that invokes the skill(s) for a specific project and requires the result to be saved into the Reports DB. This is the main working autopilot.
2. **Cloud Routines** (Claude Code Remote): tasks that do not need the Mac. There are six right now: the monthly Automation Health Check (skill drift against the configs), Monthly Memory Digest (a digest of the state of every active project, appending decisions that were never recorded into the Decisions DB), Client Satisfaction (the 1st of the month) and Project Health Check (the 2nd of the month, `project-lifecycle`, `14`); plus the daily Acme daily Slack sync and Acme threads -> Jira tickets.

The full schedule and the prompt template are in `05-autopilot.md`.

## Layer 5 (optional). The second agent: Gemini

Needed when Notion accumulates a history that Claude cannot re-read in a single request (a year's worth of transcripts), and when independent QA of decisions against agreements is required. Gemini does not write code and does not touch project files other than its own in `.ai/`. Interaction happens through files under the `.ai/CONTRACT.md` protocol, with a single-writer rule. Details in `09-gemini-optional-layer.md`. Without Gemini the framework is fully operational: its functions are partly covered by the Decisions DB, the Current State pages and the Monthly Memory Digest.

## Data flows: three end-to-end examples

### Example A. A client's Slack message becomes a ticket
1. 07:05 `acme-daily-slack-sync` invokes `slack-collector` for yesterday: new threads in the Threads DB with a status (Closed / Spectator Mode / Awaiting Reply / Need Follow-up / Replied), and a red icon if the last author is not from our team.
2. The same run does a 14-day review pass over the non-Closed threads (new comments, reclassification) and a gap analysis of "threads without tickets".
3. 09:12 `daily-process-mail-0910` collects the mail, then `inbox-responder` takes the Awaiting Reply threads, classifies them, pulls in context (Sentry, logs, Jira, Topics), and writes a draft reply into the thread and onto the Inbox Review page.
4. In the morning the PM opens the Control Tower: Awaiting Reply with drafts, and decides what to send and what to turn into a ticket (`jira-management` or `thread-ticket-sync`).

### Example B. A client meeting on Tuesday
1. 16:02 `tuesday-client-prep` invokes `client-meeting-prep` for the "Status Sync" type from the config: Jira for the week, threads, risks from the Risks DB, open questions from previous meetings.
2. The result goes into the Reports DB with Type = Client Meeting Prep, and new tasks into the Tasks Tracker with Source = client-meeting-prep.
3. 17:00 the meeting; Notion AI writes the transcript and summary into the Meetings DB.
4. After the meeting the PM drops the link into Claude ("meeting <url>"), and `notion-meeting-topics` appends a bilingual report with decisions and action items to the same page.
5. On Monday `topic-manager` (weekly mode) and `weekly-overview` pick this meeting up into topics and into the weekly overview; on the 1st of the month the Monthly Memory Digest checks whether the decisions from the meeting reached the Decisions DB and appends the missing ones.

### Example C. Production went down overnight
1. Thursday 22:10 `stability-scan`: unresolved Sentry issues across the projects in scope, a week of CloudWatch logs from disk, the top 3 with traces, an English report for the client, Jira tickets for the new defects, phase 2 with `acme-debug` for a deep RCA.
2. On Friday morning the PM sees the report in the Reports DB and the tickets on the board, and discusses them at the Friday Review (whose prep has already included those tickets).
3. If a separate investigation is needed, the PM (or Gemini through a brief) files a task, Claude runs `acme-debug`, and the report goes into `.ai/reports/` or into the Reports DB.

## What makes the system coherent

- One linking key between systems: the Jira ticket key. The same key appears in `.ai/` file names, in Related Jira on risks, and in reports.
- One relation model in Notion: everything is tied to Project and Workspace.
- One config registry for all skills.
- One place for results: the Reports DB. Local copies only as a duplicate.
- One arbiter: the human. Agents escalate, they do not decide on their own.
