# 02. Notion Control Tower: the knowledge hub

## The idea

Notion here is not a wiki and not a document store, but structured memory made of databases that relate to each other. Summer 2025: the first goal was to gather the whole project context in one place (meetings, threads, decisions). The attempt to use the built-in Notion AI for analysis failed on complex queries ("find the risks for the quarter"). So Notion stayed a store and a hub, and the analysis moved to Claude.

The main architectural choice: **databases are shared across all projects, separation happens through relations**. Not "a folder per project", but one Threads database, one Meetings, one Reports and so on, where every record has a `Project` relation (a page in Projects DB) and a `Workspace` relation (a page in Workspaces DB, that is the client or the company). This gives:
- one skill works with every project, only the filter changes;
- cross-project overviews (weekly-overview across all projects) without duplication;
- the price: a strict rule of "never mix projects" (Default Project Rule in `03-project-config.md`).

## The CONTROL TOWER page

The PM's operations center: the page you open in the morning and before every meeting, where you see the full picture. Structure from top to bottom:

**The "My day" section**
- **Inbox** - a parking lot for quick thoughts. One line, no details. Processed once a day: Route into Tasks Tracker or delete.
- **Today / This Week** - a kanban and a list of active tasks. The main working view.
- **Awaiting Reply** - threads (Email, Slack, Other) waiting for a reply, split by type.

**The "Fresh reports" section**
- Today's Reports - everything generated today. Come here before a meeting.
- This Week's Reports - the week in review.

**The "Project health" section**
- Tasks by Status / Priority (charts), Threads by Status (chart), Overdue, Open Risks.

**Navigation** - the full databases for a deep dive.

Quick action buttons (Quick Add into Inbox, Tasks) are placed in two columns at the top.

## Databases

> The schemas below were taken from the real data sources through Notion MCP. Property names are verbatim, with the emoji where they exist. This matters: a skill that writes into a `Title` property instead of `Thread Name`, or into `Projects` instead of `Project`, fails or silently does not write the relation.

### Relation names

In all databases the relation to Projects DB is called `Project`, and the one to Workspaces DB is `Workspace` (singular, no emoji). Cross-relations between databases also carry no emoji: `Meetings`, `Threads`, `Topics`, `Knowledge Base`, `Inbox`, `Tasks Tracker`. Verified against the live schemas of Risks, Decisions and Tasks Tracker. The earlier table with four naming variants (`Projects`, `Workspaces`, `🏛️ Workspaces`, names with emoji) is historical; a skill or template that still uses it is out of date. From Projects DB itself the back-relations do carry emoji (`💬 Meetings`, `📨 Threads`, `🧵 Topics`, `📚 Knowledge Base`), but skills write from the side of the child databases.

### 📨 Threads
Inbound communications from every channel. One page = one thread.

> This is a primary source, not an index. The **full text** of every message and every reply goes into the page body, not a preview. The reason is principle 10 (`00-manifest.md`): a conversation that disappears cannot be restored, and any report built on incomplete threads quietly lies. That is why the collectors carry the hard rule "never leave the page body empty" and the rule of splitting into 2000-character blocks.

| Property | Type | Value / rule |
|---|---|---|
| `Thread Name` | title | the thread subject |
| `Type` | multi_select | Email, Slack, Signal, Zoom, Other |
| `Status` | select | `Spectator Mode` (does not concern us, we watch), `Awaiting Reply` (they are waiting for us), `Replied`, `Need Follow-up` (we are waiting for them, a reminder is due), `Closed`, `AI Review` (created or updated by an automation, a human should confirm; the template has an AI Review Queue view) |
| `Category` | select | set by inbox-responder: Error/Bug, Data Question, Scope Change, Blocker, Status Update, FYI |
| `Context Sources` | multi_select | Sentry, AWS Logs, Jira Board, Topics DB, Knowledge Base, LLM Only (what inbox-responder used) |
| `Draft Response` | text | a draft reply in the language of the thread |
| `Description` | text | a short preview; the full text only in the page body |
| `Email Link`, `Slack Link` | url | links to the source |
| `Reported at` | date | the first message |
| `Last Reply Date` | date | the last comment (updated by the 14-day review pass) |
| `Jira Key`, `Jira Sync`, `Jira Sync Checked` | text, select, date | the link to a ticket: key, sync state (Created, Matched, Skipped (info), Rejected by PM, Error), check date; maintained by `slack-collector` Step 4 or a cloud threads-to-tickets task |
| `Follow-Up Check` | formula | an "all good" checkbox; unchecked = a follow-up is needed |
| `ID` | auto-increment | |
| `Project`, `Workspace` | relation | mandatory |
| `Topics`, `Knowledge Base`, `Tasks Tracker`, `Inbox` | relation | links to the other databases |
| Page icon | 🔴 or empty | a red dot if the last author is not from our team (this is the page icon, not a property) |
| Page body | blocks | the full thread text in 2000-character blocks |

