# PM Control Tower

**An AI framework and personal operating system for a project manager.**

[Українською](README.uk.md) · [Notion template](https://bodco.notion.site/pm-control-tower) · [Documentation](docs/en/)

Built over a year on a real fintech delivery project and cleaned up for public use.
Routine work (collecting context, preparing for meetings, writing reports, tracking
risks, keeping the board honest) runs on a schedule in the background. The project
manager spends the day on judgement, not on repackaging information.

---

## The idea in three sentences

Skills know nothing about your project. Every project fact (team, channels, tracker,
access, meeting cadence) lives in **one config file per project**, which every skill
reads as its first step, every time.

When your team changes or an access disappears, you edit one text file and the whole
library works with the new reality a second later. Nothing is hardcoded anywhere else.

---

## What is here

| Folder | What it is |
|---|---|
| `plugin/` | A Claude plugin: 22 project-agnostic PM skills plus MCP server config. Source files |
| `dist/pm-control-tower.plugin` | The same plugin, packed and ready to install in one click |
| `tools/live-transcriber/` | The local call recorder for `live-tips`: microphone + system audio, Whisper on the Mac, a LaunchAgent and an installer (`docs/en/17-live-tips.md`) |
| `docs/en/` | Framework documentation in English |
| `docs/uk/` | The same documentation in Ukrainian |
| `templates/` | `secrets.env.example`: variable names, fake values, and where the real file must live (the same copy travels inside the plugin) |
| `templates/documents/` | a sample document template and a README: how to plug in company or personal templates (`docs/en/15-document-templates.md`) |
| `templates/cowork-global-instructions.md` | a Cowork global instructions template (Ukrainian and English) for step 6 of `docs/en/16-runbook.md` |

## The Notion template

The framework stores everything in a Notion hub of eleven connected databases:
Threads, Meetings, Topics, Decisions, Reports, Risks, Tasks Tracker, Inbox,
Knowledge Base, Projects, Workspaces.

A ready-to-duplicate template is published here:

**https://bodco.notion.site/pm-control-tower**

Duplicate it, then point the skills at your own database IDs. The template is fully
usable on its own, with none of the automation in this repository.

---

## Getting started

1. Duplicate the Notion template.
2. Install the plugin: send `dist/pm-control-tower.plugin` to yourself in Claude and press install.
3. Say to Claude: `set up the pm-control-tower plugin for me`. It walks you through
   every `~~` placeholder: your database IDs, your home folder, your tracker.
4. Say to Claude: `set up a new project <Name>, case A`. It builds the config, the Notion pages and the folders itself.
5. Try it: `prepare me for the sync on <your project>`.

Step by step with prompts: `docs/en/16-runbook.md`. Full instructions: `plugin/SETUP.md`. Placeholder reference: `plugin/CONNECTORS.md`.

**Start with four skills.** `projects` (infrastructure, read by everything else),
`daily-team-prep`, `weekly-overview`, `mac-mail-collector`. The rest connects when
you need it.

---

## The skill library

**Client and reporting:** `client-meeting-prep`, `client-report` (weekly, monthly,
steering), `client-satisfaction-tracker`, `change-request`.

**Tracker:** `jira-management`, `jira-board-health`, `velocity-report`.

**Communication:** `slack-collector`, `inbox-responder`, `thread-ticket-sync`,
`notion-meeting-topics`, `topic-manager`.

**Risk and state:** `risk-register`, `stability-scan`, `sentry-assistant`,
`deploy-analysis`, `project-lifecycle`.

**On the call:** `live-tips` (local transcription, tips in the chat while you talk, a
Meetings DB page with the transcript after the call; requires a Mac with Apple Silicon,
see `docs/en/17-live-tips.md`).

---

## Two rules worth knowing before you start

**Never guess the project.** If a request does not name a project, the skill asks
instead of assuming. Mixing two clients' data is the worst failure mode a system
like this can have.

**The set travels whole or not at all.** If you install the plugin and then upload a
separate skill with the same name, the plugin version shadows it and the skill looks
for configs in the wrong place. This matters most for `projects`: there must be
exactly one in the system.

---

## What is deliberately not here

- **Secrets.** No values, anywhere. Only variable names and the command that reads them.
- **Client-specific adapters.** A different project means a different stack and tracker.
  Those skills are written in place.
- **Third-party MCP server code.** The configuration travels, the Jira and Bitbucket
  servers themselves you clone yourself.

---

## Status and versions

**Status: beta.** The author uses this every day, but the plugin has never been installed on
anyone else's account yet: the first handover pilot with a colleague is still ahead
(`docs/en/13-open-questions.md`, #49). Budget one quiet evening for the basic loop and a few
weeks of calibration for your own project, not an hour.

| Version | Date | What changed |
|---|---|---|
| 1.0.0 | 2026-09-11 | First public package: 21 skills, the Notion template, documentation in two languages |
| 1.1.0 | 2026-09-19 | Plugin aligned with the documentation and the public Notion template (relation names, the `AI Review` / `Progress` statuses, config keys from `_template.md`, `task_tracker.api_access` in 14 engines, the 5-minute rule); anonymization; `.mcp.json` with the `jira` and `confluence` servers; the secrets template inside the plugin |
| 1.2.0 | 2026-09-23 | Custom document templates: a template key for every document, the house registry `projects/_templates.md`, the `pm_profile.templates` block in the config, the "Document templates" rule in `projects/SKILL.md`, a **Template** line in 18 skills, the `template-check` mode of `project-lifecycle`, document `15` with the document catalog; step-by-step document `16` (setup from scratch and a new project through kickoff) and a global instructions template |
| 1.3.0 | 2026-09-24 | Mail and sync prep from live use: `mac-mail-collector` collects Sent mail (a separate AppleScript, outgoing threads with the 📤 icon, routing by recipients only), fills `to`/`cc` and `date_utc` from the EML (`fix_recipients.py`), processes everything in `incoming/` instead of filtering by a time marker, keeps an optional `backlog/`, reports collector health, moves a file only after a successful Notion write; routing counts non-shared `client_emails`. `daily-team-prep`: sync time from the PM, then the calendar, then the config; window from the calendar when the previous prep is older than 7 days; Sentry `statsPeriod` 24h/14d with new vs recurring issues; idle assignees rule; "points for discussion" section; Reports rows created with a data source parent and verified after saving (now a rule in `projects/SKILL.md`). Document `10a` updated for Sent and `fix_recipients.py`, lesson 23 in `11` |
| 1.4.0 | 2026-10-02 | Threads DB status and icon rules from live use: one canonical table in `projects/_standards.md` section 11, every skill and document points there. Collectors recompute `Status` and the icon on every pass, not only when `Last Reply Date` moved (rows used to sit on an open status for months after the work shipped and the client confirmed). The `slack-collector` review pass (new Step 3B) covers every non-Closed Slack thread of the project with no date window: filtering by `Last Reply Date` was circular, a row with unrecorded replies excluded itself. The icon follows the status, not the last author (closed threads no longer carry 🔴, the flagged count is honest); Email keeps the 📤 override. No immutable statuses; only collectors write `Status` and the icon, `inbox-responder` reads them and queues `Need Follow-up`, `Awaiting Reply` and `AI Review` rows without a draft. This release swapped the meanings of `Awaiting Reply` and `Need Follow-up` by mistake, fixed in 1.5.1 |
| 1.5.0 | 2026-10-03 | Optional `bitbucket` MCP server for a self-hosted Bitbucket Server / Data Center: a block in `.mcp.json` (placeholders `~~bitbucket-base-url`, `~~bitbucket-mcp-path`), `BITBUCKET_TOKEN` in the secrets template, a section in `CONNECTORS.md` (clone and build `n11techhub/mcp-bitbucket`, token only, read-only rights recommended; no skill of the plugin uses it yet), rows in documents `01`, `05`, `10` and `16`. Skills are unchanged |
| 1.5.1 | 2026-10-05 | Fix to 1.4.0: the meanings of `Awaiting Reply` and `Need Follow-up` were swapped by mistake and are restored. `Awaiting Reply` (🔴) = a reply or action is owed by us; `Need Follow-up` (⏳) = we asked, the ball is on their side and we have to nudge them with a follow-up. Corrected in `projects/_standards.md` section 11, `slack-collector`, `project-lifecycle`, the glossary and the public Notion template |
| 1.5.2 | 2026-10-10 | Focus desk documented (the inline dashboard at the top of the public Notion template: My day with Do next, Reply & follow up, Risks needing attention, Recent reports; Overdue), Meeting type options `Client Sync` and `Retro`, a note on relation names without emoji in document `02`. `Restricted internal sources`: a generalized rule in `projects/SKILL.md` and a `restricted_sources` block in `_template.md` (candid internal channels are context only and never reach the client, not even by paraphrase), optional config keys `scope_jql` and `instructions_doc`, documents `03` and `11` (lesson 24). Hygiene: stale notes about `_projects/`, CLAUDE.md, the retired Gmail collector and the author's local linter removed; `plugin/README.md` status refreshed; `Notion/` added to `.gitignore`. Skills logic unchanged |
| 1.6.0 | 2026-10-11 | Live tips: a co-pilot on the call. New skill `live-tips` (local transcription of the call, Live Brief of the project, tips in the chat on triggers: CR-like asks, promised dates and estimates, contradictions with decisions, the PM's own inaccurate or incomplete answers, side talk in another language; three ways to end the meeting; after the stop a page in the project's Meetings DB with a generated name and a date mention in the title, `Date`, `Project`, `Workspace`, the transcript in an AI Meeting Notes block and a wrap-up). New folder `tools/live-transcriber/`: the local recorder (Swift `audiocap` for microphone and system audio via a Core Audio process tap, Whisper large-v3-turbo on MLX, VAD, echo and hallucination filters, a LaunchAgent, `install.sh`), LaunchAgent name configurable via `launchd_label`. Document `17` in two languages: architecture, install from scratch, running a call, ending it, the Notion API limit on meeting-notes transcripts, troubleshooting, a checklist for a colleague |

Open questions and the technical backlog: `docs/en/13-open-questions.md`.

---

## Licence

MIT. Use it, change it, ship it.

Made by a project manager with 6+ years in software delivery, used daily on real
client projects.
