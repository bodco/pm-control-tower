---
name: thread-ticket-sync
description: 'Executes a two-phase workflow in Cowork to find Slack threads that are missing as tickets in the client Notion, then transform selected threads into developer tasks and create them in the client Notion DB. Use this skill when the user wants to compare Slack threads against client Notion tickets, find gaps, or convert Slack threads into tasks. Reads the client board location from the client_tracker block of the project config. Triggers on ANY of these patterns: "аналіз тікетів", "які треди не мають тікетів", "знайди відсутні тікети", "перетвори треди в задачі", "sync threads to tickets", "які треди не покриті", "thread ticket sync", "gap analysis", "треди без тікетів", or any message that combines a registered project name with a date range and implies thread-to-ticket gap analysis. Never defaults to a project.'
---

# Thread → Ticket Sync

This skill runs exclusively in **Claude Cowork**, which has Chrome and Notion MCP available natively in the same session.

## ⚠️ CRITICAL: Chrome connector

Client-workspace pages are reachable ONLY through the user's logged-in Chrome (the connected Notion API cannot see the client's workspace). Use the Chrome automation available in the session: the claude-in-chrome tools, or the remote-devices Chrome bridge when running in the cloud. The Chrome profile must be the one logged into the client's Notion - historically a dedicated work profile. If pages fail to load or show a login screen, stop and ask the user to open Chrome under the right profile.

Two-phase workflow with one human checkpoint in between:

- **Phase 1 - Gap Analysis**: Cowork reads your Threads DB (Notion MCP) + scans client's Notion (Chrome) → outputs a numbered list of threads with no matching ticket. You review the list and pick which ones to turn into tasks.
- **Phase 2 - Ticket Creation**: Cowork re-fetches selected threads (Notion MCP) → builds structured developer tasks → creates them in the client's Notion DB (Chrome).

**Access model:**
| Data source | Tool |
|---|---|
| Your Threads DB (personal Notion) | Cowork → Notion MCP |
| Client's Product Roadmap + Tasks DB | Cowork → Chrome |

---

## Invocation

The user provides:
- **Project name** - a registered project (Step 0 below); if it is not named, ask
- **Date range** - filters Threads DB by `Reported at` field (e.g., "за березень", "Mar 1-15", "last two weeks")
- **Action** - one of:
  - Phase 1 (gap analysis) - default if no thread numbers given
  - Phase 2 individual - create one ticket per thread
  - Phase 2 consolidated (new) - merge selected threads into one ticket
  - Phase 2 update consolidated (new) - append new threads to an existing consolidated ticket

Parse the date range into `START_DATE` and `END_DATE` (`YYYY-MM-DD`).

Example calls:
> *"аналіз тікетів {Project} за березень"*
> *"створи тікети для {Project}: 2, 4, 7"* - individual tickets
> *"консолідуй {Project}: 1, 3, 5"* - one merged ticket from threads 1, 3, 5
> *"оновити консолідований тікет {Project}: 2, 6"* - append threads 2, 6 to existing consolidated ticket

If the user doesn't specify an action but provides thread numbers → ask: individual or consolidated?
If Phase 1 is requested without a date range → ask for it first.

---

## Step 0 - Project config (always first)

1. Determine the project from the request. If it is not explicitly named, ask which
   project, listing the configs in `projects/` (Default Project Rule in
   `projects/SKILL.md`). Never guess.
2. Read `../projects/{project_slug}.md` (fallback: Glob `**/projects/{project_slug}.md`)
   and `projects/SKILL.md` for the cross-cutting rules.
3. Take from the config:

