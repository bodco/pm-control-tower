# 03. Реєстр проєктів `projects/`: єдине джерело правди

## Навіщо

До серпня 2026 факти про проєкт (команда, канали, ID баз, transition ID) були розкидані по тілах скілів. Коли команда Acme за два місяці зменшилась з 9 до 3 людей, а доступ до половини репозиторіїв зник, з'ясувалось, що десятки скілів продовжують "знати" стару реальність. Звідси реєстр конфігів: один файл на проєкт, який читають усі скіли, і жорстке правило, що конфіг перемагає.

Реєстр живе як синхронізований скіл `projects/` (папка поруч з усіма іншими скілами). Це не користувацький скіл, він ніколи не викликається сам, це інфраструктура. Історично був `_projects/` у CLAUDE.md; ця назва застаріла.

Вміст папки:

| Файл | Призначення |
|---|---|
| `SKILL.md` | правила реєстру: Rule Zero, Default Project Rule, Naming Convention, як скіли читають конфіг, як додати проєкт |
| `_standards.md` | стандарти, однакові для всіх проєктів (машинна версія PM Toolkit, `14`) |
| `_template.md` | порожній шаблон конфігу |
| `<slug>.md` | конфіг проєкту, наприклад `acme.md` (~29 KB) |

## Три правила

### Rule Zero: config wins
Конфіг є єдиним джерелом правди про СТАН проєкту: команда, скоуп, доступи, мітинги, інтеграції, ID, модель деплою. Якщо текст скіла суперечить конфігу, правий конфіг, а скіл застарів (і про це треба сказати користувачу). Факти в конфігу мають дати "as of". Кожна зміна стану фіксується того ж дня рядком у Changelog внизу конфігу.

### Default Project Rule: never guess
Якщо запит користувача не називає проєкт явно (назва, slug, однозначний ідентифікатор типу префікса ключа `PROJ-` або специфічного Slack-каналу), скіл ЗОБОВ'ЯЗАНИЙ спитати, перелічивши зареєстровані проєкти. Не вгадувати мовчки, навіть якщо активний лише один проєкт. Змішування проєктів (запис даних одного під relation іншого, застосування креденшелів одного до іншого) - найгірший збій системи.

Проєкт вважається активним, якщо в конфігу немає `status: archived`.

### Naming Convention для скілів
- `{project}-...` (наприклад `acme-debug`, `acme-beneficiary-audit`) - скіл жорстко прив'язаний до одного проєкту, ніколи не спрацьовує для інших.
- Без префікса (`slack-collector`, `jira-management`, `weekly-overview`) - двигун, незалежний від проєкту. Зобов'язаний читати реєстр (Step 0), дотримуватись Default Project Rule і тримати всі проєктні факти у конфігу, а не у своєму тілі.
- Особисті або іншодоменні скіли (наприклад експорти з порталів клінічних досліджень, замовлення курʼєра, форматування документів) живуть поза системою і реєстр не читають.

## Як скіл читає конфіг (Step 0)

Кожен двигун починає з одного й того ж блоку:

1. Визначити проєкт із запиту. Не названий - спитати.
2. Прочитати `../projects/{slug}.md` відносно власного SKILL.md; якщо не знайшлось, `Glob **/projects/{slug}.md` по папці скілів.
3. Усі значення виду `{config.xxx}` беруться звідти.
4. Якщо задача стосується репозиторіїв, скоупу, capacity або звітності - спершу прочитати секції Access Matrix і Engagement Status, бо саме вони визначають, що наше, а що клієнтське, з датами.

Якщо конфіг не знайдено: "Project config not found. Available projects: [...]".

## Анатомія конфігу (по `_template.md`, з коментарями з `acme.md`)

### General
`project_name`, `project_slug`, `status` (active / archived), `description`, `board_type` (Kanban / Scrum), `default_language` (мова внутрішніх звітів), `client_language`.

