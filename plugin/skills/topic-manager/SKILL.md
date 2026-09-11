---
name: topic-manager
description: "Analyzes Notion Meetings, Threads and (when configured) Gmail for a project and period, and creates/updates Topics DB pages - covers both on-demand analysis and the weekly cross-source sync."
---

# Topic Manager

Analyzes Meetings, Threads and (when the project has Gmail configured) email for a given period, extracts coherent topics, and creates/updates structured topic pages in the Topics DB.

## CRITICAL: Execution Rules

**DO NOT ask for confirmation. DO NOT explain what you are about to do. DO NOT generate prompts for the user to copy.**

When this skill triggers, immediately start executing step by step using Notion MCP tools (and Gmail tools, when Step 1c applies).

The ONLY questions allowed:
- If no period is specified AND this is a live, interactive request (not a scheduled run) - ask for it. A scheduled/automatic invocation that already states a period (e.g. "past 7 days", "since last Monday") never needs to ask.
- If the project is not explicitly named - ask to clarify (never default silently; Default Project Rule in projects/SKILL.md). A scheduled run's prompt always names the project explicitly, so this only applies to live requests.

---

## Project Config

**Step 0 - always run first, before anything below:**

1. Determine the project from the user's request. If the project is NOT explicitly named, do not guess and do not default: ask the user which project (list the configs in `projects/`). See the Default Project Rule in projects/SKILL.md.
2. Read the project config `../projects/{project_slug}.md` relative to this skill's folder; if that fails, Glob `**/projects/{project_slug}.md` under the skills directory.
3. Take `notion.project_page_id`, `notion.workspace_page_id`, `notion.topics_db`, `notion.meetings_db`, `notion.threads_db`, and `project_name` from that config. The Notion DB IDs and relation values below are Acme examples for illustration only - always use the values from the config of the project actually being analyzed.
4. Take `email_routing` from the config, if present. This determines whether Step 1c (Gmail) runs at all, and which mailboxes/senders are in scope for this project - never a fixed, hardcoded list of Notion IDs or search terms baked into this skill's body. If a project has no `email_routing` section, skip Step 1c entirely (graceful degradation, not an error) and note it was skipped in the final Output.

---

## Notion DB IDs (Acme example - always confirm from the project config, see Step 0)

| DB | Collection ID |
|---|---|
| **Topics DB** | `collection://~~notion-topics-db` |
| **Meetings DB** | `collection://~~notion-meetings-db` |
| **Threads DB** | `collection://~~notion-threads-db` |

## Fixed Relations (JSON-encoded array strings)

| Relation | Value (copy as-is into properties) |
|---|---|
| **Projects (Acme)** | `"[\"https://www.notion.so/~~notion-project-page-id\"]"` |
| **Workspace** | `"[\"https://www.notion.so/~~notion-workspace-page-id\"]"` |

> Relations are PER PROJECT: take `project_page_id` and `workspace_page_id` from `../projects/{slug}.md` of the project the topics belong to. The Acme IDs above are examples, not constants - using them for another project's topics would mix the projects.

---

## Step 0b - Verify the Topics DB schema (ALWAYS, at the start of every run)

Before writing anything, fetch the Topics data source itself (`notion-fetch` on its collection URL) and read the actual property names and types it reports.

This skill's own property table below has previously listed the relation properties as plain `Meetings` and `Threads`, while the code samples further down use `💬 Meetings` and `📨 Threads` (with emoji prefixes). That mismatch is a likely, concrete cause of relation writes silently doing nothing: a write to a property name that doesn't exist can succeed as a no-op instead of erroring. Do not trust the property names in this document blindly. Confirm them against the live schema every run and use exactly what the schema reports. If a name here turns out to be wrong, use the real one - do not keep going with a name you have reason to doubt.

---

## Topics DB Properties

| Property | Type | Notes |
|---|---|---|
| Topic Name | title | English |
| Status | select | `Claude`, `Open`, `Under Discussion`, `Resolved` |
| Status 2 | status | `Not started`, `Planned`, `In progress`, `Under Review`, `Done`, `On Hold`, `Won't Do` |
| Priority | select | `High`, `Medium`, `Low` |
| Summary | text | **DO NOT USE THIS FIELD TO STORE INFORMATION.** See "Summary Property" section below. |
| Date | date range | earliest mention -> latest mention |
| 💬 Meetings | relation | array of meeting page URLs (confirm exact property name in Step 0b) |
| 📨 Threads | relation | array of thread page URLs (confirm exact property name in Step 0b) |
| Projects | relation | see Fixed Relations |
| Workspace | relation | see Fixed Relations |

