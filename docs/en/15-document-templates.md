# 15. Document templates: catalog and custom templates

This document answers three questions. Which documents does Control Tower generate? Where does the template for each of them live? What should a company, a PMO or a colleague do to produce these documents with their own templates, without editing the skills?

In short:

- The plugin has no separate folder of templates. The built-in format of every document is described in the `SKILL.md` of the skill that generates it. The consolidated registry of all documents is `plugin/skills/projects/_templates.md`.
- Every document has a **template key**, for example `client-report.weekly` or `change-request.cr`. A custom template is plugged in as a file `{key}.md` or a Notion page with the same name. The skills themselves do not change.
- A template is looked up on three levels: **project** (config `pm_profile.templates`), then **house** (registry `_templates.md`: a company, a PMO or the PM), then the **built-in** format in the skill. The first hit wins.
- A template defines the sections, their order and the fixed text. It cannot change the invariants: the Data Completeness header, the language rule, sanitization of client-facing documents, the storage location and the 5-minute rule.

Status: the mechanism was added in v1.2.0 and has not yet been run against a real company template set (`13`, #50).

## 1. Document catalog

The "Built-in template" column names a section of `plugin/skills/<skill>/SKILL.md` unless stated otherwise. The Reports, Risks, Topics, Threads and Tasks Tracker databases are described in `02`.

### Reports and preps

| Skill | Document | Template key | Built-in template | Saved to | Language |
|---|---|---|---|---|---|
| `client-report` | Weekly client report | `client-report.weekly` | "Weekly Report Format" | Reports DB, Type `Client Weekly Report`, Visibility External + local `.md` in outputs | EN |
| `client-report` | Monthly client report | `client-report.monthly` | "Monthly Report Format" | Reports DB, `Client Monthly Report`, External + `.md` | EN |
| `client-report` | Steering / exec update | `client-report.steering` | "Steering / Exec Update Format" | Reports DB, `Steering Update`, External + `.md` | EN |
| `client-meeting-prep` | Planning prep | `client-meeting-prep.planning` | "Planning prep" | Reports DB, `Client Meeting Prep` | UA |
| `client-meeting-prep` | Status sync prep | `client-meeting-prep.status-sync` | "Status sync prep" | Reports DB, `Client Meeting Prep` | UA |
| `client-meeting-prep` | 1-1 with the client lead | `client-meeting-prep.one-on-one` | "1-1 with the client lead" | Reports DB, `Client Meeting Prep` | UA |
| `client-meeting-prep` | Review / demo prep | `client-meeting-prep.review` | "Review prep" | Reports DB, `Client Meeting Prep` | UA |
| `daily-team-prep` | Internal team sync prep | `daily-team-prep` | "Report Format" | Reports DB, `Daily Team Prep`, Internal | UA |
| `weekly-overview` | Weekly overview across projects | `weekly-overview` | "Report Format" | Reports DB, `Weekly Overview`, Internal | UA |
| `velocity-report` | Monthly velocity report | `velocity-report` | "Report Format" | Reports DB, `Velocity Report`, Internal | UA |
| `jira-board-health` | Board health check | `jira-board-health` | "Report Format" | Reports DB, `Board Health`, Internal | UA |
| `stability-scan` | Stability scan (internal) | `stability-scan.internal` | "Report Format - Ukrainian (internal)" | Reports DB, `Stability Scan`, Internal + `.md` | UA |
| `stability-scan` | Stability report for the client | `stability-scan.external` | "Report Format - English (client-facing)" | local `stability-report-YYYY-MM-DD-EN.md` | EN |
| `deploy-analysis` | Deploy analysis, stage release notes | `deploy-analysis` | `deploy-analysis/README.md`, step 7 | Reports DB, `Deploy Analysis`, Internal + `{reports_root}/deploy-analysis-{slug}-{date}.md` | UA |
| `risk-register` | RAID summary (internal) | `risk-register.internal` | "Internal summary" | Reports DB, `Risk Register`, Internal | UA |
| `risk-register` | Sanitized risk report | `risk-register.external` | "External summary" | Reports DB, `Risk Register`, External | EN |
| `risk-register` | Dossier of one risk | `risk-register.dossier` | "Risk Dossier Format" | Risks DB page body | UA |
| `client-satisfaction-tracker` | Client sentiment report | `client-satisfaction` | "Output Report" | Reports DB, `Client Satisfaction`, Internal | UA |

### Project documents

| Skill | Document | Template key | Built-in template | Saved to | Language |
|---|---|---|---|---|---|
| `change-request` | Change Request | `change-request.cr` | "Step 4" (from the Toolkit CR template) | Reports DB, `Change Request`, External | EN |
| `change-request` | Scope & Extras Log | `change-request.extras-log` | "Step 3" | page under the project page | UA |
| `project-lifecycle` | Kickoff report | `project-lifecycle.kickoff` | "K8" | Reports DB, `Project Kickoff`, Internal | UA |
| `project-lifecycle` | Project Charter | `project-lifecycle.charter` | Toolkit page under `pm_toolkit_page_id`, else plain sections | page under the project page | UA |
| `project-lifecycle` | KT / Handover Checklist | `project-lifecycle.kt-checklist` | Toolkit page, else plain sections | page under the project page | UA |
| `project-lifecycle` | Handover-in report | `project-lifecycle.handover` | "Mode handover-in" | Reports DB, `Project Handover`, Internal | UA |
| `project-lifecycle` | Project Health Check | `project-lifecycle.health-check` | "Mode health-check" | Reports DB, `Project Health Check`, Internal | UA |
| `project-lifecycle` | Team member onboarding | `project-lifecycle.onboarding` | `onboarding_template_page_id`, else plain sections | page under the project page | UA |
| `project-lifecycle` | Closure report | `project-lifecycle.closure` | "Mode closure" | Reports DB, `Project Closure`, Internal | UA |
| `project-lifecycle` | Handover pack at closure | `project-lifecycle.handover-pack` | "Mode closure", step 3 | page under the project page | UA |

### Meetings, topics, drafts, tickets

| Skill | Document | Template key | Built-in template | Saved to | Language |
|---|---|---|---|---|---|
| `notion-meeting-topics` | Bilingual meeting report | `notion-meeting-topics` | "Report Structure" | appended to the end of the meeting page | EN + UA |
| `topic-manager` | Monthly section of a topic | `topic-manager.month-section` | "Month Section Format" | Topics DB page body | UA |
| `inbox-responder` | Draft reply to a thread | `inbox-responder.draft` | "Step 4", "Draft structure" | Threads DB field `Draft Response` + the Inbox Review page | language of the original |
| `jira-management` | Bug ticket description | `jira-management.bug` | "Ticket template (description) - bug tickets" | tracker ticket | EN |
| `jira-management` | Feature ticket description | `jira-management.feature` | "Ticket template - feature/enhancement" | tracker ticket | EN |
| `slack-collector` | Ticket from a Slack thread | `slack-collector.ticket` | "4.4 - Create the ticket" | tracker ticket | EN |
| `thread-ticket-sync` | Ticket on the client's Notion board | `thread-ticket-sync.ticket` | `task` body in Phase 2 | client's Notion board | EN |

### Not templatable

Machine records whose format is a contract between skills: Threads DB pages from `slack-collector` and `mac-mail-collector`, the properties of the Topics, Risks and Decisions databases, Tasks Tracker rows. Also `sentry-assistant` answers in chat and every chat summary. Changing their format would break the skills that read these records.

## 2. Three levels and the lookup order

```
project (pm_profile.templates in the config)
   ↓ not found
house (projects/_templates.md: company, PMO or the PM)
   ↓ not found
built-in format in SKILL.md
```

The detailed order for key `K` (the first hit wins):

1. `pm_profile.templates.overrides.K` in the project config.
2. `{pm_profile.templates.root}/K.md`, the template folder of that one project.
3. Only for `client-report.*`: `pm_profile.reporting.locked_template_page_id`, a previous report whose structure is locked. This mechanism predates this document and keeps working.
4. `overrides.K` in `_templates.md`.
5. `{templates_root}/K.md` from `_templates.md`.
6. A child page titled exactly `K` under `notion_templates_page_id` from `_templates.md`.
7. Only for the Charter, the KT Checklist and onboarding: the PM Toolkit page, as before.
8. The built-in format.

A template source is either a path to a `.md` file or `notion:<page id>`.

Rule Zero applies here as well. The project config beats the house registry, and the house registry beats the text of the skill.

## 3. Scenarios

### 3.1. No templates (the default)

Nothing to do. `_templates.md` has `templates_root: none`, the configs have `templates.root: none`, and every skill writes in its built-in format, exactly as before v1.2.0. The Data Completeness header shows `Template: built-in`.

### 3.2. The company has a template set (PMO)

1. Choose where the templates live:

| Where | When it fits | Limits |
|---|---|---|
| **A Notion page** (`notion_templates_page_id`), child pages named by key | recommended: visible to every PM, works in both local and cloud runs | the Notion integration needs access to the page |
| **A folder on the Mac** (`templates_root`), for example a synced Google Drive / OneDrive folder | the company already keeps templates as files | reachable only in a session with the Mac; a cloud scheduled task without the Mac falls back to the built-in format (section 5) |
| **Inside the plugin** (`templates_root: templates`, i.e. `projects/templates/` in the installed plugin; relative paths are resolved against `projects/`) | must be reachable everywhere without Notion | changing a template means repackaging the plugin through the customize flow |

2. Name the files or pages after the keys in section 1: `client-report.monthly.md`, `change-request.cr.md`. Templates are only needed for the documents the company wants to change. For the rest, the skills keep their built-in formats.
3. Set the source in `projects/_templates.md` (`templates_root` or `notion_templates_page_id`). If a file name differs from the key, for example `MBR v3.md`, add a line to `overrides`.
4. Check it with `template check` (section 7).

### 3.3. A colleague sets up the system with their own templates

The colleague installs the plugin as usual (`10`). Without templates everything runs on the built-in formats, so templates can be added later and one at a time.

- The templates live **outside the plugin**: the colleague's folder or Notion page. Plugin updates do not touch them.
- The path to them is set in `_templates.md` inside the installed plugin, the same way as the project configs. After a reinstall from a clean `.plugin`, this file has to be restored, like the configs. Edit it through the plugin customize flow, not as a separate skill (`projects/SKILL.md`, "Adding a new project", step 7).
- The colleague does not edit the skills. If it seems a skill edit is unavoidable, it is usually an invariant (section 6). The framework owner changes invariants, a template does not.

### 3.4. A client requires its own format on one project

This is done at the project level in the config:

```yaml
pm_profile:
  templates:
    root: ~/work/acme/templates        # folder for this project only
    overrides:
      client-report.monthly: "notion:<id of the page with the client's format>"
```

Other projects keep using the house templates. A format change follows Rule Zero: a same-day config edit, a Changelog line and a Decisions DB row.

### 3.5. A template in .docx, .pptx or Google Docs

The skills write Markdown to Notion and do not read such files as templates. What to do:

1. Move the **structure** (headings, order, fixed text, disclaimers) into a `.md` template. Ask Claude: "make an md template `client-report.monthly` from this docx".
2. Branding (logo, fonts, headers and footers) is applied when the finished report is exported by hand. For example, you can ask Claude to build a `.docx` from the finished page using the corporate file. Automatic export to a branded format is not built yet (`13`, #50).

## 4. How to write a template

An annotated example is in `templates/documents/_example.client-report.weekly.md` at the repository root. The leading underscore keeps it inactive even when the folder is connected.

```markdown
---
doc_key: client-report.weekly
version: 2026-09-23
owner: PMO
---
# {{project_name}} - Weekly Status Report
**Period:** {{period}} · **Status:** {{status}}

## Summary
<!-- ct: 3 sentences, outcomes, no ticket numbers -->

## Delivered
<!-- ct: completed work grouped by business area -->

## Decisions Needed From You
<!-- ct: from the Risks DB and open CRs; if nothing, say so explicitly -->

## Confidentiality
This report is intended for {{client_name}} only.
```

| Element | How the skill handles it |
|---|---|
| `##` headings | become the sections of the document in the same order; the skill fills each by meaning from the data it already collects |
| `<!-- ct: ... -->` | an instruction for the skill, removed from the output |
| `{{project_name}}`, `{{client_name}}`, `{{period}}`, `{{date}}`, `{{prepared_by}}`, `{{status}}` | filled from the config and the run; an unknown placeholder stays as is and is shown to the PM |
| Any other text | copied verbatim (disclaimers, footers, fixed wording) |
| Frontmatter | optional; if `doc_key` differs from the key the file is plugged in under, the skill warns |

A template does not add data sources. If a section asks for something the skill does not collect (for example "NPS for the quarter" in `client-report`), it writes "TBD: fill manually" and shows it to the PM. It does not invent data for such a section.

## 5. What happens if...

| Situation | Behaviour |
|---|---|
| No file for the key in `templates_root` | not an error: the key is not overridden, the skill goes to the next level |
| A file named explicitly in `overrides` does not exist | fallback to the next level, `Template: FALLBACK built-in (... unreachable)` in the header and a warning in chat |
| A cloud scheduled task, the template is on the Mac | the same: fallback and `FALLBACK`. Keep templates in Notion for cloud runs |
| The template lacks "Decisions needed from you", the status line or risks with actions | the skill does **not** add them silently: it writes `(missing: ...)` in the header and proposes the addition in chat. The template owner decides |
| A section has no data for the period | "No data for this period" (or the `default_language` equivalent) |
| A section needs data the skill does not collect | "TBD: fill manually" and a line in chat |
| A client-facing template is written in Ukrainian | the document is still written in `client_language`: the language rule is an invariant |
| The template contains an em dash | the skill replaces it with a hyphen or a comma |
| An Extras Log template lacks required columns | the eight columns (`Date`, `Request`, `Source`, `Bucket`, `~Hours`, `Billed`, `CR`, `Status`) stay, because `change-request` counts CR numbers and goodwill from them; extra columns are allowed |
| The plugin was updated | templates outside the plugin do not change; keep `_templates.md` the same way as the configs |

## 6. What a template cannot change (invariants)

These rules live in `projects/SKILL.md` ("Document templates", item 4) and apply with any template:

1. **The Data Completeness header.** It is the first line of an internal document. In a client-facing document it is an HTML comment in the saved `.md` and in chat, and it does not appear in the text for the client. It now also shows which template the document was written with.
2. **Language.** Client-facing documents are written in `client_language`, internal ones in `default_language`. No em dash or en dash anywhere.
3. **External sanitization.** Client-facing documents contain no internal names, tools, rates or people risks (`risk-register` rules).
4. **Storage.** The database, `Type`, `Skill`, `Visibility`, the `Project` / `Workspace` relations and the report name pattern do not change, because views, digests and search depend on them.
5. **The 5-minute rule and manual sending.** A template cannot make a skill send anything.
6. **Machine structure.** The Extras Log columns, the `## {Month} {Year}` heading of topic sections, ticket markup per `task_tracker.type` (wiki for Jira Server, ADF for Cloud).
7. **The reader rule** (`_standards.md`, section 1) is not forced into a template, but its absence is always visible (section 5).

## 7. Check: `template check`

Mode `template-check` of the `project-lifecycle` skill. Commands: "template check for <project>" or "check house templates". The skill writes nothing. It shows a table in chat: key, where the template comes from (`project`, `house`, `Toolkit`, `built-in`), whether the source is reachable from local and cloud runs, and which invariants are missing. Run it after every change to the template set and before the first cloud run.

## 8. Where things live

| File | What is in it | Who edits it |
|---|---|---|
| `plugin/skills/projects/_templates.md` | house settings, lookup order, key registry, template format | the owner of the installation (company, PMO, PM) |
| `plugin/skills/projects/SKILL.md`, "Document templates" | how skills apply a template, invariants, fallback | the framework owner |
| `pm_profile.templates` in `projects/<slug>.md` | templates of one project | the project PM, under Rule Zero |
| `plugin/skills/<skill>/SKILL.md` | the built-in format and the **Template** line with its keys just before it | the framework owner |
| `templates/documents/` in the repository | a sample template and a README | the framework owner |
