# 06. PM functions against the framework: a coverage matrix

## Why this matrix exists

For the framework to be a framework and not a collection of scripts, it has to show that it covers a PM's work systematically. Below are 22 functional PM domains: 17 from delivery practice in outsourcing (checked against PMBOK and `PM_Operational_Rhythm.md`) plus 5 added ones (18-22) that a PM needs beyond supporting a single delivery project. The levels were revised in v0.2 following the reviewer's audit: wherever the human has to act after the autopilot (ticket transitions, sending, mitigation), the level was lowered from A to S. For each domain: what the system does, how exactly (skill, schedule, database), the level of automation, and the gaps.

Levels: **A** = automatic (autopilot with no human involvement), **S** = semi-automatic (the human triggers it with one sentence or checks the result), **M** = manual with support (Claude helps in dialogue, there is no skill), **0** = not covered.

An important caveat: the levels below describe a project with full API access (Acme). On a project with `task_tracker.api_access: false`, domains 1, 3, 8 and 11 automatically drop one level (A → S, S → M), because task data arrives from manual exports, meetings and email. The level of automation is a property of a specific project, not of the framework.

## The matrix

> the gaps in domains 2, 4, 11, 17 and 21 that used to point to "a template in the PM Toolkit, done manually" have a closure plan in `14-pm-toolkit-integration.md` (waves 2 and 3). Wave 1 has already delivered the standards (`projects/_standards.md`), the PM Profile with an hours cap and SLAs, RAID in the Risks DB, and an extended decision log. The levels in the matrix have not been changed: they will change once the skills actually run under the new rules.

| # | PM domain | What the system does | Skills / tasks / databases | Level | Gaps |
|---|---|---|---|---|---|
| 1 | Planning and prioritization | Prep for the planning meeting with a proposed priority list for the week: backlog, blockers, risks, what the client asked for | `client-meeting-prep` (Planning), `weekly-overview` (outlook), Tasks Tracker | S | There is no skill for a formal roadmap / Now-Next-Later (the plugin `roadmap-update` exists but is not integrated with the config); Scrum sprint planning with capacity is not automated (Acme runs Kanban) |
| 2 | Scope and changes | The Access Matrix and Engagement Status in the config record the scope boundaries with dates; the Decisions DB records changes; Metric Continuity protects the reports | `projects/<slug>.md`, Decisions DB, Skill Health Check | S | `change-request` exists (buckets A/B/C, Extras Log, CR, goodwill budget) but has not been road-tested; changes are sized by the implementer, the skill does not propose numbers |
| 3 | Board and tickets | Board hygiene, creating/updating tickets by the rules, estimates, fixVersion, synchronization with the client's board | `jira-board-health` (Fri), `jira-management`, `acme-jira-estimate-setter`, `acme-notion-jira-sync`, `thread-ticket-sync` | S | Setting fixVersion automatically on Done is manual; estimates are tied to Acme rules |
| 4 | Communication with the client | Prep for every client meeting, draft replies to threads, client reports in English, the external version of the risks | `client-meeting-prep` x4/week, `inbox-responder`, `client-report`, `risk-register` External, `stability-scan` EN report | S | Sending is always manual (deliberately). There is no separate skill for an escalation letter; since 0.7.0 the reader rule requires bad news to come with a plan and the date of the next update (`_standards.md` section 1) |
| 5 | Communication with the team | Prep for the internal sync with blockers and action items, automatic code review in a Slack thread on request | `daily-team-prep`, `authorizer-branch-review`, `notion-meeting-topics` | S | A deliberate ethical boundary (from the review): the agent does not analyze 1-1s or the psychological state of the team. The framework boundary here: an engineer onboarding/offboarding checklist, the date of the last 1-1, technical feedback on tickets. Right now there are only config lines (Former Members), no checklist |
| 6 | Risks and issues | A live register: scanning Jira/Slack/Meetings/Sentry for signals, severity/likelihood, owner, mitigation, auto-closing stale entries, two reports | `risk-register` (Fri), Risks DB, Open Risks on the CT | A/S | People risks (attrition) are recorded only as Internal; there is no automatic risk → task link into the Tasks Tracker |
| 7 | Quality and stability | A weekly Sentry + CloudWatch scan, tickets for defects, RCA on request, KB-driven code review, a branch audit before regression | `stability-scan` (Thu), `sentry-assistant`, `acme-debug`, `authorizer-code-review`, `acme-env-audit` | S | There has been no QA on the team since 2026-08, so there is no regression checklist skill; test plans are kept in xlsx manually |
| 8 | Delivery and releases | Daily stage vs prod, release notes, the delta, readiness verdicts and approval of the deploy date | `deploy-analysis-daily`, `acme-env-audit`, Deploy Config in the config | S | The release announcement to the client is manual; there is no deploy checklist skill for DevOps |
| 9 | Internal reporting | A daily work report, a weekly overview, a monthly per-project digest, local copies | `daily-work-report`, `weekly-overview`, Monthly Memory Digest, Reports DB | A | The report for our own management (delivery/account) is extracted from the weekly one manually |
| 10 | External reporting | A weekly/monthly client report with Tempo, external risks, the EN stability report | `client-report`, `risk-register` External, `stability-scan` | S | There is no automatic schedule for client-report (it is on-demand, because it needs a fresh Tempo export from disk) |
| 11 | Metrics and productivity | Throughput, cycle time, labels, load, trend, estimate accuracy, Metric Continuity annotations | `velocity-report` (1st of the month), `jira-board-health` | A/S | There is no dashboard (only a report); there is no SLA / lead time for client requests |
| 12 | Knowledge and decisions | Meetings → reports → topics; the decision log; Current State per project; KBs for the code; a monthly reconciliation of "decisions from meetings against Decisions" | Meetings, Topics, Decisions, Current State, Knowledge Base, `notion-meeting-topics`, `topic-analyzer`, `weekly-topics-db-update`, `daily-current-state-distillation`, Monthly Memory Digest | S | The one-off migration of a year of decision history was only partly done; Decisions is filled mostly automatically once a month rather than after every meeting (this is where Gemini fits) |
| 13 | Health of the client relationship | Client mood with cultural calibration, 4 warning levels, trend, recommendations | `client-satisfaction-tracker` (1st and 15th), Cultural Profile in the config | A | For internal use only; it does not cover relationships inside our own team |
| 14 | Resources, time, finances | Tempo exports into the client report, estimates from logged time, worklog reconciliation on T2 | `client-report`, `acme-jira-estimate-setter`, `t2-worklog-collect/check` | M/0 | Budget, margin, project burn: 0 (there are only one-off pptx decks about team scaling/budget); capacity planning is manual |
| 15 | Operational support and data | Beneficiary reconciliation across three systems, balance analysis, SQL help, pomelo audits, courier orders (other domains) | `acme-beneficiary-audit`, `acme-beneficiary-transactions`, `acme-db-assistant`, `dila-lab-order`, `marken-order` | S | The client's ops requests (changing a document, blocking) are handled through threads and tickets without a dedicated runbook skill |
| 16 | The PM's self-organization and personal capacity | The Tasks Tracker as a personal OS: all tasks across projects and outside them, Source from the skills, Today/This Week, Overdue, Inbox, the morning and evening ritual | the CONTROL TOWER page, Tasks Tracker, `daily-work-report` (today's plan) | S | There is no capacity calculation (hours per day against the sum of Effort level); there is no Google Calendar integration for blocking time; the link to Jira is by reference only, synchronization is deliberately absent |
| 17 | Project lifecycle | Onboarding a new project (config, Notion, schedule), handover, archiving with the history preserved | `projects/_template.md`, `08-new-project-flow.md`, `status: archived`, the KT/Handover Checklist in the KB | M | `project-lifecycle` exists (kickoff, handover-in, health-check, onboarding / offboarding, closure) along with the monthly Project Health Check; the level will rise to S after the first real run |
| 18 | Product discovery and requirements | None. On Acme the requirements came from the client lead as ready-made tickets | the `product-management` plugin (write-spec, brainstorm) is not integrated with the config | M | User story mapping, PRD, acceptance criteria, the goal → feature link: for a PM who does discovery themselves this is daily work |
| 19 | Vendors and external integrations | None. The card provider / Visa on Acme live as context in the KB and in threads | `acme-db-assistant`, KB | 0 | Provider SLAs, third-party incidents, contractual limits: daily routine for fintech |
| 20 | Compliance, security, audits | Diffused across the Security epic (pentests, Visa compliance) and the `security` label | Jira epic PROJ-1514 | M | GDPR/PCI-DSS/ISO checklists, annual audits, evidence collection: a separate stream for enterprise clients |
| 21 | Project finances | None. Only Tempo hours | | 0 | Budget burn, forecast to complete, margin: without these a PM is blind on fixed-price or capped T&M. The minimum for v0.3: burn rate from Tempo against the budget cap in the config |
| 22 | Contracts and commercial milestones | None. The SOW and the counter-proposal sit as files in Drive | Knowledge Base | 0 | Signing the SOW, acceptance acts, milestone invoices, the warranty period |