### Summary Property

The `Summary` property must be left **empty**. It is not a place to store information. All information - context, chronology, decisions, open questions, current status - goes into the page body, structured per the Month Section Format below.

- **On create**: do not set the `Summary` property at all (omit it from the properties payload, or pass an empty string if the field turns out to be required).
- **On update**: if an existing topic's `Summary` property already contains content (a known legacy problem - some existing topics have a wall of bullet points glued together with raw `<br>` tags in this property), clear it to an empty string as part of the same update. Do not append to it, do not preserve it, do not move its content into the body verbatim without cleaning it up. Raw `<br>` tags are HTML and must never appear anywhere in Notion content or properties - use actual Markdown line breaks and `- ` bullets instead.

`Topic Name` and the body's `### Статус` section already cover what a one-line label needs. Duplicating information into `Summary` only creates a second, driftable copy of the truth that nothing keeps in sync.

---

## Workflow Overview

Determine the period first:
- **Live request with an explicit period** ("за березень", "останні два тижні") - use it, parsed into a list of months (or a single partial-month range for sub-month periods; the Month Section Format below still applies per calendar month touched).
- **Live request with no period** - ask for it (see Execution Rules above).
- **Scheduled weekly run** (invoked by the Monday routine, no live user to ask) - default period is the past 7 days, expressed as a partial-month range if it crosses a month boundary. Never ask in this mode.

Process each month from **newest to oldest**. For each month, execute Steps 1-5 (Step 1c only when `email_routing` is configured for the project).

### Ukrainian month names

Січень, Лютий, Березень, Квітень, Травень, Червень, Липень, Серпень, Вересень, Жовтень, Листопад, Грудень.

---

## Step 1 - Collect Meetings

Use `notion-search` to find meetings for the month, using the project's own name and Meetings DB ID from Step 0:

```
notion-search(
  query: "{project_name} {Month_EN} {Year}",
  data_source_url: "{config.notion.meetings_db}"
)
```

For each found page, call `notion-fetch` to get the full content (summary + transcript if available).

**⚠️ NEVER use `notion-query-meeting-notes`** for getting meeting page IDs. It returns child page IDs, not the parent meeting pages. Only use `notion-search` with `data_source_url` pointing to the Meetings collection.

---

## Step 2 - Collect Threads

The keyword list for this search must NOT be a fixed, static list. A fixed list guarantees blind spots: any active topic whose name never happens to match one of the hardcoded words is invisible to this step forever, silently, and no error tells you it happened. This has already happened in practice on Acme: "Transaction Engine" was never in the old fixed list, so its threads were never found even though the topic had two months of documented activity in Meetings.

Build the keyword list fresh, every run, from three sources:

1. **Existing Topics DB titles.** Before searching Threads, list the current Topics DB for this project (a broad `notion-search` against the Topics collection, or page through it) and take every existing `Topic Name` as a guaranteed search keyword. This is the most important source: it means every topic that already exists gets checked for new thread activity every run, by construction, not by luck.
2. **Concrete terms found in this month's Meetings** (from Step 1): feature names, component names, ticket-like references, anything that reads like the name of a piece of work.
3. **A short, deliberately non-exhaustive list of perennial categories** worth checking regardless of what shows up above - a per-project list. For a project with no such list yet in its config, derive one from the config's General/Deploy sections (product area names) rather than reusing another project's list; treat this as a supplement to (1) and (2), never a replacement.

Run `notion-search` for each keyword in the combined set:

```
notion-search(query: "{project_name} {keyword}", data_source_url: "{config.notion.threads_db}")
```

Search threads by keywords, NOT date filters - `created_date_range` in Notion Threads often does not match real dates and frequently returns empty results even when relevant threads exist.

**Deduplicate by page ID.** Fetch full content of unique pages with `notion-fetch`.

Filter threads to only include those relevant to the target month (by checking content dates, mentions, or context - not relying on Notion date properties).

---

## Step 1c - Collect Gmail (only when the project config has `email_routing`)

Skip this step entirely, without error, for a project whose config has no `email_routing` section (graceful degradation). Note the skip once in the final Output rather than repeating it per month.

