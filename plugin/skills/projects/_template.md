# Project: {PROJECT_NAME}

> Copy this file to `projects/{slug}.md` and fill it in. Every engine skill reads this file
> at Step 0 and takes ALL project facts from here. Unknown value = `unknown` or "clarify",
> never invented. Not applicable = `none` (the skill then skips that source and says so in
> the Data Completeness header). Keys referenced by skills as `{config.section.key}` are the
> bold keys below; do not rename them.

## General
- **project_name**: {name}
- **project_slug**: {slug}
- **status**: active   (set to `archived` when the project ends - skills stop offering it)
- **description**: {one-line description}
- **board_type**: Kanban | Scrum
- **default_language**: Ukrainian | English   (language of internal reports and preps)
- **client_language**: English   (language of everything that goes to the client)

## Access Matrix - READ THIS FIRST (as of {YYYY-MM-DD})

| Resource | Access | Since / Until | Notes |
|---|---|---|---|
| {repo or system} | ✅ / ❌ | {date the state began} | {frozen snapshot? client-owned? full control?} |

(Every resource the project's skills touch: repos, DBs, monitoring, comms tools.
When access changes, update the row the same day and add a Changelog line.)

## Internal Infrastructure

| System | Current URL | Notes |
|---|---|---|
| Jira | https://jira.example.com | {e.g. "moved from old.example.com on YYYY-MM-DD; old links in tickets are historical"} |
| Confluence | {url or none} | |
| Git hosting | {url or none} | |
| CI | {url or none} | |

(Skills read old links in tickets as historical and never rewrite what did not change.)

## Task Tracker (ours, for delivery)

```yaml
task_tracker:
  type: jira_server        # jira_cloud | linear | trello | asana | monday | client_notion | manual
  api_access: true         # MCP/REST access available? Client infosec (SSO/Okta/MDM) often says no
  project_key: {KEY}
  fallback_source: none    # manual_export | meeting_action_items | email_summaries
  export_path: none        # for manual_export: ~/work/{slug}/exports/
  browser_access: false    # can the tracker be read through Chrome under the PM's own session?
```

With `api_access: false` skills do NOT fail: they take data from `fallback_source` and state
the source and its freshness in the first line of the report.

## Client Tracker (the client's own board; fill in only if the client keeps one)

```yaml
client_tracker:
  type: none               # client_notion | jira_cloud | linear | trello | none
  api_access: false
  db_id: {id or none}      # e.g. the client's Notion tasks database
  roadmap_url: none        # the client's roadmap page, if any
  target_status: none      # the column/status our new items land in, e.g. "Issue to Work On"
  sync_method: none        # csv_import | browser | manual | none
  browser_access: false
  sync_cadence: "{when we sync}"
  owner: PM
```

Flow is one-way (our tracker → their board). Never claim to know statuses from a client
tracker with `api_access: false`.

