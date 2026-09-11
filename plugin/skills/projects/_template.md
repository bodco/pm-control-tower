# Project: {PROJECT_NAME}

## General
- **project_name**: {name}
- **project_slug**: {slug}
- **status**: active   (set to `archived` when the project ends - skills stop offering it)
- **description**: {one-line description}
- **board_type**: Kanban | Scrum
- **default_language**: Ukrainian | English
- **client_language**: English

## Access Matrix - READ THIS FIRST (as of {YYYY-MM-DD})

| Resource | Access | Since / Until | Notes |
|---|---|---|---|
| {repo or system} | ✅ / ❌ | {date the state began} | {frozen snapshot? client-owned? full control?} |

(Every resource the project's skills touch: repos, DBs, monitoring, comms tools.
When access changes, update the row the same day and add a Changelog line.)

## Task Tracker (наш, для делівері)

```yaml
task_tracker:
  type: jira_server        # jira_cloud | linear | trello | asana | monday | client_notion | manual
  api_access: true         # чи є MCP/REST доступ. У клієнтів з SSO/Okta/MDM часто false
  project_key: {KEY}
  fallback_source: none    # manual_export | meeting_action_items | email_summaries
  export_path: none        # для manual_export: ~/work/{slug}/exports/
  browser_access: false    # чи можна читати трекер через Chrome під сесією PM
```

Якщо `api_access: false`, скіли НЕ падають: вони беруть дані з `fallback_source`
і явно пишуть у звіті дату й свіжість джерела.

## Client Tracker (клієнтський; заповнювати, якщо клієнт веде свій трекер)

```yaml
client_tracker:
  type: none               # client_notion | jira_cloud | linear | trello | none
  api_access: false
  db_id: {id or none}
  sync_method: none        # csv_import | browser | manual | none
  browser_access: false
  sync_cadence: "{коли синхронізуємо}"
  owner: PM
```

## Jira
- **server_url**: https://jira.example.com
- **server_version**: {version}
- **project_key**: {KEY}
- **mcp_write**: {mcp connector name for writes}
- **mcp_read**: {mcp connector name for reads}
- **known_bug**: {any known MCP issues, or "none"}

### Labels Taxonomy
| Label | Purpose |
|-------|---------|
| `feature` | {description} |
| `bug-fix` | {description} |
| ... | ... |