### Access Matrix (READ THIS FIRST)
Таблиця: ресурс, доступ (✅/❌), з якої дати, примітки. Кожен ресурс, якого торкаються скіли: репозиторії, БД, моніторинг, комунікаційні інструменти. На Acme тут зафіксовано, що MO/CP/Mobile репо - клієнтські, локальні клони і knowledge bases - заморожені снапшоти на 2026-07-31, read-only інституційна пам'ять, а не поточний код.

### Internal Infrastructure
Актуальні URL корпоративних систем (Jira, Confluence, git-хостинг, CI, корпоративна пошта) і список того, що НЕ мігрувало при зміні домену. Потрібно, щоб скіли читали старі посилання у тікетах як історичні і не переписували те, що не змінилось (наприклад локальний шлях `/Users/our-company/` - це username, а не домен).

### Task Tracker (режим доступу)
Секція, яка йде перед Jira і визначає, чи взагалі скіли можуть читати трекер напряму:

```yaml
task_tracker:
  type: jira_server        # jira_cloud | linear | trello | asana | monday | client_notion | manual
  api_access: true         # чи є MCP/REST доступ; у клієнтів з SSO/Okta/MDM часто false
  fallback_source: manual_export   # manual_export | meeting_action_items | email_summaries
  export_path: ~/work/<slug>/exports/   # для manual_export: сюди ПМ кладе CSV/xlsx з трекера
  browser_access: false    # чи можна читати трекер через Chrome-скіл (без токена, під сесією ПМа)
```

На Acme: `jira_server`, `api_access: true`. На проєкті, де клієнт дав лише логін у свою Jira Cloud: `jira_cloud`, `api_access: false`, `browser_access: true`, `fallback_source: manual_export`. Двигуни читають цю секцію одразу після Step 0 і при `api_access: false` переходять на fallback без помилки (правило graceful degradation у `04`).

### Jira
Заповнюється, якщо `task_tracker.type` = jira_server або jira_cloud з `api_access: true`. `server_url`, `server_version`, `project_key`, `mcp_write`, `mcp_read`, `known_bug` (на Jira Server 7.13 обидва конектори повертають "Unexpected end of JSON input" на записі: це косметика, HTTP 204, оновлення проходять, перевіряти повторним читанням).

Підсекції:
- **Labels Taxonomy** - лейбли і призначення (feature, enhancement, bug-fix, ops-support, security, external-dev з позначкою HISTORICAL і датою).
- **fixVersion Convention** - місячні версії `vYYYY-MM`, іменовані релізи `Prod release DD.MM.YYYY`, fixVersion ставиться при Done ретроспективно.
- **Workflow & Transition IDs** - точні назви статусів для JQL і ID переходів. Пастка: `"On Hold / Blocked"` з пробілами, інакше 400.
- **Key Epics** - ключ, назва, призначення.
- **Assignment Rules** - домен → кому призначати, з датою "as of"; явно "No internal resource, leave unassigned, flag to PM" для того, що пішло клієнту.
- **External-Dev Workflow** - якщо є клієнтські розробники, чиї PR ми перевіряємо (на Acme завершено 2026-07-31, збережено як історія).

### Slack
`workspace`, `channels_dev`, `channels_stability`, `channels_all`.

### Sentry
`url`, `token`, `org_slug`, `projects_in_scope`, `projects_out_of_scope` (з датами і причиною), повний список проєктів на інстансі. Якщо Sentry немає: `url: none`, скіли пропускають.

### Notion
`project_page_id`, `workspace_page_id` (проєктні), плюс спільні `reports_db`, `threads_db`, `meetings_db`, `topics_db`, `knowledge_base_db`, `risks_db`, `decisions_db`, `inbox_review_page`, за потреби `client_dev_board_db` (клієнтський воркспейс).

### Local Paths
`aws_logs`, `time_reports`, `repos_root`, `kb_root`, `presentment` тощо. "none" = скіл пропускає джерело. Примітка для хмарних сесій: шляхи доступні через bridge.