The status classification rules live in `slack-collector` (Step 3), `AI Review` is set only when the confidence of the rule is < 70%. Once a day the 14-day review pass re-reads non-Closed threads, appends new comments and reclassifies the status.

### 💬 Meetings
Written by Notion AI Meeting Notes (transcript + summary + action items). Then `notion-meeting-topics` appends a bilingual report to the same page.

| Property | Type | Value |
|---|---|---|
| `Meeting Name` | title | must contain a recognizable suffix ("Acme Internal Daily", "SG Weekly Thursday Sync"), because searching by name is the main way to find a meeting without SQL |
| `Date` | date | with the time |
| `Meeting type` | multi_select | Product Discussions, Daily Sync, Sprint Planning, Weekly Team Sync, Internal Daily |
| `Summary` | text | |
| `Project`, `Workspace` | relation | |
| `Topics`, `Tasks Tracker` | relation | |
| `Parent item`, `Sub-item` | relation (self) | meeting series |

The transcript is pulled only when quotes are needed (client-satisfaction, Gemini briefs).

### 🧵 Topics
Cross-cutting themes that run through several meetings and threads.

| Property | Type | Rule |
|---|---|---|
| `Topic Name` | title | |
| `Status` | select | AI Review, Open, Under Discussion, Resolved |
| `Progress` | status | Not started, Planned, In progress, Under Review, Done, On Hold, Won't Do; recalculated by a skill, not by hand |
| `Priority` | select | High, Medium, Low |
| `Summary` | text | **stays empty**, all of the content is in the page body |
| `Date`, `Due date` | date | |
| `Meetings`, `Threads`, `Knowledge Base`, `Tasks Tracker`, `Inbox` | relation | no emoji; a name mismatch has already broken a skill |
| `Project`, `Workspace` | relation | |
| `Parent item`, `Sub-item` | relation (self) | topic hierarchy |

Filled by: `topic-manager` (on-demand and weekly mode), Gemini `notion-project-brief`. A special page in Topics: **Claude Skills & Prompts** (the README of the skills library and the schedule, with child documentation pages).

### Decisions (the decision log)