Search Gmail for messages in the target period using the project's own mailboxes/senders from `email_routing` (never a hardcoded address list). Use `gmail_search_messages` with a date-bounded query for the period being processed.

**Two-level clustering** (do this instead of treating each email as its own topic candidate):

**Level 1: Subject similarity.** Group emails with the same or similar subject lines (RE:/FWD: chains, minor wording differences).

**Level 2: Context & content similarity.** Read 2-3 representative emails from each initial group with `gmail_read_message`, then re-cluster based on actual content/context, not just subject:
- Emails about the same business problem -> same cluster (e.g. "AWS costs alert" + "Infrastructure budget review" + "Redshift scaling" -> "Infrastructure & Cloud Costs")
- Emails involving the same stakeholders on related decisions -> same cluster
- Emails referencing the same project/feature even with completely different subjects -> same cluster
- Automated alerts from the same service about the same domain -> same cluster (e.g. multiple Snyk alerts about different vulnerabilities -> "Snyk Vulnerability Management")
- Emails that are steps in the same business process -> same cluster (e.g. "beneficiary doc request" + "KYC verification pending" + "onboarding status" -> "Client Onboarding Process")

For each cluster, note: number of emails, key senders, date range, contextual summary, and WHY these emails belong together. Feed each cluster into Step 3 as a candidate topic (or as new evidence for an existing one) exactly like a Meetings or Threads source - a cluster of 2+ related emails satisfies the "mentioned in 2+ sources" bar in Step 3 on its own, since it is itself multiple independent mentions.

---

## Step 3 - Identify Topics

Analyze the content of all collected meetings, threads, and (when Step 1c ran) email clusters. Extract coherent topics - areas of work or discussion that appear across multiple sources.

A **topic** is:
- A coherent area of work, feature, or recurring issue
- Mentioned in 2+ sources (meetings, threads, and/or a 2+-email Gmail cluster)
- Distinct enough to warrant its own tracking page

