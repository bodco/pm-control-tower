# Document Templates (house registry)

> Which template each generated document uses. This file is YOURS, like the project
> configs: it holds the house-wide choice (company, PMO or personal). A project config
> can override it per document (`pm_profile.templates`), and when nothing is set, every
> skill uses its built-in format. Full guide: document 15 of the Control Tower docs
> ("Document templates", `docs/en/15-document-templates.md` in the repository).
>
> Nothing here is required. With `templates_root: none` and no Notion page, the library
> behaves exactly as it did before this file existed.

## House settings

```yaml
templates:
  templates_root: none             # folder with house templates: absolute (~/work/Templates, Mac only, see "Reachability")
                                   # or relative to this projects/ folder (templates = projects/templates/ inside the plugin)
  notion_templates_page_id: none   # Notion page whose child pages are templates named by doc key (reachable from cloud runs)
  overrides: {}                    # explicit per-key sources when a file or page name differs from the key:
                                   #   client-report.monthly: "~/work/Templates/MBR v3.md"
                                   #   change-request.cr: "notion:<page id>"
```

## Resolution order (first hit wins)

For a document with key `K`, a skill looks for its template in this order:

1. Project config: `pm_profile.templates.overrides.K`.
2. Project config: `{pm_profile.templates.root}/K.md`.
3. Only for `client-report.*`: `pm_profile.reporting.locked_template_page_id` (a previous
   report whose structure is locked; kept for backward compatibility).
4. This file: `overrides.K`.
5. This file: `{templates_root}/K.md`.
6. This file: a child page titled exactly `K` under `notion_templates_page_id`.
7. Only for `project-lifecycle.charter`, `.kt-checklist`, `.onboarding`: the matching PM
   Toolkit page under `pm_profile.documents.pm_toolkit_page_id` (or
   `onboarding_template_page_id`), as before.
8. The built-in format in the skill's own SKILL.md (column "Built-in" below).

A source is either a path to a `.md` file or `notion:<page id>`. Relative paths are
resolved against this `projects/` folder (so a folder shipped inside the plugin works in
cloud runs too); `~` is the home folder on the Mac. Other formats (.docx,
.pptx, Google Docs) are not read as templates: convert their structure to `.md` first.

## Reachability

A path on the Mac is reachable only in a session that has the Mac (local Cowork, or a
cloud session with the device bridge). In a cloud scheduled run without the Mac, a
local template is unreachable: the skill falls back to the next level and writes
`Template: FALLBACK ...` in the Data Completeness header. For templates that must
also work in cloud runs, use `notion:` sources or `notion_templates_page_id`.

## Document keys

