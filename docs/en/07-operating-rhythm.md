# 07. The PM's operating rhythm with the framework

This document describes what a real day, week and month look like once the autopilot is running. The principle from the PM operating rhythm page in the PM Toolkit still holds: heavy analysis in the morning, routine during the day, no analysis in the evening. The framework only moves the boundary: what used to be "morning analysis" (go through the board, re-read the chats, gather the blockers) is now already waiting for you at 09:00.

## The day

### Before 09:00 (autopilot, no human involved)
- 07:05 Yesterday's Slack in Threads, with statuses. Threads whose last author is not one of us are marked with a red dot.
- 09:01 The daily work report: what happened yesterday (calendar, meetings, threads, Jira movement, Slack) and the plan for today. In the Reports DB and locally.
- 09:12 Mail from Mail.app into Threads; inbox-responder drafts replies to everything that is waiting on us.
- The project's Current State is updated for the last 2 days.

### 09:00-09:30 The morning ritual (high energy, 15-30 min)
1. Open CONTROL TOWER.
2. Today's Reports: read the daily-work-report. This replaces "go through everything by hand".
3. Awaiting Reply: review the inbox-responder drafts. Three actions per thread: send it (with your own edits), turn it into a ticket (`jira-management` or thread-ticket-sync), or defer it with Need Follow-up.
4. Inbox: process it in 2 min (Route / delete).
5. Today / This Week + Overdue: pick the top 3 for the day. This is a menu, not a contract. Here you see the whole load together: both projects, company matters, personal. If today's total Effort level does not fit into the day, something gets moved before the day starts rather than at 19:00.
6. Red signals: new Sentry errors from the prep, critical risks, deadlines. If something is on fire, `acme-debug` or `sentry-assistant` in a single sentence.

### 11:08 → 12:00 Internal sync (every other day)
- 11:08 daily-team-prep in the Reports DB: who is working on what, movement on the board, blockers, topics from Slack, action items, Sentry over the last 24 h, and an empty "My notes" block.
- 11:45 the PM adds notes, 12:00 a 10-15 min meeting, right after it unblock whatever surfaced (tickets, replies).
- The skill determines from the config whether today is a sync day (week A Mon/Wed/Fri, B Tue/Thu).

### The day (the work zone)
- Async replies in batches 2-3 times a day, not reactively. The drafts already exist, so a batch takes minutes.
- Maintaining artefacts as you go: decisions into the Decisions DB (one sentence, date, source), state changes into the config, a risk into Risks via "check the risks" or by hand.
- The client asked for "just one more small thing"? `change-request`: bucket A (logging, even when free), B (hours, a slot in planned work or a small CR) or C (touches data, money or security: always a CR). At the end of the month the Extras Log shows how much goodwill went beyond scope.
- A meeting with the client? The prep is already in the Reports DB 55 minutes beforehand. After the meeting: "meeting <url>" → a bilingual report with action items on the meeting page.
- Engineering tasks: "review the core service <PR>", "find the cause of <symptom>", "what is deployed where", "compare the beneficiaries" + files. Each takes minutes instead of hours, with the result in the Reports DB or `.ai/reports/`.
- A thought or a task → Inbox (Quick Add).

### End of the day (zero energy, 5 min)
- Completed → Done in the Tasks Tracker.
- Inbox triage.
- One line: what is number 1 tomorrow (in the Tasks Tracker or the Inbox).
- No analysis of the day: the daily-work-report will do that at 09:01.

## The week

