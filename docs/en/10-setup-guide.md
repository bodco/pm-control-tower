# 10. Setup Guide: how to stand up your own Control Tower

For a PM who wants to reproduce the framework. Time estimate: the basic loop in a day, autopilot in a week.

## What you get from the author (three layers of the handover)

| Layer | What is included | How to adapt it |
|---|---|---|
| **1. Core** | The principles (`00`, `03`, `11`), `projects/SKILL.md` with the registry rules, `projects/_template.md`, the template for the Cowork global instructions, the structure of the Notion Control Tower (a duplicate of the template with empty databases), this setup guide | Used as is. Only the values in your own config change |
| **2. Generic skills (engines)** | `slack-collector`, `mac-mail-collector`, `daily-team-prep`, `client-meeting-prep`, `jira-board-health`, `weekly-overview`, `client-report`, `velocity-report`, `risk-register`, `client-satisfaction-tracker`, `notion-meeting-topics`, `topic-analyzer`, `inbox-responder`, `jira-management`, `sentry-assistant`, `deploy-analysis`, `stability-scan`, `thread-ticket-sync`, the scheduled task prompts | They work unchanged if the stack is the same (Jira, Slack, Notion, Gmail, Sentry). For a different stack, see the adaptation matrix below |
| **3. Project adapters (examples)** | `acme-debug`, `acme-db-assistant`, `acme-env-audit`, `authorizer-code-review`, `acme-beneficiary-audit`, `calyx-export` and so on, the KB structure (SYSTEM.md, SDLC.md, LESSONS.md) | Not transferable. These are samples of what an adapter for a specific stack looks like; for your own project you write your own to the same pattern. Layers 1-2 = the core (~80%), layer 3 = your 20% |

## Step 1. Tools

1. **Claude Max** (not tested on Pro $20: fewer tokens, autopilot may not fit). Enable **Cowork mode** in Claude Desktop (macOS).
2. **Notion** with AI Meeting Notes enabled (meeting transcription). Plan: Plus/Business; SQL queries against databases via MCP require Enterprise, the framework does not use them.
3. Optional: **Gemini Desktop** (Spark) for layer 5.

## Step 2. MCP connectors