| Key | Skill | Document | Built-in (in SKILL.md) | Saved to |
|---|---|---|---|---|
| `client-report.weekly` | client-report | Weekly client report (EN) | "Weekly Report Format" | Reports DB, Visibility External; local `.md` |
| `client-report.monthly` | client-report | Monthly client report (EN) | "Monthly Report Format" | Reports DB, External; local `.md` |
| `client-report.steering` | client-report | Steering / exec update (EN) | "Steering / Exec Update Format" | Reports DB, External; local `.md` |
| `client-meeting-prep.planning` | client-meeting-prep | Planning prep | "Planning prep" | Reports DB, Internal |
| `client-meeting-prep.status-sync` | client-meeting-prep | Status sync prep | "Status sync prep" | Reports DB, Internal |
| `client-meeting-prep.one-on-one` | client-meeting-prep | 1-1 with the client lead | "1-1 with the client lead" | Reports DB, Internal |
| `client-meeting-prep.review` | client-meeting-prep | Review / demo prep | "Review prep" | Reports DB, Internal |
| `daily-team-prep` | daily-team-prep | Internal team sync prep | "Report Format" | Reports DB, Internal |
| `weekly-overview` | weekly-overview | Weekly overview across projects | "Report Format" | Reports DB, Internal |
| `velocity-report` | velocity-report | Monthly velocity report | "Report Format" | Reports DB, Internal |
| `jira-board-health` | jira-board-health | Board health check | "Report Format" | Reports DB, Internal |
| `stability-scan.internal` | stability-scan | Stability scan (UA) | "Report Format - Ukrainian" | Reports DB, Internal; local `.md` |
| `stability-scan.external` | stability-scan | Stability report for the client (EN) | "Report Format - English" | local `.md` |
| `deploy-analysis` | deploy-analysis | Deploy analysis, stage release notes | README.md, "7. Compose the report" | Reports DB, Internal; local `.md` |
| `risk-register.internal` | risk-register | RAID summary (UA) | "Internal summary" | Reports DB, Internal |
| `risk-register.external` | risk-register | Sanitized risk report (EN) | "External summary" | Reports DB, External |
| `risk-register.dossier` | risk-register | Body of one risk | "Risk Dossier Format" | Risks DB page body |
| `client-satisfaction` | client-satisfaction-tracker | Sentiment report | "Output Report" | Reports DB, Internal |
| `change-request.cr` | change-request | Change Request (EN) | "Step 4" | Reports DB, External |
| `change-request.extras-log` | change-request | Scope & Extras Log | "Step 3" | page under the project page |
| `project-lifecycle.kickoff` | project-lifecycle | Kickoff report | "K8" | Reports DB, Internal |
| `project-lifecycle.charter` | project-lifecycle | Project Charter | Toolkit page, else plain sections | page under the project page |
| `project-lifecycle.kt-checklist` | project-lifecycle | KT / Handover checklist | Toolkit page, else plain sections | page under the project page |
| `project-lifecycle.handover` | project-lifecycle | Handover-in report | "Mode handover-in" | Reports DB, Internal |
| `project-lifecycle.health-check` | project-lifecycle | Project Health Check | "Mode health-check" | Reports DB, Internal |
| `project-lifecycle.onboarding` | project-lifecycle | Team member onboarding page | Toolkit page, else plain sections | page under the project page |
| `project-lifecycle.closure` | project-lifecycle | Closure report | "Mode closure" | Reports DB, Internal |
| `project-lifecycle.handover-pack` | project-lifecycle | Handover pack at closure | "Mode closure", step 3 | page under the project page |
| `notion-meeting-topics` | notion-meeting-topics | Bilingual meeting report | "Report Structure" | appended to the meeting page |
| `topic-manager.month-section` | topic-manager | Monthly section of a topic | "Month Section Format" | Topics DB page body |
| `inbox-responder.draft` | inbox-responder | Draft reply to a thread | "Draft structure" | Threads DB `Draft Response` |
| `jira-management.bug` | jira-management | Bug ticket description | "Ticket template - bug tickets" | tracker ticket |
| `jira-management.feature` | jira-management | Feature ticket description | "Ticket template - feature/enhancement" | tracker ticket |
| `slack-collector.ticket` | slack-collector | Ticket from a Slack thread | "4.4 - Create the ticket" | tracker ticket |
| `thread-ticket-sync.ticket` | thread-ticket-sync | Ticket on the client's Notion board | "task" body in Phase 2 | client Notion board |

Not templatable (machine records or chat answers, their format is a contract between
skills): Threads DB pages from `slack-collector` and `mac-mail-collector`, Topics DB
properties, Risks and Decisions DB properties, Tasks Tracker rows, `sentry-assistant`
answers, every chat summary.

## Template file format

```markdown
---
doc_key: client-report.weekly
version: 2026-09-23
owner: PMO
---
# {{project_name}} - Weekly Status Report
**Period:** {{period}} · **Prepared by:** {{prepared_by}}

## Summary
<!-- ct: 3 sentences, outcomes, not ticket numbers -->

## Delivered
<!-- ct: completed work grouped by business area -->

## Confidentiality
This report is intended for {{client_name}} only.
```

- Headings = the sections of the output, in this order. The skill fills each section by
  meaning from the data it already collects; it never collects new sources for a template.
- `<!-- ct: ... -->` = instructions for the skill. They are removed from the output.
- `{{placeholder}}`: `project_name`, `client_name`, `period`, `date`, `prepared_by`,
  `status` (🟢/🟡/🔴 with the reason). Unknown placeholders stay as they are and are
  listed to the PM.
- Any other text (disclaimers, footers, fixed wording) is copied verbatim.
- A section the skill has no data for gets "No data for this period" (or the
  `default_language` equivalent). A section that needs data the skill does not collect
  gets "TBD: fill manually" and is listed to the PM. Nothing is invented.
- Frontmatter is optional; `doc_key` in it must match the key the file is used for.