## Jira (fill in when task_tracker.type is jira_server / jira_cloud with api_access: true)
- **server_url**: https://jira.example.com
- **server_version**: {version}
- **project_key**: {KEY}   (same value as task_tracker.project_key)
- **mcp_write**: jira      (name of the MCP server used for writes; `jira` is the server shipped in the plugin's .mcp.json)
- **mcp_read**: jira       (name of the MCP server used for reads; the same server unless you run a second one)
- **known_bug**: none      (e.g. "Jira Server 7.x returns a cosmetic JSON error on writes; HTTP 204, the update lands - verify by re-reading")

### Labels Taxonomy
| Label | Purpose | Status |
|-------|---------|--------|
| `feature` | {description} | active |
| `bug-fix` | {description} | active |
| `ops-support` | {description} | active |
| `{label}` | {description} | HISTORICAL since {date} (skills read it as history, never assign it) |

### fixVersion Convention
{describe how versions are named and when they are assigned, or "none"}

### Key Epics
| Epic Key | Name | Purpose |
|---|---|---|
| {KEY-1} | {name} | {purpose} |

### Assignment Rules (as of {YYYY-MM-DD})
| Domain | Assign to |
|---|---|
| {domain} | {username or "no internal resource, leave unassigned, flag to PM"} |

### Workflow & Transition IDs
| Status (exact name for JQL) | Transition ID | Meaning |
|--------|--------------|---------|
| To Do | {id} | backlog |
| In Progress | {id} | in work |
| {In Review / Ready for QA / ...} | {id} | waiting for review or QA |
| {On Hold / Blocked} | {id} | blocked (skills treat this as the "blocked" status) |
| Done | {id} | done |

(Skills take status names ONLY from this table. Names with spaces or slashes must be quoted
in JQL exactly as written here.)

## Slack
- **workspace**: {workspace name}
- **slack_access**: mcp   (mcp = Claude's Slack connector | mcp_local = your own local Slack MCP server | chrome = read the web UI, last resort | none)
- **mcp_local_server**: none   (name of the local MCP server when slack_access = mcp_local)
- **permalink_base**: https://{workspace}.slack.com   (used to build message permalinks; the permalink is the dedup key in Threads)
- **channels_dev**: {#channel}
- **channels_stability**: {#channel or "none"}
- **channels_all**: {comma-separated list of all channels to scan}
- **channel_ids**: {#channel: C0123456789, #other: C0987654321}   (needed for permalinks and for a local MCP server)
- **json_output_folder**: none   (optional local copy of collected messages, e.g. ~/work/{slug}/slack-json/)

## Sentry
- **url**: {sentry URL or "none"}
- **token_env**: `{PROJECT}_SENTRY_TOKEN`   (the value lives in the secrets file, NOT here)
- **secrets_file**: `~~home-folder/work/Secrets/secrets.env`
- **org_slug**: {org}
- **projects_in_scope**: {comma-separated project slugs we monitor}
- **projects_out_of_scope**: none   (or: `{slug} (client-owned since YYYY-MM-DD)`, ... - skills mention them only as context, never create tickets or risks for them)

(If there is no Sentry, set url to "none" and skills skip Sentry checks.)

## Notion
- **project_page_id**: {UUID of the project page in the Projects DB}
- **workspace_page_id**: {UUID of the workspace page in the Workspaces DB}
- **current_state_page**: {UUID of the Current State page under the project page, or none}
- **inbox_review_page**: {UUID of the Inbox Review page under the project page, or none}   (inbox-responder appends its daily section here)
- **reports_db**: collection://~~notion-reports-db
- **threads_db**: collection://~~notion-threads-db
- **meetings_db**: collection://~~notion-meetings-db
- **topics_db**: collection://~~notion-topics-db
- **knowledge_base_db**: collection://~~notion-knowledge-base-db
- **risks_db**: collection://~~notion-risks-db
- **decisions_db**: collection://~~notion-decisions-db
- **tasks_tracker_db**: collection://~~notion-tasks-tracker-db

(All databases are shared across projects; only project_page_id, workspace_page_id,
current_state_page and inbox_review_page are per project. Projects are separated by the
relation values, so tagging is what keeps them apart.)

### Notion relation property names (unified 2026-09-08)
All databases use the same names: `Project` and `Workspace` (singular, no emoji).
Cross-relations have no emoji either: `Meetings`, `Threads`, `Topics`, `Knowledge Base`,
`Tasks Tracker`, `Inbox`. Values are always a JSON array of page URLs:
`["https://app.notion.com/p/<id-without-dashes>"]`.
Status values written by skills: `AI Review` (created or updated by an automation, a human
should confirm) in Threads, Topics and Risks; Topics progress lives in the status property
`Progress`. If a live schema ever diverges from this paragraph, the live schema wins: fetch the
data source, write with the real name, and fix this file the same day.

## Local Paths
- **aws_logs**: {path to CloudWatch/other log exports or "none"}
- **time_reports**: {path to Tempo/time-tracking exports or "none"}
- **repos_root**: {path to the local git clones or "none"}
- **kb_root**: {path to the project knowledge base or "none"}
- **reports_root**: {where skills drop local report files, or "none" - then they land next to repos_root}

(If a path is "none", skills that use it skip that data source.)

## Gmail
- **client_search_filter**: none   (a ready Gmail query for client mail, e.g. `from:(@client.com) newer_than:30d`, or "none" when project mail arrives through Mail.app)

## Team - Internal (as of {YYYY-MM-DD})
| Name | Role | Jira Username | Report Title | Availability | Focus Areas |
|------|------|---------------|--------------|--------------|-------------|
| {PM name} | PM | {username} | Project Manager | full-time | - |
| ... | ... | ... | ... | part-time until {date} / full-time | ... |

### Former Members
| Name | Role | Last day on the project | Notes |
|------|------|-------------------------|-------|
| {name} | {role} | {YYYY-MM-DD} | {facts are never deleted, they get an end date} |

### Transcript Alias Map
| Transcript says | Actually is |
|----------------|-------------|
| {alias} | {real name} |

## Team - Client (this is the Stakeholder Register; standard in `_standards.md` section 6)
| Name | Role | Email | Influence | Interest | Channel | Cadence | Notes |
|------|------|-------|-----------|----------|---------|---------|-------|
| {name} | {role} | {email} | H / M / L | H / M / L | Email / Slack / Call | {how often} | {expectations; whose silence is normal} |

(Influence × Interest decides whom we keep close (H/H) and whom we keep informed. The PM
fills these columns; skills never set them.)

## Meetings Schedule
- **internal_sync_cadence**: {daily | alternate days: week A Mon/Wed/Fri, week B Tue/Thu | none}

| Day | Time | Type | Agenda | ID Suffix | Focus |
|-----|------|------|--------|-----------|-------|
| {day} | {time} | {type} | {key from `_standards.md` section 5, e.g. client_status_sync} | {scheduled-task-id-suffix} | {focus} |

(Skills use this schedule to determine the meeting type; the Agenda key selects the prep
structure from `_standards.md`. No Agenda column = map by Type, ask if ambiguous.)

## Deploy Config (read by deploy-analysis)

| Repo | Local path | Prod branch | Pending (stage) branch | In default scope? |
|------|------------|-------------|------------------------|-------------------|
| {repo} | {repos_root}/{repo} | {branch} | {branch} | ✅ / ❌ |

- **deploy_windows**: {e.g. "Tue and Thu 08:00-10:00 client time, never on Friday", or none}
- **promotion_rule**: {e.g. "stage → prod after client sign-off", or none}
- **hotfix_policy**: {e.g. "hotfix branch from prod, back-merge to dev same day", or none}

(If the project has no repos we deploy, write "none" and deploy-analysis refuses politely.)

## Email Routing (read by mac-mail-collector)

```yaml
email_routing:
  mac_mail_accounts: [{folder names under ~/work/Mail/}]
  client_emails:        # all client addresses
    - {email}
  unique_emails:        # occur ONLY on this project; matching goes by these
    - {email}
  unique_domains: []    # if the whole client organisation is on one domain, e.g. client.com
  team_emails:          # ours, for the 🔴 icon when the last author is not ours
    - {email}
  knowledge_base: none  # name of a KB page with address lists, or none
```

Shared addresses are not listed by hand: an address is shared when it appears in
`client_emails` of two or more active configs. A thread belongs to a project only when a
`unique_emails` entry, a `unique_domains` suffix or a non-shared `client_emails` address
matches. `mac_mail_accounts` is a fallback for incoming mail only; outgoing (Sent) mail
is routed by recipients alone.

## Engagement Status (as of {YYYY-MM-DD})
- **model**: {delivery | support | ...}
- **team_size**: {n}
- **qa_in_team**: {yes | no}
- **end_date**: {date or open}
- **metric_continuity**: none   (or: "periods before YYYY-MM-DD are not comparable: team {n} -> {m}, scope narrowed to {component}; any chart crossing that date must carry this annotation")

### Scope of Responsibility
| Component | Ours / Client-owned | Since | Notes |
|---|---|---|---|
| {component} | ours | {date} | |
| {component} | client-owned | {date} | {skills mention it only as context; never create tickets, risks or fixes for it} |

## Cultural Profile (Erin Meyer's Culture Map; read by client-satisfaction-tracker and client-meeting-prep)
- **client_country**: {country or unknown}
- **our_country**: {country}

| Scale | Us | Client | Practical consequence |
|---|---|---|---|
| Communicating (low ↔ high context) | | | |
| Evaluating (direct ↔ indirect negative feedback) | | | |
| Persuading (principles ↔ applications first) | | | |
| Leading (egalitarian ↔ hierarchical) | | | |
| Deciding (consensual ↔ top-down) | | | |
| Trusting (task ↔ relationship) | | | |
| Disagreeing (confrontational ↔ avoids) | | | |
| Scheduling (linear ↔ flexible time) | | | |

### Downgrader multipliers (individual calibration, filled after the first 3-4 meetings)
| Person (role) | Multiplier | Tells |
|---|---|---|
| {role, e.g. client PM} | 1.0 | {e.g. "says 'maybe later' when meaning no"} |

(A multiplier > 1 means the person softens bad news; skills scale the seriousness of
indirect wording by it. Fill at least `client_country`; leave the rest `unknown` until observed.)

## PM Profile (as of {YYYY-MM-DD}; standards and keys in `projects/_standards.md`)

```yaml
pm_profile:
  case: A                    # A new from scratch | B taken over from another PM | C not a software project
  phase: active_delivery     # active_delivery | support | on_fire | closing
  delivery_approach: kanban  # kanban | scrum | hybrid | none
  metrics_profile: kanban_support   # kanban_support | scrum_active | on_fire | none
  wip_limit: none            # number or none
  contract:
    type: unknown            # t_and_m | capped_t_and_m | fixed_price | dedicated_team | unknown
    hours_cap_month: none    # number (team total) or none; enables the hours_burn metric
    budget_cap: none         # amount or none (if finance is run by delivery management, say so)
    goodwill_budget_pct: none   # % of hours_cap_month for free small favours; none = 10% (calibrate); read by change-request
    billing: "{monthly invoice | milestones | ...}"
    period: "{start} - {end or open}"
  sla: none                  # or {response: "4h", resolution: "2d", hours: "9-18 <TZ>"}
  milestones: []             # - {name: "...", date: YYYY-MM-DD, status: planned | done | slipped}
  decision_rights:           # short RACI: who has the final say (A)
    scope_priorities: "{name, role}"
    tech_decisions: "{name, role}"
    estimates: "{who gives the number; always the assignee}"
    prod_deploy_approval: "{name, role}"
    budget_margin: "{name, role}"
    escalation_path: "{PM -> Account Manager -> ...}"
  documents:                 # Notion page IDs of PM Toolkit artefacts, or none
    charter_page_id: none
    kt_checklist_page_id: none   # case B
    onboarding_template_page_id: none   # team member onboarding page template
    pm_toolkit_page_id: none     # root page of the PM Toolkit in the Knowledge Base
    extras_log_page_id: none     # "Scope & Extras Log" page under the project page (kept by change-request)
    last_health_check: none      # date of the last Project Health Check
  reporting:
    locked_template_page_id: none   # a previous client report whose structure wins over client-report's formats, or none
  templates:                 # per-project document templates; beat the house registry in projects/_templates.md
    root: none               # folder with {doc_key}.md files for this project only (e.g. a client-imposed format), or none
    overrides: {}            # doc_key: "path/to/file.md" or "notion:<page id>"
```

A missing PM Profile does not break skills: the profile is derived from `board_type` and the
report says `PM Profile: SKIPPED` in the Data Completeness header.

## Changelog (append-only, newest on top)

- **{YYYY-MM-DD}** - config created
