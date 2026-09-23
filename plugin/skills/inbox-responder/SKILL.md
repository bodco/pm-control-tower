---
name: inbox-responder
description: "Reads unprocessed threads from the Notion Threads DB, classifies each thread, fetches relevant context (Sentry, AWS logs, Jira, Topics), generates a draft response in the thread's language, and writes it back to Threads DB + appends to the Inbox Review page. Use when the user says \"обробити інбокс\", \"inbox-responder\", \"draft replies\", \"згенеруй драфти\", \"analyze inbox\", \"що прийшло і що відповісти\", or runs as a scheduled Cowork task. When triggered, execute immediately."
---

# inbox-responder

Reads new threads, classifies them, fetches context, drafts replies, and logs everything.

## Step 0 - Scope and config

Documented exception to the Default Project Rule (`projects/SKILL.md`): if the user
named a project, process only its threads; otherwise process all unprocessed threads,
resolving each thread's project from its `Project` relation. A thread with no `Project`
relation is listed in the summary as "unrouted" and not drafted. For every involved
project read `../projects/{slug}.md` relative to this skill's folder (fallback: Glob
`**/projects/{slug}.md`) and `projects/SKILL.md` for the cross-cutting rules. Rule Zero:
the config wins. Take `{config.sentry.*}`, Notion IDs, relation property names, the
Scope of Responsibility, `{config.client_language}` and local paths from the config of
the thread's project - never apply one project's credentials or context to another
project's thread.

Writes allowed without asking (the 5-minute rule): updating the thread's `Category`,
`Context Sources`, `Draft Response` and `Status`, appending to the Inbox Review page.
Nothing is ever sent.

**Secrets.** Tokens are not stored in configs. The config gives the variable name and
the file; read the value at runtime and never print it anywhere:

```bash
grep '^{config.sentry.token_env}=' {config.sentry.secrets_file} | cut -d= -f2-
```

**Graceful degradation.** Before fetching context, check what this project actually
has and skip what is absent instead of failing:

- `{config.sentry.url}` = `none` -> no Sentry lookup
- `{config.task_tracker.api_access}` = `false` -> no live tracker search; use
  `{config.task_tracker.fallback_source}` (newest file in `export_path`, meeting
  action items, or other threads) and state in the draft where the status came from
  and how fresh it is
- `{config.local_paths.aws_logs}` = `none` -> no log lookup

List everything skipped in the Step 7 summary so the gap is visible.

## Step 1 - Fetch unprocessed threads

Query Threads DB for threads that need processing:
- Status = "AI Review" AND Draft Response is empty (fresh threads - the collectors create pages with Status "AI Review")
- OR Status = "Awaiting Reply" AND Draft Response is empty (manually triaged)
- OR Status = "Need Follow-up" AND Draft Response is empty
- Sorted by Reported at DESC
- Limit: 20 threads max per run

Pipeline: collectors create (Status "AI Review") -> this skill classifies + drafts (Status
stays "AI Review") -> the PM sends and manually sets "Replied".

Use Notion MCP: fetch the Threads data source (`notion-fetch` on
`{config.notion.threads_db}`) and filter, or `notion-query-data-sources` when the plan
allows it:
```
Status in ("AI Review", "Awaiting Reply", "Need Follow-up") AND Draft Response is empty
```
Use the property names the fetched schema reports; if they differ from this skill, use
the real ones and report the discrepancy.

## Step 2 - Classify each thread

For each thread, determine Category based on content signals:

| Category | Signals in thread content |
|---|---|
| **Error/Bug** | "error", "failed", "exception", "crash", "500", "not working", "broken", stack trace, Sentry issue number |
| **Data Question** | "balance", "transaction", "beneficiary", "report", "data", "баланс", "транзакція", "чому показує" |
| **Scope Change** | "can we add", "what if we", "change", "new feature", "would it be possible", "а якщо", "додати" |
| **Blocker** | "blocked", "urgent", "cannot proceed", "waiting on", "терміново", "заблоковано", "не можемо" |
| **Status Update** | "how is", "when will", "update on", "what's the status", "коли буде", "як справи з" |
| **FYI** | "FYI", "just letting you know", "for your information", no question, no request, purely informational |

Set `Category` and determine which context sources to consult.

## Step 3 - Fetch context by category

### Error/Bug threads
1. **Sentry** (skip if `{config.sentry.url}` is `none`):
   ```
   GET {config.sentry.url}/api/0/organizations/{config.sentry.org_slug}/issues/
   Authorization: Bearer <token read from the secrets file>
   ?query=<error keywords from thread>
   ```
   Scope note: search only `{config.sentry.projects_in_scope}`. Components listed as
   client-owned in the config's Scope of Responsibility (and Sentry
   `projects_out_of_scope`) are context only: never promise our fix, never create
   tickets or risks for them; route the draft as "passed to the client team".
2. **AWS Logs**: `{config.local_paths.aws_logs}` on the Mac - in a cloud session stage the matching date's files via the device bridge (device_list_dir + device_stage_files)
3. Set Context Sources = ["Sentry", "AWS Logs"] (only those actually consulted)

### Data Question threads
1. **Tracker**: if `{config.task_tracker.api_access}` is true, search related tickets
   (`search_issues` on the Jira MCP server from `{config.jira.mcp_read}`, default
   `jira`), always scoped with `project = {config.task_tracker.project_key}`. If false,
   use the config's `fallback_source`.