## Reading the matrix

What the system does well:
- **The inbound flow** (domains 4, 5, 12): everything the client and the team write or say lands in structured memory and comes back as prep, a draft or a topic. This is the core.
- **Periodic reviews** (6, 7, 8, 9, 11, 13): everything that has to be done regularly and that people systematically forget is done by the autopilot.
- **Project state as data** (2, 17): the config plus Decisions instead of "everybody knows".

Where the system is weak:
- **Money and commerce** (14, 21, 22): budget, margin, burn and milestones are absent. On Acme the project finances are run by delivery management and the PM sees only Tempo. For a framework meant to be reused this is unacceptable: the minimum for v0.3 is burn rate from Tempo against the cap in the config.
- **Product and the outside world** (18, 19, 20): discovery, vendors and compliance are absent from the framework as domains, because on Acme the client handled them. For other projects this should be at least level M with templates.
- **Formal planning artifacts** (1, 2): roadmap, change request, an estimation document: templates only.
- **People inside the team** (5): 1-1s, growth, attrition are outside the system, apart from config lines and risks.
- **Outbound communication** is always manual. That is a principle, not a gap, but it has to be stated explicitly.

## What the PM does once the routine is lifted

The matrix shows that the framework gives the PM time back in domains 3, 4, 5, 6, 7, 9, 11, 12. Where that time goes:
- priorities and negotiating scope with the client (domains 1, 2);
- relationships: informal conversations, reading between the lines, escalations that the autopilot only highlights (4, 13);
- decisions that require judgement: whether to take a risk, whether to push on a deadline, who to protect (6, 5);
- account strategy: renewal, expansion, changing the model (17, 14);
- improving the system itself: a new skill out of a new routine.

## For review

Questions for the reviewer (Gemini or a fellow PM): are there domains missing from the list entirely; are the levels assessed correctly; which of the gaps are critical for a PM with a different stack (Scrum, a product team, several clients). The answers are collected in `13-open-questions.md`.
