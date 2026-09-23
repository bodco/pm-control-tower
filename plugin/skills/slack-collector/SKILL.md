---
name: slack-collector
description: "Collects Slack channel/thread messages into the project's Notion Threads DB, deduplicated by permalink. Reads slack_access from the project config to pick the collection method (Claude's Slack connector, a project-specific local MCP server, or Chrome as a last resort) and reads channel IDs and the team roster from the config, never from its own body. Use when the user asks to sync, collect or catch up Slack for a named project: \"збери слак\", \"зібрати слак за\", \"синхронізуй слак\", \"slack sync\", \"collect Slack\", \"sync Slack\", \"catch up Slack\". When triggered, execute immediately."
---

# Slack → Notion Collector

## Project Config

**Step 0 - always run first:**

1. Determine the project from the user's request. If the project is NOT explicitly named, do not guess and do not default: ask the user which project (list the configs in `projects/`). See the Default Project Rule in projects/SKILL.md.
2. Read the project config `../projects/{project_slug}.md` relative to this skill's folder (the `projects` skill folder sits next to this one). If the relative read fails, locate it with Glob: `**/projects/{project_slug}.md` under the skills directory. (Legacy note: `_projects/` no longer exists.)
3. All values below marked as `{config.xxx}` come from the config file. Where the config carries the same information as a markdown table rather than a scalar value (the team roster, the Labels Taxonomy), this skill says so explicitly and reads the table - it does not invent a fake key for it.
4. Read `../projects/SKILL.md` for the cross-cutting rules (Default Project Rule, JQL Isolation Validator, Data Completeness header, the 5-minute rule).
5. Check `{config.task_tracker.api_access}` right after this step: Step 4 writes tickets, so when it is `false` (or `{config.task_tracker.type}` is `none`), Step 4 produces the ticket text as a draft in the channel summary instead of writing, and the summary says so.

If the config file doesn't exist, tell the user: "Project config not found. Available projects: [list files in projects/]"

**Step 0b - verify the live schema.** Before the first Notion write of a run, fetch the Threads data source (`notion-fetch` on `{config.notion.threads_db}`) and use the property names it reports; if they differ from the names in Step 3, write with the real names and report the discrepancy.

**Behavior.** Writes allowed without asking (the 5-minute rule in `projects/SKILL.md`): new or updated Threads DB pages, a new ticket in the tracker backlog, a local JSON copy; everything else is a draft for the PM.

---

## ⚠️ CRITICAL: How to execute this skill

**DO NOT generate prompts. DO NOT output text for the user to copy. DO NOT explain what you are about to do.**

When this skill triggers, immediately use your available tools - tool call by tool call, step by step.

The only exception: if the date range is not provided, ask for it first. That is the only question allowed.

If no channel is specified - run for **all channels** of the project (`{config.slack.channels_all}`), one at a time. An empty or `none` `channels_all` means there is nothing to collect: say `Slack SKIPPED (channels_all: none)` in the summary and stop.

---

## How Slack access is determined per project

From the project config, check the `{config.slack.slack_access}` field. Its values are exactly `mcp | mcp_local | chrome | none`:

| Value | Meaning | Tools used |
|---|---|---|
| `mcp` | Claude's built-in Slack connector (one workspace per Claude account) | `slack_read_channel`, `slack_read_thread`, `slack_list_user_channels` |
| `mcp_local` | A project-specific local MCP Slack server (self-hosted, one per client workspace, no per-account limit) named `{config.slack.mcp_local_server}` | typically `conversations_history`, `conversations_replies`, `channels_list` on that server |
| `chrome` | The Claude in Chrome connector reading the Slack web UI, last resort | Chrome navigation |
| `none` | No Slack access for this project | skip Slack with one header line in the summary (`Slack SKIPPED (slack_access: none)`) and stop |

**Always follow the `slack_access` value from the config for the requested project.** Do not substitute one method for the other unless explicitly told.

The Notion write step (Step 3) is identical regardless of Slack access method.

---

## Execution steps

Process channels one at a time, finish each fully before moving to the next.

---

### Step 1A - Read messages via Claude's Slack connector (`slack_access = mcp`)