### Engagement Status (READ THIS FIRST)
Модель (delivery / support), дата закінчення, розмір команди, наявність QA, скоуп відповідальності по компонентах з датами, **Metric Continuity warning** (на Acme: періоди до 2026-08-01 непорівнянні, команда 9→3, скоуп звужено; будь-який графік через цю дату мусить мати анотацію, інакше читається як обвал продуктивності).

### Team - Internal / Former Members / Client
Поточна команда з Jira-username, назвою ролі для звітів, доступністю (part-time / full-time, до якої дати), фокусом. Окрема таблиця **Former Members** з останнім днем на проєкті: факти не видаляються, вони отримують дату закінчення. Емейли і правило класифікації відправників (будь-який `@our-company.com` = внутрішній). Transcript Alias Map (як транскрипти перекручують імена). Клієнтська команда з ролями і примітками.

### Meetings Schedule
День, час, тип, ID-суфікс scheduled task, фокус. Плюс текстовий опис нестандартної каденції (на Acme внутрішній синк через день: тиждень A Пн/Ср/Пт, тиждень B Вт/Чт).

### Deploy Config
Репо, прод-гілка, pending-гілка, чи в дефолтному скоупі. Вікна деплою, правила промоушену, політика хотфіксів. Якщо репозиторіїв немає: "none", deploy-analysis ввічливо відмовляється.

### Gmail - Client Search Filter
Готовий Gmail-запит для листів клієнта, або "none".

### Cultural Profile (Erin Meyer, Culture Map)
Позиції нашої і клієнтської культури на 7 шкалах, індивідуальна калібровка кожного учасника клієнтської команди (мультиплікатори downgrader-ів, ключові "tells"), таблиця перекладу непрямих формулювань у серйозність. Читає `client-satisfaction-tracker` і `client-meeting-prep`. Для нового проєкту потрібно заповнити хоча б країну клієнта; референсні профілі 10 країн є у скілі.

### PM Profile
Кейс A/B/C, фаза, підхід, `metrics_profile` (ключ профілю з `_standards.md`), WIP-ліміт, контракт (тип, `hours_cap_month`, бюджет, білінг, період), SLA, мілстоуни, `decision_rights` (короткий RACI), ID документів з Toolkit (Charter, KT, Extras Log), `goodwill_budget_pct` для `change-request` і дата останнього health check (поля Extras додані в 0.7.2). Разом з колонками стейкхолдерів у `Team - Client` (Influence, Interest, Channel, Cadence) і колонкою `Agenda` у Meetings Schedule це і є те, що з PM Toolkit стало станом проєкту. Відсутня секція не ламає скіли: профіль виводиться з `board_type`, у звіті `PM Profile: SKIPPED`.

### Changelog (append-only, newest on top)
Дата і що змінилось. Це "пам'ять про зміни", яку Automation Health Check порівнює зі скілами.

## Дисципліна ведення конфігу

- Будь-яка зміна стану (людина прийшла/пішла, доступ отримано/втрачено, змінилась каденція мітингів, змінився скоуп) = того ж дня: правка конфігу + рядок Changelog + рядок у Decisions DB. Скіли підхоплюють автоматично; факт НЕ копіюється у скіли.
- Факти не видаляються, а переводяться в історичні з датою кінця (див. Former Members, external-dev).
- Архівація проєкту: `status: archived` у General. Скіли перестають пропонувати проєкт, дані і історія залишаються читабельними.
- Раз на місяць хмарний Automation Health Check порівнює кожен скіл із конфігами і повідомляє дрейф (`05-autopilot.md`).

## Що дублюється поза конфігом (свідомо, і це треба тримати в синхроні)

