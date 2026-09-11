---
name: jira-management
description: "Manage Jira tickets for any project registered in the project registry (server URL, project key, labels, transition IDs, epics and assignment rules come from projects/{slug}.md). Create, update, search, transition, and label tickets. Use when the user mentions Jira tickets, board management, ticket creation, status changes, label operations, sprint/kanban work, or a ticket key with the project's prefix (e.g. PROJ- for acme). Trigger on: \"створи тікет\", \"create ticket\", \"jira\", \"борда\", \"board\", \"тікет\", \"label\", \"перемісти\", \"transition\", \"статус\", \"зроби задачу\", \"task\", \"баг\", \"bug\", \"епік\", \"epic\", \"саппорт тікет\". If the project is not explicitly named and no ticket-key prefix identifies it, ask which project. When triggered, execute immediately using MCP tools."
---

# Jira Management (project-agnostic engine)

## Step 0 - Project config (always first)

1. Determine the project: from an explicit mention, or from the ticket-key prefix
   (e.g. `PROJ-...` → acme). If neither identifies it, ASK the user which project
   (Default Project Rule in projects/SKILL.md). Never guess.
2. Read `../projects/{slug}.md` relative to this skill's folder (fallback: Glob
   `**/projects/{slug}.md`). RULE ZERO: the config wins over anything here.
3. Take from the config: `server_url`, `project_key`, `mcp_write`/`mcp_read`
   connector names, Labels Taxonomy, Workflow & Transition IDs, Key Epics,
   Team (valid assignees) and Assignment Rules, known bugs.

## ⚠️ CRITICAL: Execution rules

1. **Execute immediately** - do not explain what you are about to do, just do it.
2. **Always verify writes** - after any create/update/transition, do a follow-up
   `search_issues` or `getTask` to confirm.
3. **Apply labels** - every new ticket gets a label from the config's taxonomy.
4. **Use Jira wiki markup** for descriptions, not Markdown (h2., h3., \*, #, [link|url], {code}).
5. **Assignees** - only people from the config's CURRENT team table. Never assign
   anyone from a Former Members table.

## MCP Connectors (corporate Jira Server)

The config names the connectors per project (`mcp_write` / `mcp_read`). For the
corporate Jira Server these are:

### jira-cosmix (READ primary + WRITE for create/update)

| Tool | Use for |
|---|---|
| `search_issues` | JQL queries - primary search tool |
| `get_issue` | Full ticket details with comments and related issues |
| `get_epic_children` | All children of an epic |
| `create_issue` | Create new tickets (projectKey from config) |
| `update_issue` | Update labels, summary, description, fields |
| `add_comment` | Add comments to tickets |
| `add_attachment` | Attach files to tickets |
| `get_transitions` / `transition_issue` | Status transitions |

### jira-rixbeck (READ + STATUS + ASSIGNEE)

| Tool | Use for |
|---|---|
| `getTask` | Full ticket details **including assignee** |
| `getTasks` | Search by JQL (alternative to cosmix) |
| `getAvailableStatuses` | Check available transitions |
| `updateTaskStatus` | Change status using statusId |
| `updateTaskOwner` | Change assignee using accountId |
| `getProjects` | List available projects |

### Jira Server 7.x quirks (apply to the corporate server; per-project notes in config)

- **"Unexpected end of JSON input" on writes**: the server returns HTTP 204, the MCP
  JSON parser chokes. **The operation actually succeeds** - always verify with a read.
- **cosmix ADF format**: cosmix converts bodies to Atlassian Document Format (Cloud);
  Server 7.x wants plain text (`Can not deserialize instance of java.lang.String...`).
  If a cosmix write fails, retry the write with rixbeck.
- **Epic Link is NOT settable via MCP** (needs a customfield id neither connector
  exposes). Workaround: create the ticket, then tell the user to link it manually:
  > "Тікет створено: {KEY}. Epic Link потрібно додати вручну на борді - перетягни в
  > [epic name] або відкрий тікет → Epic Link → [epic key]."
  Do NOT attempt Epic Link via `update_issue`/`create_issue` - it silently fails.

## Useful JQL patterns (substitute {config.jira.project_key})

```
project = {KEY} AND status != Done ORDER BY updated DESC
project = {KEY} AND labels = "bug-fix" AND status != Done
project = {KEY} AND assignee = "{username}" AND status != Done
"Epic Link" = {EPIC-KEY} AND status != Done ORDER BY updated DESC
project = {KEY} AND status = "In Progress" AND updated <= -14d
project = {KEY} AND created >= -7d ORDER BY created DESC
```

## Ticket Creation Defaults

```
projectKey: {config.jira.project_key}
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
6. **Descriptions in English**, communication with the user in Ukrainian.
7. **High priority** for auth/payment issues, always.
8. **Include Sentry link** in bug tickets when available.
9. **NEVER use em dash (—)** in any Jira content (summaries, descriptions, comments).
   Use hyphen (-) or colon (:) instead - Jira Server 7.x wiki markup does not render
   em dash correctly.
10. Historical conventions marked as ENDED in the config (e.g. acme's [EXT-QA] flow,
    ended 2026-07-31) are for reading old tickets only - never create new tickets
    under them.
