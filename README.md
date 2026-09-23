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
| `plugin/` | A Claude plugin: 21 project-agnostic PM skills plus MCP server config. Source files |
| `dist/pm-control-tower.plugin` | The same plugin, packed and ready to install in one click |
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
- **Third-party MCP server code.** The configuration travels, the Jira server itself
  you clone yourself.

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

Open questions and the technical backlog: `docs/en/13-open-questions.md`.

---

## Licence

MIT. Use it, change it, ship it.

Made by a project manager with 6+ years in software delivery, used daily on real
client projects.