| Property | Type | Options / rule |
|---|---|---|
| `Decision` | title | the decision in one sentence |
| `Date` | date | |
| `Area` | select | Access, Scope, Process, Tech, Team, Client |
| `Context` | text | why exactly this way |
| `Source` | url | the meeting or the thread |
| `Status` | select | Active, Superseded, Cancelled |
| `Superseded By` | relation (self, DUAL) | the new decision that replaced this one |
| `Supersedes` | relation (self, DUAL) | the reverse side of the same pair |
| `Alternatives rejected` | text | what was rejected and why |
| `Trade-off` | text | what we deliberately gave up |
| `Review trigger` | text | under what conditions we come back to the decision |
| `Door` | select | One-way (expensive to reverse), Two-way (cheap) |
| `Stated by` | text | who said it (text, not person: the client's people are not Notion users) |
| `Project`, `Workspace` | relation | |

What the database has: `Alternatives rejected` and `Stated by` were added, and `Superseded By` went from a text field to a self-relation paired with `Supersedes`. Deliberate deviations from CONTRACT: `Rationale` is not added (`Context` plays its role), there is no `Disputed` status (a disagreement is captured in a comment, not in a state). The one text value of `Superseded By` that existed before the conversion is preserved in the `Context` of that decision with a note about the restore. `Trade-off`, `Review trigger` and `Door` were added from the Decision Log and from the "Technical start" of the PM Toolkit; a separate Decision Log page per project is no longer needed (the standard is in `projects/_standards.md` section 9, and skills do not invent a trade-off when the source does not name one). Rules: decisions are never deleted, only Superseded/Cancelled; any change in the state of the project = a row here on the same day; the Monthly Memory Digest appends the decisions missed in meetings.

### 🐳 Reports
The archive of everything generated.

| Property | Type | Options |
|---|---|---|
| `Report Name` | title | `<Name> - <date>` |
| `Date` | date | |
| `Type` | select | Weekly Overview, Daily Team Prep, Client Meeting Prep, Stability Scan, Board Health, Velocity Report, Daily Work Report, Client Weekly Report, Client Monthly Report, Risk Register, Client Satisfaction, Company Report, Deploy Analysis, Monthly Digest, Automation Health Check; since 0.7.x skills create these on the first write: Project Kickoff, Project Handover, Project Health Check, Team Change, Project Closure, Change Request, Steering Update |
| `Skill` | select | weekly-overview, daily-team-prep, client-meeting-prep, stability-scan, jira-board-health, velocity-report, daily-work-report, client-report, risk-register, client-satisfaction-tracker, company-report, deploy-analysis; since 0.7.x: project-lifecycle, change-request |
| `Visibility` | select | Internal, External |
| `Summary` | text | 2-3 sentences |
| `Project`, `Workspace` | relation | |
| `ID` | auto-increment | |

The `Monthly Digest` and `Automation Health Check` options were created automatically on the first write from the cloud routines: Notion creates a new select option by itself, so new report types do not have to be set up by hand.

### Risks
A live register maintained by `risk-register`.

| Property | Type | Options |
|---|---|---|
| `Name` | title | |
| `Status` | select | AI Review, Open, Monitoring, Mitigated, Closed, Realized |
| `Severity` | select | Critical, High, Medium, Low |
| `Likelihood` | select | Almost Certain, Likely, Possible, Unlikely |
| `Category` | select | Technical, Resource, Scope, Client, Dependency, Security, Timeline, External |
| `Visibility` | select | Internal, External, Both |
| `Source` | multi_select | Jira, Slack, Meeting, Email, Manual, Sentry |
| `Owner`, `Summary`, `Mitigation`, `Related Jira` | text | |
| `First Seen`, `Last Updated` | date | |
| `Kind` | select | Risk, Assumption, Issue, Dependency |
| `Project`, `Workspace` | relation | unified |
| `Topics` | relation | |

Every risk has a dossier in its body: description, symptoms, impact, mitigation plan, escalation triggers, Signal History. With no signals for 30+ days it is closed. Visibility decides what goes into an external report.

### Tasks Tracker: the PM's personal operating system
This is not "one more task tracker" and not a duplicate of Jira. The axiom:

| Criterion | Jira (or the client's tracker) | Tasks Tracker in Notion |
|---|---|---|
| Who it is for | the whole team and the project stakeholders | the PM only |
| Scope | the tasks of one project: features, bugs, spikes | all of the PM's tasks end to end: project A, project B, company matters, personal ones |
| Objective function | development status, transparency for the client | managing personal capacity: a realistic load for the day and the week |
| Why not merge them | the PM's personal and cross-project tasks do not belong on a team board | tasks scattered across 3-5 client trackers plus a notebook make the total time limit impossible to see; the result is an illusion of free time and then overload |

Three consequences:
1. Skills (`daily-team-prep`, `risk-register`, `jira-board-health`) put their recommendations ("check the branch", "remind about the invoice") exactly here with the `Source` field, not into Jira.
2. The link to Jira is reference only: an optional text field `Jira Issue Key` (the PM's call), with no synchronization. The PM runs their day in Notion, the team delivers in Jira.
3. On a project with no API to the client's tracker, Tasks Tracker becomes the only place where the PM sees their commitments on that project.

| Property | Type | Options |
|---|---|---|
| `Task name` | title | |
| `Status` | status | To Do, In progress, Under Review, Done, On Hold |
| `Priority` | select | High, Medium, Low |
| `Effort level` | select | Small, Medium, Large |
| `Type` | select | Task, Meeting Note, Email, Slack, Decision, Info, Idea |
| `Source` | select | manual, inbox, daily-team-prep, weekly-overview, client-meeting-prep, jira-board-health, risk-register, stability-scan, client-report, slack-collector; since 0.7.x: project-lifecycle, change-request |
| `Jira Issue Key` | text | a reference to the ticket if the task is tied to the board. No synchronization, just a link |
| `Inbox Status` | select | New, Routed |
| `Assignee` | person | |
| `Due date` | date | |
| `Description` | text | |
| `Project`, `Workspace` | relation | |
| `Threads`, `Meetings`, `Topics`, `Knowledge Base`, `Inbox` | relation | |

`Source` is the key: it is the filter of "what the skills threw at me" against "what I set myself". The capture rule: < 2 min, do it right away; > 2 min with no deadline, into Inbox; > 2 min with a deadline or context, straight here. The link to Jira is a reference through the `Jira Issue Key` text field. Two-way synchronization is deliberately absent: the PM runs their day in Notion, the team delivers in Jira.

### Inbox
Quick capture (Inbox DB, data source `~~inbox-db`). Processed every day: Route (it becomes a task, Inbox Status = Routed) or delete. These are the PM's own thoughts and ideas; external inbound lives in Threads. Two different entities, not worth merging.

### 📚 Knowledge Base
Documentation: Acme Documentation (component documentation, Scheduled Jobs), Project Management (PM Toolkit: metrics, templates, meetings, senior practices, KT/Handover Checklist), CV, learning. The human part; skills almost never write here. The exception: the PM Toolkit has a machine-readable version in `projects/_standards.md` that the skills work from (see `14`); the Toolkit pages carry callouts linking to it and to the databases that replace the templates.

### Projects and Workspaces
Anchor pages. Projects DB: one page per project. Workspaces DB: one per client/company (client Acme, our company, ...). The IDs are written into the config and used as relations in all the other databases.

### The Current State page (per project)
A distillation of "what is happening right now": open questions, planned deploys, unresolved threads, recent decisions. Updated every day incrementally (`daily-current-state-distillation`, the last 2 days). The first thing an agent or a human reads after a break.

### The three time scales of memory (so that Current State, Topics and Digest do not get mixed up)

| Layer | Horizon | What it is | When to read it |
|---|---|---|---|
| Current State | hot, 48 hours | an operational snapshot of "today and yesterday" | every morning, before any action on the project |
| Topics DB | warm, 1-3 months | cross-cutting themes and problems across meetings and threads | before a themed meeting, when preparing a brief |
| Monthly Memory Digest (Reports) | cold, month/quarter | a retrospective for management, chronic problems, lessons | on the 1st, for the monthly report, when handing the project over |

## The daily workflow with Control Tower

**Morning (~09:00, after daily-work-report):**
1. Inbox: any new items? Process them in 2 min.
2. Today's Reports: what has already been generated (the daily report, draft replies, prep).
3. Today / This Week: the plan for the day.
4. Overdue: is anything past due?

**Before a meeting (~16:00, the prep skills have already run):**
1. Today's Reports: open the fresh prep.
2. The new tasks from the prep are already in Tasks Tracker.

**During the day:** a thought or a task goes into Inbox; the skills run, and tasks appear with the Source field set.

**End of day:** Inbox triage; close what is done; one line on "tomorrow's #1". No analysis, that is work for the morning.

## Technical details you need to know

- **Two Notion connectors**: the official Notion MCP (search, fetch, create/update pages, AI search) and the local REST connector `notion` through the bridge. Cloud tasks use the official one; SQL queries with `query_data_sources` require an Enterprise plan and do not work, so filtering is done through `notion-search` with `data_source_url` + relation.
- **Data source ID versus database ID**: the skills use `collection://...` data source identifiers, not database URLs. They are written into the project config (shared across all projects).
- **The 2000-character limit per block**: thread and report bodies are cut into blocks.
- **Property names have to match verbatim**, otherwise the relation is silently not written (a real bug with emoji prefixes). After the unification there are no emoji in the relation names of the child databases.
- **The client's Notion** (the DEV Board in the client's workspace) is a separate workspace, we write into it through a CSV import (`acme-notion-jira-sync`) or through the browser (`thread-ticket-sync`), not through our own MCP.

## Identifiers

| Object | ID |
|---|---|
| CONTROL TOWER page | `~~control-tower-page` |
| Reports DB (data source) | `collection://~~reports-db` |
| Threads DB | `collection://~~threads-db` |
| Meetings DB | `collection://~~meetings-db` |
| Topics DB | `collection://~~topics-db` |
| Knowledge Base DB | `collection://~~knowledge-base-db` |
| Risks DB | `collection://~~risks-db` |
| Decisions DB | `collection://~~decisions-db` |
| Inbox DB | `collection://~~inbox-db` |
| Tasks Tracker DB | `collection://~~tasks-tracker-db` |
| Projects DB | `collection://~~projects-db` |
| Workspaces DB | `collection://~~workspaces-db` |
| Skills README (Claude Skills & Prompts) | `~~skills-readme-page` |
| Acme: Project page / Workspace page | `~~project-page` / `~~workspace-page` |
| Acme: Current State page | `~~current-state-page` |

For a new PM these IDs will be different: they create their own Control Tower (the structure can be duplicated) and write their own IDs into their own config. The skills do not hold IDs in their body, they take them from the config.