### fixVersion Convention
{describe how versions are named and when they're assigned}

### Key Epics
| Epic Key | Name | Purpose |
|---|---|---|
| {KEY-1} | {name} | {purpose} |

### Assignment Rules
| Domain | Assign to |
|---|---|
| {domain} | {username or "no internal resource"} |

### Workflow & Transition IDs
| Status | Transition ID |
|--------|--------------|
| To Do | {id} |
| In Progress | {id} |
| Done | {id} |
| ... | ... |

## Slack
- **workspace**: {workspace name}
- **channels_dev**: {#channel}
- **channels_stability**: {#channel or "none"}
- **channels_all**: {comma-separated list of all channels to scan}

## Sentry
- **url**: {sentry URL or "none"}
- **token_env**: `{PROJECT}_SENTRY_TOKEN`   (значення у файлі секретів, НЕ тут)
- **secrets_file**: `~~home-folder/work/Secrets/secrets.env`
- **org_slug**: {org}
- **projects**: {comma-separated project slugs}

(If no Sentry - set url to "none" and skills will skip Sentry checks)

## Notion
- **project_page_id**: {UUID of project page in Projects DB}
- **workspace_page_id**: {UUID of workspace page in Workspaces DB}
- **current_state_page**: {UUID of the Current State page under the project page}
- **reports_db**: collection://~~notion-reports-db
- **threads_db**: collection://~~notion-threads-db
- **meetings_db**: collection://~~notion-meetings-db
- **topics_db**: collection://~~notion-topics-db
- **knowledge_base_db**: collection://~~notion-knowledge-base-db
- **risks_db**: collection://~~notion-risks-db
- **decisions_db**: collection://~~notion-decisions-db
- **tasks_tracker_db**: collection://~~notion-tasks-tracker-db

(Усі бази спільні для всіх проєктів; проєктні лише project_page_id, workspace_page_id і
current_state_page. Проєкти розділяє relation, тому тегування і є те, що не дає їх змішати.)

### Notion relation property names (уніфіковано 2026-09-08)
Усі бази використовують однакові назви: `Project` і `Workspace` (однина, без емодзі).
Крос-relation теж без емодзі: `Meetings`, `Threads`, `Topics`, `Knowledge Base`.
Значення завжди JSON-масив URL сторінок: ["https://app.notion.com/p/<id-without-dashes>"].
Якщо жива схема колись розійдеться з цим рядком, перемагає жива схема: перевірити fetch
data source і виправити шаблон того ж дня.

## Local Paths
- **aws_logs**: {path to CloudWatch logs or "none"}
- **time_reports**: {path to Tempo exports or "none"}
- **repos_root**: {path to the local git clones or "none"}
- **kb_root**: {path to the project knowledge base or "none"}
- **reports_root**: {where skills drop local report files, or "none" - then they land next to repos_root}

(If a path is "none", skills that use it will skip that data source)

## Team - Internal
| Name | Role | Jira Username | Report Title | Focus Areas |
|------|------|---------------|--------------|-------------|
| {PM name} | PM | {username} | Project Manager | - |
| ... | ... | ... | ... | ... |

### Transcript Alias Map
| Transcript says | Actually is |
|----------------|-------------|
| {alias} | {real name} |

## Team - Client (це і є Stakeholder Register; стандарт у `_standards.md` розділ 6)
| Name | Role | Email | Influence | Interest | Channel | Cadence | Notes |
|------|------|-------|-----------|----------|---------|---------|-------|
| {name} | {role} | {email} | H / M / L | H / M / L | Email / Slack / Call | {як часто} | {очікування; чиє мовчання є нормою} |

(Influence × Interest визначає, кого тримаємо близько (H/H), кого інформуємо. Колонки
заповнює ПМ; скіли не виставляють їх самі.)

## Meetings Schedule
| Day | Time | Type | Agenda | ID Suffix | Focus |
|-----|------|------|--------|-----------|-------|
| {day} | {time} | {type} | {ключ з `_standards.md` розділ 5, напр. client_status_sync} | {scheduled-task-id-suffix} | {focus} |

(Skills use this schedule to determine meeting type; the Agenda key selects the prep
structure from `_standards.md`. No Agenda column = map by Type, ask if ambiguous.)

## Deploy Config (read by deploy-analysis)

| Repo | Prod branch | Pending branch | In default scope? |
|------|-------------|----------------|-------------------|
| {repo} | {branch} | {branch} | ✅ / ❌ |

(Deploy windows, promotion rules, hotfix policy - describe here. If the project has
no repos we deploy, write "none" and deploy-analysis will refuse politely.)

## Email Routing (читає mac-mail-collector)

```yaml
email_routing:
  mac_mail_accounts: [{назви папок під ~/work/Mail/}]
  client_emails:        # усі адреси клієнта
    - {email}
  unique_emails:        # трапляються ТІЛЬКИ на цьому проєкті, за ними йде матчинг
    - {email}
  unique_domains: []    # якщо вся організація клієнта на одному домені, напр. other-client.com
  team_emails:          # наші, для іконки 🔴 коли останній автор не наш
    - {email}
  knowledge_base: "{назва KB-сторінки з адресами, або none}"
```

Shared-адреси не перелічуються вручну: адреса вважається спільною, якщо є у
`client_emails` двох і більше активних конфігів. Тред належить проєкту лише коли
збігся `unique_emails` або `unique_domains`.

## Engagement Status
- **Model**: {delivery | support | ...}
- **Team size**: {n}
- {any scope rules and metric-continuity warnings, with dates}

## PM Profile (as of {YYYY-MM-DD}; стандарти і ключі в `projects/_standards.md`)

```yaml
pm_profile:
  case: A                    # A новий з нуля | B прийнятий від іншого ПМа | C не розробка
  phase: active_delivery     # active_delivery | support | on_fire | closing
  delivery_approach: kanban  # kanban | scrum | hybrid | none
  metrics_profile: kanban_support   # kanban_support | scrum_active | on_fire | none
  wip_limit: none            # число або none
  contract:
    type: unknown            # t_and_m | capped_t_and_m | fixed_price | dedicated_team | unknown
    hours_cap_month: none    # число (сума по команді) або none; вмикає метрику hours_burn
    budget_cap: none         # сума або none (якщо фінанси веде delivery, так і написати)
    goodwill_budget_pct: none   # % від hours_cap_month на безкоштовні дрібниці; none = 10% (калібрувати), читає change-request
    billing: "{monthly invoice | milestones | ...}"
    period: "{start} - {end або open}"
  sla: none                  # або {response: "4h", resolution: "2d", hours: "9-18 <TZ>"}
  milestones: []             # - {name: "...", date: YYYY-MM-DD, status: planned | done | slipped}
  decision_rights:           # короткий RACI: хто має останнє слово (A)
    scope_priorities: "{ім'я, роль}"
    tech_decisions: "{ім'я, роль}"
    estimates: "{хто дає цифру; завжди виконавець}"
    prod_deploy_approval: "{ім'я, роль}"
    budget_margin: "{ім'я, роль}"
    escalation_path: "{PM -> Account Manager -> ...}"
  documents:                 # Notion page IDs артефактів з PM Toolkit, або none
    charter_page_id: none
    kt_checklist_page_id: none   # кейс B
    last_health_check: none      # дата останнього Project Health Check
    extras_log_page_id: none     # сторінка "Scope & Extras Log" під сторінкою проєкту (веде change-request)
```

Невідоме значення = `unknown` або "уточнити", ніколи не вигадане. Відсутня секція не ламає
скіли: профіль виводиться з `board_type`, а звіт пише `PM Profile: SKIPPED` у Data
Completeness header.

## Changelog (append-only, newest on top)

- **{YYYY-MM-DD}** - config created