1. **Реєстр емейлів**: живе лише в секції `email_routing` конфігів; `mac-mail-collector` читає всі активні конфіги і будує реєстр у памʼяті, жоден колектор не тримає власної таблиці адрес. Адреси, спільні між проєктами, більше не ведуться руками: спільною вважається адреса, яка є у `client_emails` двох і більше активних конфігів. Джерело правди одне - конфіг.
2. **Глобальні інструкції Cowork** ("PM Workspace"): таблиця активних проєктів і коротка шпаргалка по дефолтному. Скорочені до рольової моделі і мета-правил (Rule Zero, Default Project Rule, заборона вигадувати факти, мова/стиль) плюс таблиця "проєкт → slug"; усі факти читаються з `projects/` (`13` #11).
3. **Scheduled tasks**: промпти задач називають проєкт явно ("для проєкту Acme"). Це не дублювання фактів, а правильний спосіб задати проєкт для Default Project Rule.

## Заплановані розширення схеми конфігу

Стан на v1.1: секції, позначені **Зроблено**, є у `_template.md` і їх читають скіли; решта - план, скіли їх не читають.

| Секція | Що містить | Що вирішує |
|---|---|---|
| `task_tracker` | **Зроблено** (шаблон, `projects/SKILL.md`, 14 двигунів перевіряють `api_access`; гілка `false` ще не проганялась на реальному проєкті). Тип трекера, `api_access`, `fallback_source`, `export_path`, `browser_access` | Zero-API Access у клієнтів; graceful degradation двигунів |
| `methodology` | **Частково зроблено** через `pm_profile.delivery_approach` і `metrics_profile`; довжина спринту і capacity-джерело ще ні. `kanban` / `scrum`; для scrum: довжина спринту, capacity-джерело | Scrum-проєкти отримують `sprint-planning-prep` замість Kanban-логіки |
| `email_routing` | **Зроблено.** Усі клієнтські адреси, унікальні, адреси команди, унікальні домени; спільні виводяться | Єдиний реєстр замість трьох (конфіг + два колектори); AppleScript експортує все, роутить скіл за конфігом |
| `secrets` | **Зроблено.** У конфігу лише `token_env` і `secrets_file`; значення у `~/work/Secrets/secrets.env` (видима папка, chmod 600, поза синхронізацією). Той самий файл читає локальний Slack MCP-сервер через `sh -c` у `claude_desktop_config.json`. Git-креденшели (GitHub PAT для `pm-control-tower`) живуть поруч, у `Secrets/.git-credentials` через credential helper `store`; remote URL репозиторію токена не містить (`13` #47). Усі локальні MCP-сервери (Jira, Confluence, Slack, Notion) читають токени за цим патерном (`13` #43) | Токени не потрапляють ні у синхронізовані скіли, ні у JSON конфігу десктопа |
| `languages` | `internal_language`, `client_language` (є частково як default_language/client_language) | Усі генеративні промпти беруть мову строго звідси |
| `data_policy` | `allow_llm_code_inspection`, `allow_llm_slack_reading`, `anonymize_pii` | Клієнти, які забороняють передачу коду/переписки у LLM: скіли вимикають відповідні джерела автоматично |
| `notion.relations` | **Не потрібно:** бази уніфіковані (`Project` / `Workspace` скрізь). Історичний опис: точна назва relation на Project і Workspace для кожної бази (`Projects`/`Project`, `Workspace`/`🏛️ Workspaces`/`Workspaces`) | Поки бази не уніфіковані, скіли беруть назви звідси, а не пам'ятають |
| `git.repositories` | список репо з шляхом, prod/pending гілками, стейдж-гілкою (частково є у Deploy Config) | `env-audit` і `branch-review` без префікса проєкту |
| `budget` | **Зроблено** як `pm_profile.contract` (`hours_cap_month`, `budget_cap`) + метрика `hours_burn` у `_standards.md`. Капа годин або грошей за період, джерело фактичних годин (Tempo) | Мінімальний burn rate для домену 21 |

## Приклад: як один рядок конфігу змінює поведінку десяти скілів

У `acme.md` записано: Sentry `projects_in_scope: core-api`, решта `out_of_scope` з причиною. Наслідок без жодної правки скілів: stability-scan сканує один проєкт замість семи, client-report не згадує помилки клієнтських компонентів, daily-team-prep робить quick check тільки по core-api, risk-register не створює ризики на клієнтські компоненти, velocity-report ставить анотацію про непорівнянність періодів. Саме заради цього ефекту існує реєстр.