Use `slack_read_channel` with:
- `channel_id`: one channel from `{config.slack.channels_all}`, resolved to its ID through `{config.slack.channel_ids}` (channels may be private: resolve by ID from the config, never by name search)
- `oldest`: START_DATE as Unix timestamp (start of day)
- `latest`: END_DATE as Unix timestamp (end of day)
- `limit`: 100 - paginate until all messages in the date range are collected

Collect only top-level messages (not replies). For each message, call `slack_read_thread` with `channel_id` + `message_ts` to get all replies.

**Permalink construction from `message_ts`:**
- Example ts: `1709123456.789012` → remove dot → `1709123456789012` → prepend `p`
- Full link: `{config.slack.permalink_base}/archives/{CHANNEL_ID}/p1709123456789012`

Build the message object (shared shape across 1A/1B/1C, see below), then go to **Step 2**.

---

### Step 1B - Read messages via a local MCP Slack server (`slack_access = mcp_local`)

Used when the project's workspace can't use Claude's built-in connector (already bound to a different workspace on this account) but a read-only local MCP server has been set up for it - the server name is `{config.slack.mcp_local_server}`.

Tool names differ from 1A. The local server typically exposes:
- `channels_list` to resolve a channel name to ID if only a name is known (private channels won't show - prefer IDs from `{config.slack.channel_ids}`, same as 1A)
- `conversations_history` with `channel` = channel ID, `oldest`/`latest` as Unix timestamps, paginate via `cursor` until exhausted, to get top-level messages
- `conversations_replies` with `channel` + `ts` of each top-level message to get all replies

**Known limitation:** `conversations_search_messages` on this server typically returns `missing_scope` (`search:read` is not part of the standard read-only scope set) - do not rely on it. If you only have a Slack permalink and need `channel_id` + `message_ts` from it: parse the URL `/archives/{CHANNEL_ID}/p{timestamp}` - strip the leading `p`, then insert a `.` six digits from the end (`1788781759239989` → `1788781759.239989`) to get `message_ts`, then call `conversations_replies` directly.

Permalink construction is identical to 1A: `{config.slack.permalink_base}/archives/{CHANNEL_ID}/p{ts_no_dot}`.

Build the same message object as 1A, then go to **Step 2**.

---

### Step 1C - Read messages via Chrome (`slack_access = chrome`)

Use the Claude in Chrome connector. Do NOT use any other connector.

Navigate directly to the channel URL built from the config: `{config.slack.permalink_base}/archives/{channel_id}` with the ID from `{config.slack.channel_ids}`. Always navigate first - do not screenshot first.

**If Chrome seems unavailable - try navigation once. Only stop if it clearly fails.**

After navigation:
- Channel is visible → proceed
- Login screen appears → stop, show screenshot, ask the user to log in manually in the Chrome profile that is signed into `{config.slack.workspace}`. Do NOT attempt to log in yourself.

For each message between START_DATE and END_DATE:
1. Open thread via the Claude in Chrome connector
2. Read full main message + all comments
3. Get permalink: "..." menu → "Copy link"
4. Build the same message object as in Step 1A

Then go to **Step 2**.

---

### Message object shape (all three access modes build this)

```
{
  slack_link,        // constructed permalink
  title,             // first 100 chars of main message text
  reported_at,       // ISO timestamp from message_ts (e.g. 2026-03-01T14:30:00)
  last_reply_date,   // ISO of last reply ts; if no replies → same as reported_at
  last_author,       // display name of last reply author; if no replies → main msg author
  knowledge_base,    // channel name, e.g. "#dev-channel"
  main_message: { author, timestamp, text },
  comments: [ { author, timestamp, text } ]   // empty array if no replies
}
```

---

### Step 2 - Save to JSON file *(Cowork only - skip entirely in Chat, and skip entirely in a cloud session with no local disk)*

**JSON file path:** `{config.slack.json_output_folder}/{channel_name}_{START_DATE}_{END_DATE}.json`

If `{config.slack.json_output_folder}` is `none` or missing in the config, skip this step - it is optional local bookkeeping, not required for the Notion write in Step 3.

If file exists (resume mode):
- Messages already in file (match by `slack_link`): compare `last_reply_date` - unchanged → skip; changed → re-read thread, update entry
- New messages not yet in file: append

If file does not exist: create with `[]`.

**Write each message to JSON immediately after collecting it** - do not batch.

---

### Step 3 - Write to Notion (Notion MCP)

*(Identical for all Slack access methods)*

For each collected message:

**Determine icon:**
- `last_author` NOT in the project's internal team roster (the "Team - Internal" table in the project config, matched against Name and Jira Username columns) → `icon = "🔴"`
- `last_author` IS in the internal team roster → `icon = null`

**Check if record exists:**
Fetch the Threads data source (`{config.notion.threads_db}`) and filter (or `notion-query-data-sources` when the plan allows). Match by the `archives/{CHANNEL}/p{ts}` tail of `slack_link`, ignoring the host - a workspace rename changes the permalink host (e.g. a workspace can be renamed) but old Notion records keep the old host, and Slack redirects from old hosts anyway. Comparing the full URL string breaks deduplication silently after any workspace rename.

**If NOT found → create** (`notion-create-pages`; property names as confirmed in Step 0b):

Properties:
- Thread Name (title): `message.title`
- Slack Link: `message.slack_link`
- Reported at: `message.reported_at`
- Last Reply Date: `message.last_reply_date`
- Type (multi_select): `["Slack"]`
- Project (relation): `["https://app.notion.com/p/{config.notion.project_page_id without dashes}"]`
- Workspace (relation): `["https://app.notion.com/p/{config.notion.workspace_page_id without dashes}"]`
- Status: `AI Review` (reserved for items created or updated by automations; the PM changes it after confirming)
- Knowledge Base (relation): the page for `message.knowledge_base`, if one exists
- Icon: as determined above

Relation properties need full URLs, not bare UUIDs: always the `["https://app.notion.com/p/<id-without-dashes>"]` form.

Page content blocks:
1. `type: mention`, `mention.type: date`, value: `main_message.timestamp`, append: `" - " + main_message.author`
2. `type: quote`, text: `main_message.text` - **split rule applies (see below)**
3. `type: divider`
4. Repeat for each comment:
   - `type: mention`, `mention.type: date`, value: `comment.timestamp`, append: `" - " + comment.author`
   - `type: quote`, text: `comment.text` - **split rule applies (see below)**
   - `type: divider`

**⚠️ CRITICAL: Notion block text limit - 2000 characters max per block**

Notion silently truncates any text block longer than 2000 characters. This causes data loss for long Slack messages.

**Split rule:** before writing any `quote` block, check the length of the text:
- If `text.length <= 2000` → write as a single `quote` block (normal)
- If `text.length > 2000` → split into multiple consecutive `quote` blocks, each ≤ 2000 chars. **Split at word boundaries** (do not cut mid-word). All split parts go one after another before the next `divider`.

Example for a 3500-char comment:
```
[mention block]  ← date + author
[quote block]    ← chars 0-1999 (ends at word boundary)
[quote block]    ← chars 2000-3499 (remainder)
[divider]
```

This rule applies to BOTH `main_message.text` and each `comment.text`.

**If FOUND → compare Last Reply Date:**
- Equal (to the minute) → **skip**
- Different → **update:** set Last Reply Date, recalculate icon, fully rewrite page content

### Step 4 - Sync to the tracker (the Jira MCP server from `{config.jira.mcp_write}`, default `jira`)

*(Runs after Step 3 for each message. Only for messages that were Created or Updated in Notion - skip Notion-Skipped ones. Requires `{config.task_tracker.api_access}` = `true` (checked in Step 0): when it is `false`, do not write - produce the ticket text from 4.4 as a draft in the channel summary and log `jira: draft (api_access: false)`. The step also needs the Jira MCP server to be reachable: in a cloud session with no device bridge to the machine that runs it, this step cannot run - say so explicitly in the summary and leave Jira Sync empty rather than silently skipping without mentioning it. If one of your scheduled tasks or cloud routines (see the framework docs 05), if configured, already covers thread-to-ticket sync for this project on a queue basis, check whether the calling task delegates Step 4 there before running it here too, to avoid duplicate ticket attempts.)*

**Goal:** Keep Slack, Notion, and the tracker consistent. Every actionable thread should have a corresponding ticket in `{config.task_tracker.project_key}` (`{config.jira.project_key}` is the same value).

#### 4.1 - Classify: does this thread need a Jira ticket?

Read the full thread content (already in memory from Step 3). Determine if it is actionable:

**Needs a ticket:**
- A bug, defect, or unexpected behavior reported
- An ops/support request (data fix, role change, document update, manual intervention)
- A feature request or enhancement
- A security concern
- A client-side change requiring our QA

**Does NOT need a ticket - skip Jira entirely:**
- Pure Q&A with no action item (question asked, answer given, resolved in thread)
- FYI/informational message or announcement
- Conversation with no clear output or task

If skipping → log: `jira: skip (informational)`

#### 4.2 - Search the tracker for an existing ticket

Use `search_issues` on the Jira MCP server from `{config.jira.mcp_read}` (default `jira`). Every query includes the project filter (JQL Isolation Validator in `projects/SKILL.md`):

```
project = {config.task_tracker.project_key} AND text ~ "{keywords}" ORDER BY updated DESC
```

`{keywords}` = 3-5 key nouns/terms from thread title and main message (entity names, error codes, feature names). Do NOT use the full title as a string.

Fetch up to 10 results. Read `summary` + first 300 chars of `description` for each.

**Semantic match:** Does any result describe the same issue or request?
- Match by substance, not exact wording
- When in doubt → treat as NOT matched (prefer creating over missing)

If matched → log: `jira: exists ({config.task_tracker.project_key}-XXXX)`. Do NOT create a duplicate.

#### 4.3 - Determine label

Pick ONE label from the config's Labels Taxonomy table, matching the thread's nature (operational request, defect, enhancement, security concern, and so on) to the label whose Purpose column describes it. Never assign a label the table marks `HISTORICAL` (read it as history only), and never assume a label exists on every project - confirm against the config. Components listed as client-owned in the config's Scope of Responsibility (and Sentry `projects_out_of_scope`) are context only: never promise our fix, never create tickets or risks for them; route the draft as "passed to the client team".

#### 4.4 - Create the ticket

**Template** (`slack-collector.ticket`): resolve it first per "Document templates" in `projects/SKILL.md` (registry `../projects/_templates.md`). The format below is the built-in default; a house or project template replaces its sections, order and fixed wording, never the invariants listed there.

Use `create_issue` on the Jira MCP server from `{config.jira.mcp_write}` (default `jira`); if `mcp_read` names a second server with different tool names, map the operations by meaning; `known_bug` in the config records any quirk (e.g. a cosmetic JSON error on Jira Server 7.x writes):

```
projectKey: "{config.task_tracker.project_key}"
issueType: "Task" (default) | "Bug" (if clearly a defect)
summary: [concise English title, max 100 chars - synthesized, not copied from Slack]
labels: [{label from 4.3}]
```

Description in **Jira wiki markup** (NOT Markdown):

```
h3. Context
[2-3 sentences - what was reported, by whom, in which channel]

h3. Problem / Request
[clear description synthesized from thread - not copy-pasted]

h3. Links
* Slack thread: [slack link|{slack_link}]
* Notion: [Notion thread|{notion_page_url}]
```

**Rules:**
- Jira Server takes wiki markup in descriptions (h3., \*, [text|url]), not Markdown; Jira Cloud takes ADF - follow `{config.task_tracker.type}`
- Do NOT use em dashes or en dashes anywhere: use hyphen (-) or colon (:)
- Do NOT attempt to set Epic Link via MCP unless `known_bug` says it works - older Jira Server versions do not support it, skip silently
- After creating: verify the write by re-reading (`search_issues`, summary contains key terms)

Log: `jira: created {config.task_tracker.project_key}-XXXX`

#### 4.5 - Tracker result per message

Each message log entry now includes one of:
- `jira: created {config.task_tracker.project_key}-XXXX`
- `jira: exists {config.task_tracker.project_key}-XXXX`
- `jira: skip (informational)`
- `jira: draft (api_access: false)` - the ticket text from 4.4 is printed in the channel summary
- `jira: unavailable (no local MCP bridge this run)`

---

### Step 5 - Print channel summary

The summary opens with the Data Completeness header from `projects/SKILL.md` (one line, English when `{config.default_language}` is English):

```
Джерела: Slack OK · Notion OK · Jira SKIPPED (api_access: false)
✅ #{channel_name} ({START_DATE} - {END_DATE}):
- Notion Created: X | Updated: Y | Skipped: Z
- Flagged 🔴: W
- Jira Created: A | Matched: B | Skipped (info): C | Drafts: D | Unavailable: E
- Errors: F
```

Move to next channel. After all channels - print combined total (it opens with the same header line).