For each identified topic, prepare:
- `topic_name` (English, concise, descriptive)
- `priority` (High / Medium / Low - based on frequency and impact)
- `status_2` (see "Determining Status 2" below - derive from the latest concrete signal, do not guess loosely)
- `date_start` / `date_end` (earliest and latest mention dates)
- `meeting_urls` (list of related meeting page URLs)
- `thread_urls` (list of related thread page URLs)
- `month_section` (formatted content block - see Month Section Format below; a Gmail cluster's contribution goes under a `#### Gmail` subsection within the month section, per the format below)

Do not prepare a `summary` field for the property. See Summary Property section above - that information belongs in `month_section`, not in a separate property.

### Determining Status 2

Re-derive this from the newest information every run, on both create and update. Never leave a stale value from a previous run untouched just because nothing forced a fresh look at it.

- The most recent dated entry says work stopped, was paused, or is on hold for any reason (legal review, blocked by another incident, deprioritized) -> `On Hold`
- The most recent dated entry describes active work, decisions being made, code being written or reviewed -> `In progress`
- The most recent dated entry describes the work as finished, shipped, or closed -> `Done`
- The topic exists only as a raised idea or open question with no work started -> `Not started` (use this only when genuinely nothing has happened yet, not as a leftover default)
- Anything that doesn't cleanly fit -> `Under Review` or `Planned`, whichever is closer, and note the ambiguity in the body's `### Статус` section

---

## Step 4 - Check Existing Topics

For each identified topic, search the Topics DB:

```
notion-search(
  query: "{topic_name_keywords}",
  data_source_url: "{config.notion.topics_db}"
)
```

**Semantic comparison, NOT exact match.** Examples:
- "Invoice Integration" matches existing "ERP Invoice Integration & Dispersion Flow" -> UPDATE existing
- "KYB Self-Service" matches existing "KYB Onboarding" -> UPDATE existing
- "New the card processor Card Design" has no semantic match -> CREATE new

When in doubt, prefer updating an existing topic over creating a duplicate. Use the full current Topic Name list already gathered in Step 2 (source 1) as your primary reference for this comparison, not just a fresh one-off search, since a fresh search can miss a semantically related but differently-worded existing topic.

---

## Step 5 - Create or Update Topics

### 5A - Create New Topics

Use `notion-create-pages` with batch of up to 5 pages:

```
notion-create-pages(
  parent: { data_source_id: "{config.notion.topics_db, without the collection:// prefix}" },
  pages: [
    {
      properties: {
        "Topic Name": topic_name,
        "Status": "Claude",
        "Status 2": status_2,
        "Priority": priority,
        "date:Date:start": "2026-03-01",
        "date:Date:end": "2026-03-28",
        "date:Date:is_datetime": 0,
        "Projects": "[\"https://www.notion.so/{config.notion.project_page_id}\"]",
        "Workspace": "[\"https://www.notion.so/{config.notion.workspace_page_id}\"]",
        "💬 Meetings": "[\"https://www.notion.so/abc123...\", \"https://www.notion.so/def456...\"]",
        "📨 Threads": "[\"https://www.notion.so/ghi789...\"]"
      },
      content: month_section
    }
    // ... up to 5 per batch
  ]
)
```

There is no `Summary` key in this payload. That is intentional - see Summary Property above.

**⚠️ Relation format: JSON-encoded array string.** All relation properties (Projects, Workspace, 💬 Meetings, 📨 Threads) must be passed as a **string** containing a JSON array of URL strings - NOT as a native array. Example: `"[\"https://www.notion.so/abc123\"]"` (string), not `["https://www.notion.so/abc123"]` (array).

**⚠️ Date format: expanded properties.** Use `"date:Date:start"`, `"date:Date:end"`, `"date:Date:is_datetime"` - NOT `"Date": { start, end }`.

**After creating, verify.** `notion-fetch` the newly created page and confirm the `💬 Meetings` and `📨 Threads` properties actually contain the URLs sent. A successful page-creation response does not by itself prove the relations landed - the property-name mismatch described in Step 0b has silently dropped relations before while the page itself was created fine.

### 5B - Update Existing Topics (Prepend)

For topics that already exist:

1. `notion-fetch` the existing topic page to get current content
2. Find the first heading in existing content (e.g., `## Лютий 2026`)
3. Use `notion-update-page` with `find_and_replace`:
   - `old_str` = the first heading + next 2-3 lines (enough for unique match)
   - `new_str` = new month section + `\n\n---\n\n` + that same old_str

This prepends the new month above existing content.

4. **Clear legacy `Summary` content if present.** If the fetch in step 1 shows the `Summary` property is non-empty, include clearing it (set to `""`) in the same update. Do not leave it populated going forward.

5. **Recompute `Status 2`** per "Determining Status 2" above, using the newest month's content, and update it even if a value is already set - do not skip this just because the field isn't empty.

6. **Update relations, and verify - this is no longer best-effort:**
   - Fetch current meeting/thread relation URLs from page properties, using the exact property name confirmed in Step 0b
   - Merge with new URLs (no duplicates, no spaces in URLs)
   - Update via `notion-update-page` with `update_properties`:
     ```
     properties: {
       "💬 Meetings": "[\"url1\", \"url2\", \"url3_new\"]",
       "📨 Threads": "[\"url4\", \"url5_new\"]"
     }
     ```
   - Remember: value is a **JSON-encoded array string**, not a native array
   - **After the update, re-fetch the page and confirm the new URLs are actually present.** If they are not, retry once, correcting the property name or format based on Step 0b's schema check. If it still fails after one retry, do not silently move on - list it explicitly in the final output summary (see Output section) as needing manual attention, with the page URL and the URLs that failed to attach.

7. Update Date range if the new month extends it:
   - If new `date_start` is earlier than existing start -> update
   - If new `date_end` is later than existing end -> update

---

## Month Section Format

**STRICTLY in Ukrainian.** English technical terms are NOT translated. Markdown only, no HTML tags anywhere (no `<br>`, no `<div>`, nothing) - line breaks and lists are plain Markdown (blank lines between paragraphs, `- ` for bullets).

```markdown
## {Місяць_UA} {Рік}

### Хронологія
- {ДД.ММ}: {Що обговорили / що сталось}
- {ДД.ММ}: {Наступна подія}
- {ДД.ММ}: {Ще одна подія}

#### Gmail
- {ДД.ММ}, {відправник}: {суть листа, чому належить до цієї теми} (пропустити цей підрозділ повністю, якщо для теми цього місяця не було релевантних листів)

### Рішення
- {Рішення 1}
- {Рішення 2}

### Відкриті питання
- {Питання 1}
- {Питання 2}

### Статус
{1-2 речення про поточний стан теми на кінець місяця. Якщо Status 2 = On Hold, вкажи причину паузи тут же одним реченням.}
```

**Rules:**
- Headers ONLY: `Хронологія`, `Gmail` (optional, only when Step 1c contributed something this month), `Рішення`, `Відкриті питання`, `Статус`
- Dates in `ДД.ММ` format
- If no decisions were made - write "Рішень не зафіксовано"
- If no open questions - write "Відкритих питань немає"
- Never use em dashes. Use short dashes (-), commas, or restructure sentences.
- Never use raw HTML tags (`<br>` included). This has produced unreadable, unusable property values before - Markdown only, everywhere, in both content and properties.

---

## Relation URL Format

Convert page ID to relation URL:
- Page ID: `~~notion-page-id`
- Remove dashes: `~~notion-page-id`
- URL: `https://www.notion.so/~~notion-page-id`

When updating relations, always include ALL existing URLs + new URLs. Remove any spaces from URLs.

**⚠️ CRITICAL: Relations are JSON-encoded array strings.**

When passing relation values to `notion-create-pages` or `notion-update-page`, the value must be a **string** that contains a JSON array:

```
// CORRECT - JSON-encoded array string:
"💬 Meetings": "[\"https://www.notion.so/abc123\", \"https://www.notion.so/def456\"]"

// WRONG - native array (will fail or be ignored):
"💬 Meetings": ["https://www.notion.so/abc123", "https://www.notion.so/def456"]
```

To build the value in practice:
1. Collect all URLs into a list
2. `JSON.stringify(urls_list)` to get the string
3. Pass that string as the property value

---

## Critical Pitfalls

1. **NEVER use `notion-query-meeting-notes` for relation IDs** - returns child page IDs, not parent meeting pages. Only `notion-search` with `data_source_url` of Meetings collection.

2. **Build the threads keyword list fresh every run from existing Topic Names plus this run's meeting content (Step 2), not from a fixed list, and not by date.** A hardcoded list will silently miss any topic whose name isn't on it, forever. `created_date_range` often returns empty results because Notion dates don't match real dates.

3. **Never hardcode Gmail search terms or a fixed sender list for Step 1c.** Read scope from the project's `email_routing` config, the same way Steps 1-2 read Notion DB IDs from config instead of baking in Acme's. A project without `email_routing` skips Step 1c entirely rather than falling back to guessed addresses.

4. **Relation updates are verified, not best-effort.** Confirm the property name against the live schema (Step 0b), confirm the write landed by re-fetching (Steps 5A/5B), and if it still fails after one retry, report it explicitly in the output instead of treating the failure as acceptable.

5. **Never populate the `Summary` property.** All information belongs in the body. A non-empty `Summary` found on an existing page is a cleanup item, not something to preserve or extend.

6. **Prepend requires exact match** - always `notion-fetch` first, find the real first heading, use it as anchor for `find_and_replace`.

7. **Old months may have few search results** - don't over-retry. Process what you find.

8. **Batch creation** - `notion-create-pages` accepts multiple pages (up to 5+). Use batch instead of one-by-one creation.

9. **Deduplication** - before creating a new topic, verify no semantically similar topic exists, using the full current Topic Name list from Step 2, not just a fresh one-off search. "Invoice Integration" should update existing "ERP Invoice Integration & Dispersion Flow", not create a duplicate.

10. **Multi-month ranges** - process from newest to oldest. Each month is a separate section in the topic page.

11. **No raw HTML, ever** - not in content, not in properties. Markdown only.

12. **Never default the project**, except when a scheduled/automatic invocation already states it. This skill has no project-specific facts baked in; every ID and name in the examples above is illustrative (Acme) and must be re-read from the actual project's config every run.

---

## Output

After processing all months, print a summary:

```
✅ Topic analysis complete for {PROJECT_NAME} ({period}):

Sources: Meetings + Threads{ + Gmail, if Step 1c ran / (Gmail skipped: no email_routing in config), if it did not}

Created ({N}):
- [Topic Name 1]
- [Topic Name 2]

Updated ({M}):
- [Topic Name 3] (added {Month} section)
- [Topic Name 4] (added {Month} section)

⚠️ Needs manual attention ({K}):
- [Topic Name X]: relation update to 💬 Meetings failed after retry, URLs not added: [url1, url2]
- [Topic Name Y]: Summary property had legacy content, cleared

Total: {N} created, {M} updated, {K} flagged for manual attention
```

Always include the "Needs manual attention" section, even when empty (write "none"). A run that silently drops a relation without saying so is the exact failure mode this revision exists to close.