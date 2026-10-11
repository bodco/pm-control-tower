# 18. Skills cheat sheet: what to say and when

[Українською](../uk/18-skills-cheatsheet.md) · [Back to contents](README.md)

A one-page answer to "which skill do I have for this, and how do I start it?". It covers
the 22 skills of the `pm-control-tower` plugin, grouped by the job they do in a PM's week.
How each skill works inside, what it reads and how it degrades:
[04. Skills library](04-skills-library.md).

**Before you start.** You need Claude Cowork with the `pm-control-tower` plugin, the Notion
template duplicated into your workspace, and one project config file `projects/<slug>.md`
(a slug is a short project id such as `orbit`). The whole path with prompts:
[16. Step by step](16-runbook.md). **Orbit** on this page is an example project name.

---

## How to start any skill

1. **Say what you want in plain words, in English or Ukrainian.** There are no commands to
   remember. Every skill carries trigger phrases in its description and Claude picks the
   one that matches. The phrases below are examples, not passwords.
2. **Name the project.** Skills read the project config first. Without a project name, a
   ticket key or a channel from a config, the skill asks which project you mean, even when
   you have only one: mixing two projects is the worst failure of the system. Three skills
   work across all projects on purpose: `mac-mail-collector` and `inbox-responder` (each
   thread is routed to its own project) and `weekly-overview` when you ask for all
   projects.
3. **Add the period or the link when it matters:** "for last week", "since Monday", the
   Notion link of a meeting.
4. **To run it on a schedule, use the same sentence** in a scheduled task, with the project
   and period written out ([05. Autopilot](05-autopilot.md)). Skills that need your Mac
   (mail, live tips, local repos, log files on disk) or a browser run only from a task
   that runs on your computer, and only while it is awake.
5. **Results land in Notion or in the chat, nothing reaches the client without you.**
   Skills write pages and rows, prepare drafts and may create items you can undo within 5
   minutes (a backlog ticket, a row). Messages to the client, Done transitions, deletions
   and anything on the client's board always wait for your OK.

**If nothing happens or the result looks wrong:**

- the wrong skill fired (for example team prep instead of client prep): name the skill,
  "run client-meeting-prep for Orbit";
- the skill says there is no config: create it first, "set up a new project Orbit, case A";
- the report is thin: read the Data Completeness line at the top, it shows which source
  was EMPTY, SKIPPED or FAILED;
- the plugin is not picked up at all: check it is installed and enabled in Cowork, and that
  you have not also uploaded a separate skill with the same name, which shadows the plugin.

## Where to start

Four skills give value on day one: `projects` (fill in one config), `daily-team-prep`,
`weekly-overview` and one collector (`slack-collector`, or `mac-mail-collector` if your
work lives in mail). Add the rest when a routine starts to hurt.

A typical weekday morning on autopilot, one scheduled task per line, in this order:
"collect Slack for Orbit since yesterday", "process mail", "draft replies", then "prep me
for the Orbit team sync" an hour before the sync.

---

## I want to... (find the skill by the moment)

| When | I want to... | Skill | Say it |
|---|---|---|---|
| Morning | get yesterday's Slack into Notion | `slack-collector` | "collect Slack for Orbit since yesterday" |
| Morning | get my mail into Notion | `mac-mail-collector` | "process mail" |
| Morning | see what needs my reply, with drafts | `inbox-responder` | "draft replies for Orbit" |
| Before a meeting | be ready for the standup or internal sync | `daily-team-prep` | "prep me for the Orbit standup" |
| Before a meeting | be ready for a client call | `client-meeting-prep` | "client prep for the Orbit planning" |
| During a call | get hints while I talk | `live-tips` | "live tips Orbit", at the end "end live" |
| After a meeting | turn the notes into decisions and action items | `notion-meeting-topics` | "meeting <Notion link>" |
| After a meeting | log "can you just add one more thing" | `change-request` | "the client asks to add a CSV export on Orbit" |
| Weekly | see last week across all projects | `weekly-overview` | "weekly overview for all projects" |
| Weekly | check the board before the review | `jira-board-health` | "board health for Orbit" |
| Weekly | know what can go wrong | `risk-register` | "update the risk register for Orbit" |
| Weekly | keep long-running subjects in one place | `topic-manager` | "update topics for Orbit for the week" |
| Weekly | find Slack threads that never became tickets | `thread-ticket-sync` | "which Orbit threads have no tickets for September" |
| Monthly | prepare a client report | `client-report` | "monthly client report for Orbit" |
| Monthly | get team metrics | `velocity-report` | "velocity for Orbit for September" |
| Monthly | answer "how is the client feeling?" | `client-satisfaction-tracker` | "how is the client on Orbit" |
| Something broke | see the errors, for example after a deploy | `sentry-assistant` | "what is new in Sentry on Orbit since yesterday" |
| Something broke | a weekly picture of errors and logs | `stability-scan` | "stability scan for Orbit" |
| Release | know what is on stage but not on prod | `deploy-analysis` | "stage vs prod for Orbit" |
| Any time | create or move a ticket | `jira-management` | "create a bug in Orbit: ..." |
| Project events | start, take over, check or close a project, onboard a person | `project-lifecycle` | "set up a new project Orbit, case A" / "a new developer joins Orbit on Monday" |

---

## The six groups

### 1. Foundation

| Skill | What you get | Say it | Rhythm | Needs |
|---|---|---|---|---|
| `projects` | The config registry every other skill reads first: one file per project plus the shared rules. You edit it, you do not call it | not called directly | when a project fact changes | the files |
| `project-lifecycle` | Kickoff (config, Notion pages, charter, first decision), handover from another PM, monthly health check, team onboarding and offboarding, closure. Case A = new project, B = taking over, C = non-development project | "set up a new project Orbit, case A" / "project health check Orbit" | on demand; health check monthly | Notion, the config template |

