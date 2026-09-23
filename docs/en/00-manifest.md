# 00. Framework manifesto

## The problem we are solving

A PM's work on a multi-channel project drowns in routine. Real numbers from Acme before automation (April 2026):

- 5+ Slack channels to monitor daily
- 3-4 client meetings per week, each requiring preparation and documentation
- 50+ Jira tickets to track, label and estimate
- 2+ hours per week on weekly and monthly reports
- 1 hour per week on board hygiene
- separately: Sentry and CloudWatch scans, data reconciliations, log analysis, which used to take days

The consequence: the PM lives in reaction mode. There is no time left for thinking, risks, strategy or the client relationship. Project context is smeared across chats, mailboxes, people's heads and transcripts, so every decision requires a repeat investigation.

## What the framework promises

1. **Routine runs without a human.** Slack and mail collection, meeting preparation, the weekly overview, the stability scan, the client report, board hygiene, metrics, risks, client sentiment: all of these are skills that run on a schedule by themselves and put the result where the PM will see it in the morning.
2. **All project context in one place, and truly all of it.** Notion Control Tower holds meetings, threads, topics, decisions, risks, reports and knowledge. Not "it exists somewhere", but in structured databases with relations to the project. Completeness here is a requirement, not a wish: see principle 10.
3. **One truth about the state of the project.** The project config file is the single source of truth about the team, access, scope, meetings and integrations. Skills read it instead of carrying facts inside themselves.
4. **Scaling to new projects without rewriting the core.** A new project = a new config + pages in Notion + a schedule + (if needed) a few project adapters. Engine skills pick it up automatically, even if the client has no tracker API: in that case they work with what is available.
5. **Transferability.** You can hand another PM the core (principles, config template, generic skills) and in a day or two they stand up their own Control Tower.

## What the framework does not promise

- It does not replace the PM. It removes routine, not judgement. Decisions about priorities, communicating difficult things to the client, working with people: those stay with the human.
- It does not guarantee correctness without review. Every autopilot report is a draft with links to sources. Automated actions into external systems (creating tickets, messaging the client) stay under human control or are strictly limited.
- It does not work without discipline. If the project config is not updated on the same day the state changed, within a week the skills start lying.
- It does not promise the same depth on every project. A project with full API access (Acme) and a project where the client granted only browser access to their Jira Cloud get the same core but different automation. The level of automation is a property of the project, not of the framework.

## Principles

### 1. Claude Cowork at the centre
A single agent with access to every tool through MCP, to the files on the Mac, to Notion, and which executes skills. Everything else is periphery. This is a deliberate decision: one brain with full context beats several narrow bots.

### 2. Notion as a hub, not as file storage
Notion is needed not as a "wiki" but as structured memory with databases and relations. Every record is tied to a project through a relation, so several projects live in the same databases without mixing.

### 3. Config wins (Rule Zero)
The project config beats any skill, report or old document. Facts in the config carry "as of" dates. Any change of state = an edit to the config the same day + a line in the Changelog + a row in the Decisions DB.

### 4. Never guess the project
If the request does not name the project explicitly, the skill asks instead of guessing. Mixing data from two projects is the worst failure of the system, worse than any error in a single report.

### 5. Skills are recipes, not code
A skill is a markdown file with triggers, steps, an output format and a place to save it. It is born out of routine ("I keep asking Claude the same thing"), debugged in chat, and documented along the way.

### 6. Engines separate from project facts
A skill without a project prefix (`weekly-overview`, `slack-collector`) is an engine that reads the config registry. A skill with a prefix (`acme-debug`) is tied to one project and never fires for the others.

### 7. The result is always written somewhere
Every autopilot report lands in the Notion Reports DB with a type, a skill, a date and a relation to the project. Control Tower becomes a complete searchable archive of everything the system has generated.

### 8. Natural language instead of commands
Skills are activated by trigger words in two languages. "Prep me for the daily" is enough. Without this the framework will not take root in day-to-day work.

### 9. Start small
One skill (daily prep), then the next one once the first has delivered value. Do not automate everything at once. The first task in a new protocol is always a small one, so that you are testing the protocol, not the task.

