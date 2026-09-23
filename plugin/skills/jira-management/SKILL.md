---
name: jira-management
description: "Manage Jira tickets for any project registered in the project registry (server URL, project key, labels, transition IDs, epics and assignment rules come from projects/{slug}.md). Create, update, search, transition, and label tickets. Use when the user mentions Jira tickets, board management, ticket creation, status changes, label operations, sprint/kanban work, or a ticket key with the project's prefix (the `task_tracker.project_key` of a registered project). Trigger on: \"створи тікет\", \"create ticket\", \"jira\", \"борда\", \"board\", \"тікет\", \"label\", \"перемісти\", \"transition\", \"статус\", \"зроби задачу\", \"task\", \"баг\", \"bug\", \"епік\", \"epic\", \"саппорт тікет\". If the project is not explicitly named and no ticket-key prefix identifies it, ask which project. When triggered, execute immediately using MCP tools."
---

# Jira Management (project-agnostic engine)

## Step 0 - Project config (always first)

1. Determine the project: from an explicit mention, or from the ticket-key prefix
   (the `task_tracker.project_key` of one registered config). If neither identifies
   it, ASK the user which project (Default Project Rule in `projects/SKILL.md`, list
   the configs in `projects/`). Never guess.
2. Read `../projects/{slug}.md` relative to this skill's folder (fallback: Glob
   `**/projects/{slug}.md`) and `projects/SKILL.md` for the cross-cutting rules.
   RULE ZERO: the config wins over anything here.
3. Check `{config.task_tracker.api_access}`. This skill has no meaning without a
   tracker API: when it is `false` (or `task_tracker.type` is not a Jira type), say
   so, offer the ticket text as a draft the PM can paste, and stop. It never degrades
   to a fallback source.
4. Take from the config: `server_url`, `project_key` (`task_tracker.project_key`, the
   same value as `jira.project_key`), `mcp_write` / `mcp_read` server names, Labels
   Taxonomy, Workflow & Transition IDs, Key Epics, Team - Internal (valid assignees),
   Former Members (never assign), Assignment Rules, `known_bug`.
5. Writes allowed without asking (the 5-minute rule in `projects/SKILL.md`): creating a
   ticket in the backlog, updating labels, summary or description, adding a comment,
   transitions between working statuses. Transitions to Done, deletions and anything
   on the client's own board are drafts for the PM. Every JQL query includes
   `project = {config.task_tracker.project_key}` (JQL Isolation Validator).

## ⚠️ CRITICAL: Execution rules

1. **Execute immediately** - do not explain what you are about to do, just do it.
2. **Always verify writes** - after any create/update/transition, do a follow-up
   `search_issues` or `get_issue` to confirm.
3. **Apply labels** - every new ticket gets a label from the config's taxonomy.
4. **Use Jira wiki markup** for descriptions, not Markdown (h2., h3., \*, #, [link|url], {code}).
5. **Assignees** - only people from the config's CURRENT team table. Never assign
   anyone from a Former Members table.

## MCP server

The Jira MCP server is named in the config: `{config.jira.mcp_write}` for writes and
`{config.jira.mcp_read}` for reads (both default to `jira`, the server shipped in the
plugin's `.mcp.json`). The operations this skill uses:

| Operation | Use for |
|---|---|
| `search_issues` | JQL queries - primary search tool |
| `get_issue` | Full ticket details with comments, assignee and related issues |
| `get_epic_children` | All children of an epic |
| `create_issue` | Create new tickets (projectKey from config) |
| `update_issue` | Update labels, summary, description, assignee, fields |
| `add_comment` | Add comments to tickets |
| `add_attachment` | Attach files to tickets |
| `get_transitions` / `transition_issue` | Status transitions |

If `mcp_read` names a second server with different tool names, map the operations by
meaning; `{config.jira.known_bug}` records any quirk of your server.

### Jira Server quirks (generic; per-project notes in `known_bug`)

- **"Unexpected end of JSON input" on writes**: some servers return HTTP 204 and the
  MCP JSON parser chokes. **The operation usually succeeds** - always verify with a read.
- **Description format**: Jira Server takes wiki markup; Jira Cloud takes ADF
  (`Can not deserialize instance of java.lang.String...` means the server got ADF).
  Follow `{config.task_tracker.type}` and, if a write fails on format, retry with the
  other format once.
- **Epic Link may not be settable via MCP** on older Jira Server versions (needs a
  customfield id the server does not expose). Workaround: create the ticket, then tell
  the user to link it manually:
  > "Тікет створено: {KEY}. Epic Link потрібно додати вручну на борді - перетягни в
  > [epic name] або відкрий тікет → Epic Link → [epic key]."
  Do NOT attempt Epic Link via `update_issue`/`create_issue` unless `known_bug` says it
  works - it silently fails otherwise.

## Useful JQL patterns (substitute {config.task_tracker.project_key}; status names exactly as in the config's Workflow table)

```
project = {KEY} AND status != Done ORDER BY updated DESC
project = {KEY} AND labels = "bug-fix" AND status != Done
project = {KEY} AND assignee = "{username}" AND status != Done
"Epic Link" = {EPIC-KEY} AND status != Done ORDER BY updated DESC
project = {KEY} AND status = "{in-progress status from the Workflow table}" AND updated <= -14d
project = {KEY} AND created >= -7d ORDER BY created DESC
```

## Ticket Creation Defaults

```
projectKey: {config.task_tracker.project_key}
issueType: "Task" (default) | "Bug" | "Story" | "Sub-task"
```

### Ticket template (description) - bug tickets

```
h3. Description
[describe the issue]

h3. Steps to Reproduce
# Step 1
# Step 2

h3. Expected Result
[what should happen]

h3. Actual Result
[what actually happens]

h3. Environment
[Production / Stage / Dev]

h3. Links
* Sentry: [link|url]
* Slack thread: [link|url]
```

### Ticket template - feature/enhancement

```
h3. Context
[why this is needed]

h3. Acceptance Criteria
* [criterion 1]
* [criterion 2]

h3. Links
* Notion: [link|url]
```

## Behavior Guidelines

1. **Always apply a label** from the config's taxonomy when creating tickets.
2. **Use Jira wiki markup** in descriptions, not Markdown.
3. **After any write**, verify with a search or read - don't trust error messages.
4. **Resolve transcript aliases** to correct team members (alias map in the config).
5. **Assignment**: follow the config's Assignment Rules table; when no rule matches,
   leave unassigned and flag to the PM.
6. **Descriptions in `{config.client_language}`** (the board may be visible to the
   client), communication with the user in `{config.default_language}`.
7. **Priority** follows the config's Assignment Rules / Labels Taxonomy notes; without a
   rule, default Medium and flag anything that touches money, auth or data to the PM.
8. **Include Sentry link** in bug tickets when available.
9. **NEVER use em dashes or en dashes** in any Jira content (summaries, descriptions,
   comments). Use hyphen (-) or colon (:) instead - wiki markup does not render them
   reliably.
10. Labels and conventions marked `HISTORICAL` in the config are for reading old tickets
    only - never create new tickets under them.
11. Every report or summary this skill prints opens with the Data Completeness header
    (`projects/SKILL.md`), e.g. `Джерела: Jira OK`.