| Placeholder used below | Config key |
|---|---|
| `{PROJECT_NAME}` | `{config.project_name}` |
| `{PROJECT_PAGE_ID}` | `{config.notion.project_page_id}` (the Threads DB is filtered by the `Project` relation, not by name) |
| `{THREADS_DB}` | `{config.notion.threads_db}` |
| `{CLIENT_ROADMAP_URL}` | `{config.client_tracker.roadmap_url}` |
| `{CLIENT_TASKS_URL}` | `{config.client_tracker.db_id}` (the client's tasks database, as a URL) |
| `{TARGET_COLUMN}` | `{config.client_tracker.target_status}` |

4. If `{config.client_tracker.type}` is `none`, this project has no client board: say so
   and stop (Phase 1 can still list threads without tickets in OUR tracker if the user
   asks, but that is `jira-management`'s job). If `client_tracker.sync_method` is not
   `browser` (or `browser_access` is false), Phase 2 produces the ticket texts as drafts
   the PM pastes by hand instead of writing through Chrome.
5. Writes allowed without asking (the 5-minute rule in `projects/SKILL.md`): Phase 1
   never writes; Phase 2 creates or appends tickets on the client's board ONLY for the
   thread numbers the PM selected explicitly in this session. Nothing else.
6. Every summary opens with the Data Completeness header, e.g.
   `Джерела: Threads OK · Client board (Chrome) OK` or `Client board SKIPPED (client_tracker: none)`.

---

## PHASE 1 - Gap Analysis

Execute the following steps directly in Cowork.

### Step 1 - Read Slack threads from your Notion (Cowork → Notion MCP)

Зроби query до database "Threads" (`{THREADS_DB}`; fetch the data source and filter, or `notion-query-data-sources` when the plan allows):
- Filter: relation `Project` містить сторінку `{PROJECT_PAGE_ID}` AND Type містить "Slack" AND Reported at >= {START_DATE} AND Reported at <= {END_DATE}
- Sort: Reported at ASC
- Fields to retrieve: Thread Name, Slack Link, Reported at, Last Reply Date, page content (повний текст треду)

Для кожного запису прочитай також вміст сторінки (основне повідомлення + коментарі).

Збери в пам'яті список:

threads = [
  {
    "id": 1,  // порядковий номер (за порядком Reported at ASC)
    "title": "[Thread Name]",
    "slack_link": "[Slack Link]",
    "reported_at": "[Reported at ISO]",
    "last_reply_date": "[Last Reply Date ISO]",
    "summary": "[2-3 речення про суть проблеми/запиту на основі повного тексту треду]"
  }
]

---

### Step 2 - Read existing tickets from client's Notion (Cowork → Chrome)

Відкрий {CLIENT_ROADMAP_URL}

На цій сторінці є кілька БД (різні розділи Roadmap). Для кожної БД на сторінці:
1. Відкрий всі записи (якщо є пагінація - підвантаж всі)
2. Для кожного тікету збери: назву + опис/body (перші 300 символів)

Збери в пам'яті:

client_tickets = [
  {
    "title": "[назва тікету]",
    "description": "[перші 300 символів опису або body, якщо є]"
  }
]

---

### Step 3 - Semantic comparison (in memory)

Для кожного thread зі списку threads визнач, чи існує відповідний тікет у client_tickets.

ПРАВИЛА ПОРІВНЯННЯ:
- НЕ порівнюй лише по точному збігу назви - тікет може мати іншу назву ніж тред
- Порівнюй по СУТІ: враховуй summary треду і description тікету
- Вважай "покритим" якщо тікет явно описує ту саму задачу/проблему що й тред
- Якщо є сумнів - вважай "не покритим" і включай до списку

РЕЗУЛЬТАТ - виведи нумерований список непокритих тредів:

---
ТРЕДИ БЕЗ ТІКЕТІВ У КЛІЄНТСЬКОМУ NOTION ({PROJECT_NAME}, {START_DATE} - {END_DATE}):

[N] {title}
    📎 {slack_link}
    📅 Reported: {reported_at} | Last reply: {last_reply_date}
    💬 {summary}
---

Після списку виведи:
"Знайдено [X] тредів без відповідного тікету з [Total] проаналізованих.
Які номери перетворити на задачі?"

---

## PHASE 2 - Ticket Creation

Triggered when the user provides selected thread numbers. Three modes:

### Mode A - Individual tickets (default)

"створи тікети: 2, 4, 7"

One ticket per thread. Follow Step 1 → Step 2 below.

---

### Mode B - Consolidated ticket

"консолідуй: 1, 3, 5" or "об'єднай в один тікет: 1, 3, 5"

### Step 1 - Re-fetch selected threads (Notion MCP)

Same query as Phase 1 (same filters + Reported at ASC). Select only threads with the given IDs.
Read full page content of each thread for analysis.

For each thread - synthesize a short item (2-3 sentences max):
```
item = {
  "slack_link": "[Slack Link]",
  "summary": "[коротко суть - що потрібно зробити]"
}
```

Then build ONE consolidated task:
```
consolidated_task = {
  "title": "[спільна назва що охоплює всі треди - англійською, напр. 'Misc client data updates']",
  "last_reply_date": "[найпізніша Last Reply Date серед усіх тредів]",
  "body": "[
    ## Summary
    [1-2 речення що об'єднує суть всіх тредів]

    ## Items
    • 🔗 [slack_link_1] - [summary_1]
    • 🔗 [slack_link_2] - [summary_2]
    • 🔗 [slack_link_3] - [summary_3]

    ## Notes
    [спільні нотатки якщо є]
  ]"
}
```

### Step 2 - Create one ticket in client's Notion (Chrome)

Use Chrome automation to navigate to `{CLIENT_TASKS_URL}`.

**If Chrome seems unavailable - try navigation once. Only stop if it clearly fails.**

Знайди колонку "{TARGET_COLUMN}". Створи один запис:
1. Натисни "+ New" в колонці "{TARGET_COLUMN}"
2. Встанови назву: consolidated_task.title
3. Відкрий запис
4. Встанови "Due Date Override": consolidated_task.last_reply_date
5. **Встав consolidated_task.body в тіло сторінки (page body). НЕ в коментарі.**
6. НІЧОГО БІЛЬШЕ НЕ ЧІПАЙ

Виведи: "✅ Created consolidated: [title] (covers [N] threads)"

---

### Mode C - Update existing consolidated ticket

"оновити консолідований: 2, 6" or "додай до консолідованого: 2, 6"

Used when a new sync brings additional minor threads that belong in the same consolidated ticket created earlier.

### Step 1 - Re-fetch new threads (Notion MCP)

Same query. Select only the new thread IDs provided. Read and synthesize each into a short item (same format as Mode B).

### Step 2 - Find and update the existing ticket (Chrome)

Use Chrome automation to navigate to `{CLIENT_TASKS_URL}`.

Ask the user: "Яка назва існуючого консолідованого тікету?" - then find it in the board.

Once found:
1. Відкрий запис
2. Знайди секцію `## Items` в тілі сторінки
3. Додай нові items в кінець списку:
   `• 🔗 [slack_link] - [summary]`
4. Оновлюй "Due Date Override" якщо нова `last_reply_date` пізніша за існуючу
5. НІЧОГО БІЛЬШЕ НЕ ЧІПАЙ

Виведи: "✅ Updated: [title] - added [N] new items"

---

### Step 1 - Re-fetch selected threads for individual tickets (Notion MCP)

*(Used for Mode A only)*

Використай Notion MCP. Зроби query до database "Threads" (`{THREADS_DB}`):
- Filter: relation `Project` містить сторінку `{PROJECT_PAGE_ID}` AND Type містить "Slack" AND Reported at >= {START_DATE} AND Reported at <= {END_DATE}
- Sort: Reported at ASC
- Fields: Thread Name, Slack Link, Reported at, Last Reply Date, page content

Відбери лише записи з порядковими номерами: {SELECTED_IDS}

Для кожного відібраного треду:
1. Прочитай повний вміст сторінки (основне повідомлення + всі коментарі) - це джерело для аналізу, **не для копіювання в тікет**
2. На основі прочитаного синтезуй задачу для розробника - стисло, чітко, своїми словами:

```
task = {
  "title": "[коротка, чітка назва задачі для розробника - англійською]",
  "last_reply_date": "[Last Reply Date ISO]",
  "slack_link": "[Slack Link]",
  "body": "[
    🔗 Slack thread: [slack_link]

    ## Context
    [2-3 речення - звідки прийшла задача, що reported клієнт/команда]

    ## Problem / Request
    [чіткий опис проблеми або фічі - своїми словами, не копіпаст з треду]

    ## Expected Behavior
    [що має бути після виправлення/реалізації - якщо зрозуміло з треду]

    ## Notes
    [додаткові деталі якщо є - кроки відтворення, пріоритет тощо]
  ]"
}
```

**ВАЖЛИВО:** body - це синтезована задача, НЕ дамп тексту треду. В тікеті - лише slack_link і структурований опис.

### Step 2 - Create individual tickets in client's Notion (Chrome)

Use Chrome automation to navigate to `{CLIENT_TASKS_URL}`.

**If Chrome seems unavailable - try navigation once. Only stop if it clearly fails.**

Це Kanban/Board view. Знайди колонку "{TARGET_COLUMN}".

Для кожного task:
1. Натисни "+ New" в колонці "{TARGET_COLUMN}"
2. Встанови назву: task.title
3. Відкрий запис
4. Встанови "Due Date Override": task.last_reply_date
5. **Встав task.body в тіло сторінки (page body). НЕ в коментарі.**
6. НІЧОГО БІЛЬШЕ НЕ ЧІПАЙ - ні інші properties, ні relations, ні статус

Після кожного: "✅ Created: [task.title]"

---

## Підсумок після Phase 2

"Ticket creation complete for {PROJECT_NAME}:
- Created: [X] tickets in column '{TARGET_COLUMN}'
- [список назв створених тікетів]"

---

## Placeholder reference

| Placeholder | Source |
|---|---|
| `{PROJECT_NAME}`, `{PROJECT_PAGE_ID}`, `{THREADS_DB}` | Project config (Step 0) |
| `{START_DATE}` / `{END_DATE}` | Parsed from user input (`YYYY-MM-DD`) |
| `{CLIENT_ROADMAP_URL}` | `{config.client_tracker.roadmap_url}` |
| `{CLIENT_TASKS_URL}` | `{config.client_tracker.db_id}` |
| `{TARGET_COLUMN}` | `{config.client_tracker.target_status}` |
| `{SELECTED_IDS}` | Provided by user after Phase 1 output |