| Day | Autopilot | Human |
|---|---|---|
| Monday | 06:32 topics into Topics; 08:09 weekly-overview; 16:09 planning-prep | Morning: read the weekly-overview, it is the "state of the world" for the week: what is done, open questions, risks, outlook. Set the focus of the week. 17:00 planning with the client based on the prep |
| Tuesday | 16:02 status-prep | 17:00 Status Sync: progress, blockers, questions. Deploy window for the core service per `deploy_windows` in the config, if there is anything to promote (deploy-analysis shows this) |
| Wednesday | daily only | A day for deep work: RCA, documentation, strategy, conversations with people |
| Thursday | 16:04 1-1 prep; 22:10 stability-scan | 17:00 1-1 with the Client PM: risks, decisions, a preview of next week. The second deploy window |
| Friday | 16:02 board health + review prep | Morning: read the stability-scan (report + new tickets), decide the priority of defects. 17:00 Review: done list, demo, pipeline. No deploys on Friday |

What has changed compared to the rhythm without the framework: preps and reports are no longer a block in the PM's calendar; the weekly overview becomes an input document instead of an output; the Friday review gets a clean board without a manual pass.

## The month

| When | Autopilot | Human |
|---|---|---|
| The 1st | velocity-report; client-satisfaction (30 days); Automation Health Check; Monthly Memory Digest for each project, appending decisions to Decisions | Read the digest (it is the best starting point for the monthly client report and for the conversation with delivery), read satisfaction (is the client cooling off), fix skill drift from the Health Check, set fixVersion `vYYYY-MM` on Done tickets |
| The 2nd | Project Health Check for each active project (cloud, `project-lifecycle`): 8 RAG areas with evidence | Read the top 3, decide on the risk candidates, put `last_health_check` into the config at the next update |
| The 1st to the 5th | | `client-report` monthly: put the Tempo export into `Time Reports/`, one sentence "produce the monthly client report for August", proofread the docx, send it |
| The 15th | client-satisfaction mid-month | Check the trend against the 1st |
| Any day of the month | | Update the config on any change of state (do not wait for the end of the month) |

## Quarterly and less often

- Review the skill library: what has not run for 90 days, what is worth freezing or renaming; check date-stamped facts.
- Review the client team's Cultural Profile (new people, role changes).
- Revise the autopilot schedule against the actual meeting calendar.
- Archive projects that have ended (`project-lifecycle` closure: checklist, handover pack, `status: archived`), and run the one-off migration of decisions for new ones (`project-lifecycle` handover-in).
- Update this framework and the presentation for colleagues.

## Rhythm for a project without the full stack

If a project has no Sentry or repositories (Delta, Beta or the clinical trials, for example), the rhythm shrinks to: collectors (Slack/mail) → Threads → inbox-responder → meeting preps → weekly-overview → Decisions. In the config the corresponding sources are "none" and the skills skip them. A minimally viable autopilot: 3 tasks (slack/mail sync, daily prep or client prep, weekly-overview).

## An optimisation pass (on the PM's request)

From time to time the PM asks for an optimisation pass over the system ("what can we optimise here"). This is not a regular scheduled ritual but an on-demand request. The mandatory items of such a pass:

0. **The technical backlog.** Go through the "Technical backlog" section of `13-open-questions.md` together with the PM: what we do, what we drop, what waits. This is the only moment when Claude's work queue gets human prioritisation; without it the queue grows on its own and nobody decides whether it is needed at all. The rule: an item that has sat through two passes in a row without movement either gets a date or is deleted.
1. **The boundary between adapter and engine.** Go through the project adapters (`<slug>-*`) and check whether some scenario has already repeated on a second project. If so, it is a candidate for promotion to an engine. And the other way round: check whether a project fact has crept into an engine when it should live in the config.
2. **Duplicate skills.** Two skills doing essentially the same thing get merged into one (as `topic-analyzer` + `weekly-topics-db-update` -> `topic-manager`).
3. **Dead links and silent defaults.** Run the skill linter (`scripts/lint_skills.py`, the author's local tool, not part of the public package): config keys, Step 0, `api_access`, Notion names, placeholders, project-specific words, frontmatter, dashes.
4. **The autopilot schedule.** Are all the tasks still needed, are there tasks that have been doing nothing for months.