2. If the project has a data adapter skill (`<slug>-db-assistant` or similar) or a KB
   under `{config.local_paths.kb_root}`, use it for table/column context; otherwise skip
3. Set Context Sources = ["Jira Board", "Knowledge Base"]

### Scope Change threads
1. **Topics DB**: Search Notion topics for any prior discussion on this topic
   ```
   notion-search in {config.notion.topics_db}
   ```
2. **Decisions DB** (`{config.notion.decisions_db}`): check whether this was already
   decided. An `Active` decision beats a fresh guess; a `Superseded` one is history
3. **Knowledge Base**: Look for prior decisions or scope boundaries
4. Set Context Sources = ["Topics DB", "Knowledge Base"]

### Blocker threads
1. **Tracker**: Find related ticket, check its current status and assignee (same
   `api_access` rule as above)
2. Set Context Sources = ["Jira Board"]

### Status Update threads
1. **Tracker**: Find related ticket(s) (same `api_access` rule as above)
2. Set Context Sources = ["Jira Board"]

### FYI threads
- No context needed
- Set Context Sources = ["LLM Only"]
- Skip draft generation (see Step 4)

## Step 4 - Generate draft response

### For FYI threads
- No draft needed
- Set Draft Response = "(FYI - no reply needed)"
- Set Status = "AI Review" (processed)
- Move to Step 5

### For all other threads

Compose the draft with this structure:
1. Detect the language of the original message
2. Generate the response in the SAME language (for client threads that is normally
   `{config.client_language}`)
3. Use the context collected in Step 3
4. Keep tone appropriate to sender (client = formal/warm, team = direct)

**Draft structure:**
```
[Greeting if applicable]

[Direct answer to the question/blocker/request - 2-4 sentences]

[Supporting detail from context: ticket link / Sentry issue / relevant data]

[Next step or expected timeline if applicable]

[Sign-off]
```

**Key rules for draft content:**
- Never invent data - if context was not found, write "need to check [source]" in the draft
- If a ticket status came from a manual export or a meeting note rather than a live
  tracker, say so and give the date. Never present stale data as current
- For Scope Change: always acknowledge the request positively, but do not commit - write "let me check and get back to you" if uncertain
- For Error/Bug: include Sentry issue ID or CloudWatch log timestamp if found
- For Blocker: include current ticket status and responsible person
- Never use em dashes anywhere in the draft
- Max length: 150 words per draft

## Step 5 - Write back to Threads DB

For each thread, update the Notion page with:
```
Category: <classified category>
Context Sources: [<list of sources actually consulted>]
Draft Response: <generated draft>
Status: "AI Review"
```

Use Notion MCP: notion-update-page for each thread URL.

**Important:** Do NOT change the Status if it was already "Replied", "Closed", or "Spectator Mode" - those are final states and should not be overwritten.

## Step 6 - Append to Inbox Review page

Append a daily section to page `{config.notion.inbox_review_page}`. If the key is `none`
or missing, skip this step and say `Inbox Review SKIPPED (inbox_review_page: none)` in
the summary; the drafts still live in each thread's `Draft Response`.

```markdown
---

## <Today's date> - <N> threads processed

### [Category emoji] Thread name
**Type:** Slack / Email | **From:** <sender if known> | **Link:** <slack/email link>
**Category:** <category> | **Context:** <sources used>

**Original message summary:**
> <1-2 sentence summary of the incoming message>

**Draft response:**
<full draft>

**Action:** [ ] Approve and send | [ ] Edit and send | [ ] FYI only

---
```

Category emojis:
- Error/Bug: 🔴
- Data Question: 🔵
- Scope Change: 🟣
- Blocker: 🟠
- Status Update: 🟡
- FYI: ⚪

Append, do not overwrite - the page accumulates history over time.

**Block size**: Notion has a 2000-character block limit. Split long content into multiple blocks.

## Step 7 - Summary output

After processing all threads, output a brief summary to the Cowork chat:

```
Джерела: Threads OK · Sentry {OK | SKIPPED (url: none)} · AWS Logs {OK | SKIPPED} · Jira {OK | SKIPPED (api_access: false)} · Topics OK · Inbox Review {OK | SKIPPED}
inbox-responder complete.
Processed: N threads (unrouted, no Project relation: M)
- N Error/Bug
- N Data Question
- N Scope Change
- N Blocker
- N Status Update
- N FYI
Context sources used: Sentry (N), AWS Logs (N), Jira (N), Topics DB (N)
Sources skipped (not configured for this project): <list, or "none">
Inbox Review updated: <link to the Inbox Review page>
```

## Error handling

- If Sentry API returns error: skip, set Context Sources = ["LLM Only"], note in draft "Sentry unavailable during analysis"
- If no AWS log files found for date: skip AWS logs, note in draft
- If the tracker search returns 0 results: note "No matching ticket found" in draft
- If a source is not configured for this project: skip it quietly in the draft, but list it under "Sources skipped" in the Step 7 summary
- If a thread has no Description and no content accessible: set Category = "FYI", Draft Response = "(Empty thread - no content to analyze)"
- Never fail silently - always write something to Draft Response so the PM knows the thread was processed

## Notes

- This skill runs best AFTER `slack-collector` and `mac-mail-collector` have completed
- The "AI Review" status in Threads DB marks items created or updated by automations that a human should confirm
- Threads already in "Replied", "Closed", or "Spectator Mode" are never touched
- After you send a draft: manually change Status from "AI Review" to "Replied" in Threads DB
- Scheduled trigger phrase for Cowork: `inbox-responder`