### 2. Collect and sort

| Skill | What you get | Say it | Rhythm | Needs |
|---|---|---|---|---|
| `slack-collector` | Project channels in the Threads DB, one page per thread, no duplicates, with a status that says whose turn it is | "collect Slack for Orbit for the week" | daily, early morning | Slack (Claude connector, your own local MCP server, or Chrome), Notion |
| `mac-mail-collector` | New incoming and sent mail, routed to projects by the configs, as full threads in the Threads DB | "process mail" | daily, morning | a Mac with Mail.app and the export agent, see [10a. Mail collector setup](10a-mail-collector-setup.md) |
| `inbox-responder` | A reply draft in the thread's language for every thread in Awaiting Reply, Need Follow-up or AI Review that has none, with context. Never changes the status | "draft replies for Orbit" | daily, after the mail run | Threads DB; tracker and Sentry optional |
| `thread-ticket-sync` | Which threads have no ticket on the client's board, then the ones you pick become tasks there | "which Orbit threads have no tickets for September", then "create tickets for Orbit: 2, 4" | on demand | the client board in the config, Chrome in Cowork |
| `topic-manager` | Long-running subjects from meetings and threads in the Topics DB, each linked to its sources | "update topics for Orbit for the week" | weekly | Meetings and Threads DBs |

### 3. Prepare and call

| Skill | What you get | Say it | Rhythm | Needs |
|---|---|---|---|---|
| `daily-team-prep` | Prep for the internal sync: who works on what, board movement, blockers, Slack topics, open action items, points to raise. Covers the time since the previous prep | "prep me for the Orbit team sync" | before each internal sync | tracker, Slack, Meetings DB |
| `client-meeting-prep` | Prep for the client meeting types in the config (planning, status, 1-1, review): progress, blockers, risks, what to ask | "client prep for the Orbit review" | before each client meeting | the meeting schedule in the config, tracker |
| `live-tips` | Short tips in the chat during the call (a CR-like ask, a promised date, a contradiction with a decision), then a Meetings DB page with the transcript | "live tips Orbit", to end: "end live" | during a call | a Mac with Apple Silicon, see [17. Live tips](17-live-tips.md) |
| `notion-meeting-topics` | A bilingual (EN and UK) report of one meeting, appended to the same Notion page: decisions, action items, topics | "meeting <Notion link>" | after a meeting | the meeting page in Notion |

### 4. Report

| Skill | What you get | Say it | Rhythm | Needs |
|---|---|---|---|---|
| `weekly-overview` | The past week per project: done, meetings, threads, risks, open questions, outlook. Result: Reports DB | "weekly overview for all projects" | Monday morning | Notion; tracker, Slack, Sentry when configured |
| `client-report` | A client report in English (weekly, monthly or steering, a one-page executive update): outcomes, hours against the contracted cap, blockers, decisions needed. Result: a Reports DB page, you send it | "monthly client report for Orbit" | on demand, usually weekly or monthly | tracker; time report exports for hours |
| `velocity-report` | Monthly team metrics: throughput, cycle time, load per person, trend against last month, with a note when the team or scope changed | "velocity for Orbit for September" | 1st of the month | tracker API |
| `client-satisfaction-tracker` | The client's tone across Slack, mail and meeting transcripts, early warning signals, trend | "how is the client on Orbit" | twice a month | Slack, Threads DB, transcripts |

### 5. Scope and risk

| Skill | What you get | Say it | Rhythm | Needs |
|---|---|---|---|---|
| `change-request` | Every client ask sorted: A (trivial, log only), B (real hours), C (touches data, money, security or public contracts: always a CR). An Extras Log of work done beyond scope, a CR draft in English, the client's decision in the Decisions DB | "the client asks to add X on Orbit" / "CR-3 approved" | on demand, and from threads tagged Scope Change | Notion |
| `risk-register` | A living RAID register (risks, assumptions, issues, dependencies) from all sources, plus an internal and a client-safe report | "update the risk register for Orbit" | weekly, before the review | Notion; other sources when configured |

### 6. Tracker and stability

| Skill | What you get | Say it | Rhythm | Needs |
|---|---|---|---|---|
| `jira-management` | Create, update, search, move and label tickets by the rules in the config | "create a bug in Orbit: ..." / "move ORB-123 to Testing" | on demand | Jira access |
| `jira-board-health` | Board hygiene: stale tickets, missing labels, Done without a version, long-blocked, stuck in a status, work without an owner | "board health for Orbit" | weekly, before the review | tracker API |
| `stability-scan` | A weekly digest of unresolved errors and log patterns with traces, a client-safe summary, tickets for the critical ones | "stability scan for Orbit" | weekly, in the evening | Sentry token, log exports on disk |
| `sentry-assistant` | Quick Sentry questions: what is new, details with the trace, search, status changes | "what is new in Sentry on Orbit" | on demand | Sentry (the reference setup is self-hosted) and a token |
| `deploy-analysis` | Stage against prod across the project repos: stage release notes, what is not promoted yet | "stage vs prod for Orbit" | on demand or daily | local clones of the repos |

---

## Your own skills

Project-specific skills (a debugger for one client's stack, an export from a portal without
an API) are normal. Give them the project prefix (`<slug>-<what>`) and keep them out of the
shared plugin, see "Core vs adapters" in [04](04-skills-library.md). Keep a personal cheat
sheet of your own in the same format: group, what you get, the phrase, the rhythm.