| Service | How to connect | Notes |
|---|---|---|
| Slack, Notion, Gmail, Google Calendar, Google Drive | the official connectors in Claude (Settings → Connectors) | they work both locally and in cloud sessions |
| Slack (additional workspace) | a local MCP server (`slack-workspace2`), configured in Claude Desktop | for when the official connector is taken by another workspace; the token is read from `Secrets/secrets.env` via `sh -c`, there is no secret in the JSON |
| Jira Server / Data Center | a local MCP server (two options used: `jira-cosmix` for writing, `jira-rixbeck` for reading), configured in Claude Desktop | on Jira Server 7.x a write returns a cosmetic JSON error, the updates do go through; Jira Cloud is the official Atlassian MCP; tokens are read from `Secrets/secrets.env` via `sh -c`. Two connectors were kept deliberately: one is a backup |
| Confluence Server | a local MCP server (`confluence-our-company`), configured in Claude Desktop | works; the URL is `wiki.your-company.com` after the domain migration; the token is read from `Secrets/secrets.env` via `sh -c` |
| Control Chrome | a local MCP server, separate from the Claude in Chrome connector | controls tabs in the real Chrome on the Mac, no token |
| Sentry | not MCP: the REST API with a token in the config (project:read, event:read, team:read) | self-hosted and SaaS behave the same |
| CloudWatch / other logs | export into a folder on disk; Claude reads the files | without direct AWS access from Cowork |
| Chrome | the Claude in Chrome extension or the built-in browser | for systems with no API (the client's Notion, portals) |
| Mail.app | AppleScript + LaunchAgent → a JSON/EML buffer on disk (`mac-mail-collector`) | for corporate mail that is not on Gmail |

Tip: connect them one at a time and check each with a simple request ("show the last 5 messages in #dev") before you build skills.

## Step 3. The Notion Control Tower

1. Duplicate the CONTROL TOWER page template with its 11 databases (Inbox, Tasks Tracker, Meetings, Threads, Topics, Knowledge Base, Risks, Reports, Projects, Workspaces, Decisions), or build it from the description in `02-notion-control-tower.md`.
2. Write down the data source ID of each database (from the URL or via Notion MCP fetch) into the future config.
3. Create the client page in Workspaces and the project page in Projects.
4. Check the names of the relation properties in Topics (`💬 Meetings`, `📨 Threads`), or bring the `topic-analyzer` skill in line with your own names.

## Step 4. Claude's memory

1. **Cowork global instructions** (Settings → Cowork): a "PM Workspace" block with a table of projects (name, slug, tracker key) and 2-3 rules (report language, forbidden characters, defaults). Keep it short: everything project-specific lives in the config.
2. **Claude's memory**: 3-5 facts about you and your style (role, company, the language of internal and client-facing documents).
3. **The `projects/` registry**: upload the folder with `SKILL.md`, `_template.md`, `<slug>.md` as a skill (Step 5).

## Step 5. The project config

`projects/_template.md` → `projects/<slug>.md`. The details of each section are in `03-project-config.md`, the fill-in order is in `08-new-project-flow.md` Phase 1. The minimum to start: General, Access Matrix, Team, Meetings Schedule, tracker, channels, Notion IDs, Changelog. Everything else is "none" until it appears.

## Step 6. Skills

The starting set for day one: `daily-team-prep`, `weekly-overview`, `mac-mail-collector`. The logic: immediate effect without setting up Sentry, logs and deploys. If mail is not in Mail.app, `slack-collector` is third instead.


1. Upload the generic skills (Settings → Cowork → Skills → Upload). Each one is a folder or a `.skill` zip.
2. Read the description of each one and add your own trigger words if needed (language, team slang).
3. Test one skill by hand: "collect slack <Project> for last week". Look at the Threads DB: relations, statuses, icons.
4. Then one at a time: meeting prep, weekly-overview. For every failure, check the config first, then the skill.

## Step 7. Autopilot

Create the scheduled tasks in Cowork following the table in `08-new-project-flow.md` Phase 6 (minimum: channel sync, prep for the internal sync, prep for client meetings, weekly-overview, mail). Use the prompt template from `05-autopilot.md`. After a week, add board health, risks, monthly metrics. The Mac has to be switched on at the launch time.

## Step 8. The ritual

The first two weeks: 10 minutes every morning in the CONTROL TOWER, following the scheme in `07-operating-rhythm.md`. This matters more than any skill: the system stays alive as long as people walk into it.

## Adaptation matrix for a different stack

| A colleague's stack | Approach | Status (2026-04, updated 09) | Difficulty |
|---|---|---|---|
| Confluence Server (documentation) | the `confluence-our-company` connector; use cases: meeting-notes-to-confluence, weekly-status-to-confluence, confluence-search-context, decision-log-to-confluence, release-notes-to-confluence | the connector works, the skills are not written yet | easy |
| A folder of `.md` / Obsidian instead of Notion | Cowork reads the files directly; databases are replaced by folders with frontmatter; relations and views are lost | conceptually ready | easy, but poorer |
| Jira Server (tasks) | `jira-cosmix` / `jira-rixbeck` | ready | easy |
| Jira Cloud | the official Atlassian MCP | not tested | easy |
| Slack + Gmail (communications) | the official connectors | ready | easy |
| Microsoft Teams / Outlook | no ready path; options: export to files, browser | not done | medium |
| Azure DevOps / Linear / ClickUp with an API | needs an MCP or REST through a skill; the engines stay, the "Data Sources" step changes | not done | medium |
| Any client tracker **without an API** (Jira Cloud, Linear, Trello, Asana, Monday, a client Notion behind SSO/MDM) | `task_tracker.api_access: false` in the config; sources: manual CSV export into `~/work/<slug>/exports/`, the browser (a Chrome skill modeled on `calyx-export`), action items from Meeting Notes, email. The engines work in degraded mode | the concept is settled, the skills are not adapted yet | medium; this is the most common case in outsourcing |
| Sentry SaaS / Datadog | Sentry is REST in the same way; Datadog is REST with its own token, `stability-scan` needs adapting | partly | medium |
| GitHub / GitLab instead of Bitbucket | local clones work the same; PR review through the API or a local diff | ready for local mode | easy |
| Google Docs instead of docx | `client-report` generates docx; for Docs, go through the Drive connector | not done | easy |

## Common mistakes during rollout

1. Starting with the skills instead of the config and Notion. Skills without a config lie, and without Notion they have nowhere to write.
0. Expecting "everything like on Acme" from the framework on a project with no API. First determine `task_tracker.api_access` and `fallback_source`, then set expectations.
2. Hardcoding project facts into a skill "temporarily". A month later nobody remembers where they are.
3. Turning on 10 scheduled tasks on day one. The result: 10 incomprehensible reports and no trust in the system. One at a time.
4. Not walking into the Control Tower in the morning. Then everything it generates is of no use to anyone.
5. Sending to the client automatically. Never. Drafts yes, sending is a human.
6. Forgetting about privacy: client context in `.ai/` and in the skills must not end up in repositories the client has access to.

## What you take with you (the artifacts)

- This Control Tower folder (documents 00-13).
- `projects/SKILL.md`, `projects/_template.md`.
- The set of generic skills (layer 2).
- The template for the Cowork global instructions.
- The scheduled task prompts (from `~/Documents/Claude/Scheduled/`, anonymized).
- The workshop presentation (AI_PM_Framework_Workshop, April 2026) as an introduction.
- Notion: the "Claude Skills & Prompts" page as a sample library README; the PM Toolkit (metrics, templates, meetings) in the Knowledge Base.

## Portability: how a colleague stands the system up on their side

There used to be a list of seven items here that a colleague had to
assemble by hand. It is obsolete: the skills now travel as one bundle.

### Where the skills live

| What | Where | Is this the source of truth? |
|---|---|---|
| **A skill in a Cowork account** | in the cloud, read during a session from `~/.claude/skills/synced/<uuid>/<skill>/` | yes, this is what actually runs |
| **A plugin** | `~/.claude/plugins/synced/<uuid>/<plugin>/` | yes, for whoever installed it |
| **`.skill` archives on disk** | a local folder | no, a historical store of sources, it lags behind |

### The handover package: two files and one link

1. **`dist/pm-control-tower.plugin`.** The colleague sends it to themselves in a Claude chat and
   presses the install button. Inside are 21 anonymized skills, an `.mcp.json` with
   the Jira and Confluence blocks (without secret values), `SETUP.md`, `CONNECTORS.md`.
2. **A link to the public Notion template.** The colleague duplicates it for themselves.
3. **`templates/secrets.env.example`** (also included inside the plugin): where to put
   the secrets file and which variables to fill in.

Then the colleague tells Claude "set up the pm-control-tower plugin for me". The built-in
wizard finds every spot marked with `~~` and walks through them with questions: the IDs of
their Notion databases, the home folder, the path to the local Jira server.

### What does NOT transfer

- **Secrets.** Never, in any form. Only variable names.
- **Project configs.** The plugin contains only `_template.md` and `_standards.md`.
- **Project adapters** (`acme-*` and the like). A different project has a different stack and tracker,
  so those skills are written on site.
- **The code of other people's MCP servers.** The configuration travels, the Jira server itself the colleague clones on their own.

### The compatibility rule, proven in practice

The set travels **whole or not at all**. If, after installing the plugin, you load
a skill with the same name as a separate file, the version from the plugin will override it, and the skill
will look for configs somewhere other than where they are.

This applies to `projects` in particular: it is infrastructural, every other skill
reads it at Step 0, and there must be exactly one of it in the system. That is why **the author of the distribution does
not install their own plugin on their own machine**.

Adding your own skills on top is fine, but give them their own name and a project prefix.