### 10. Completeness of context, and the system knows the limits of its own context
All meetings and all messages must be recorded in Notion. Not a sample, not a digest, not "the most important parts". The reason is simple: AI without context is a noise generator, and with full context it is a real project assistant.

There are no absolutes here and there never will be: no source ever gives guaranteed completeness, channels go down, integrations break. So the requirement is stated practically rather than as an ideal: collect everything you have access to, and explicitly mark what is missing from that snapshot. The dangerous thing is not that some data is missing, but that the report looks complete when it is not.

The practical consequence for choosing tools: a data collection method is judged first on completeness and only then on implementation cost. A channel that delivers most of the messages is not accepted as a substitute for one that delivers all of them. A slow and inconvenient method that gives you everything beats a fast one that gives you a part.

The practical consequence for reports: if a source was unavailable (the Mac was asleep, the connector dropped, the token expired), the skill writes that as a line in the report instead of staying silent.

### 11. An 80% core + 20% adapters (instead of the illusion of full unification)
The framework does not try to abstract over every tracker, chat and portal in the world. The universal core is the Notion Control Tower, the personal Tasks Tracker, the Mail.app mail pipeline, the operating rhythm, the config registry and the engine skills. Everything tailored to a specific client (beneficiary reconciliations on Acme, parsing manual CSV exports from Linear, browser exports from portals) is a project adapter. Having an adapters folder on every project is not a design flaw, it is the norm in outsourcing delivery.

### 12. The client may not give you an API, and the system has to survive that
Clients work in their own Jira Cloud, Linear, Trello, Asana, Monday or their own Notion, and their security teams (SSO, Okta, MDM) often will not issue API tokens for agents. The project config explicitly records the tracker access mode (`task_tracker.api_access: true|false` + `fallback_source`), and with `false` the engines do not fail but switch to available sources: the mail buffer, action items from meetings, manual exports in the project folder. This is "graceful degradation".

An important boundary between principles 10 and 12: degradation is allowed for **derived** data (ticket status, a metric, a prep), because it can always be recomputed. For **primary** communications (messages, meetings) there is no degradation: what you did not record today is gone forever. That is why a thread collection channel is accepted only if it is complete.

### 13. Memory has discipline
Three levels of memory: global (Cowork instructions + Claude memory), project (config + Notion), working (`.ai/` files for agent tasks). Every fact has one place. Duplication = desynchronisation.

## What we measure

Time saved, as estimated before/after (April 2026, Acme):

| Task | Before | After | Saving |
|---|---|---|---|
| Prep for the daily | 30 min | 3 min | 90% |
| Documenting a meeting | 45 min | 5 min | 89% |
| Weekly Slack scan | 2 h | 10 min | 92% |
| Monthly client report | 4 h | 30 min | 88% |
| Board hygiene audit | 1 h | 5 min | 92% |
| Stability scan (Sentry + CloudWatch, 7 services) | ~2 days | ~15 min | ~99% |
| Analysis of 145 MB of logs for an RCA | ~3 days | ~30 min | ~98% |

In total: roughly a full working day per week is returned to the PM. These numbers have to be verified on every new project, they depend on the stack and on how completely the config is set up.

## Limits of applicability

The framework has been worked out on:
- **Acme (PROJ)**: a fintech platform, Kanban, Jira Server, Slack, Sentry, CloudWatch, Java/Python/Angular/Flutter, a client in another country and culture. The full stack.
- **Gamma, Delta**: smaller projects, connected to the `.ai/` protocol in September 2026 (Gamma is finished, its config is in `status: archived`).
- **Beta**: worklog reconciliations for a partner team; separate skills outside the PM registry.
- **Two clinical trials**: not software projects; they show that the engines (mail collection, documents, browser exports) work outside development too.

Since 0.7.0 the framework relies not only on its own skills but also on the PM Toolkit as a standard: metrics, agendas, RAID, Change Requests, KT and the health check are the same for every project and accompany the project from pre-start to closure (`14-pm-toolkit-integration.md`).

This matters for handover: the framework is not a set of "Acme scripts" but a way of organising work that simply happens to be most deeply worked out on Acme. The handover package (the 21-skill plugin, the Notion template, the config template) contains only the core; everything the documents below call an adapter, the author's instance or another domain is not in the package and is mentioned as an example.
