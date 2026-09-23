# 15. Шаблони документів: каталог і власні шаблони

Цей документ відповідає на три питання. Які документи генерує Control Tower? Де лежить шаблон кожного з них? Що робити компанії, PMO або колезі, які хочуть писати ці документи за своїми шаблонами, не правлячи скіли?

Коротко:

- Окремої папки з шаблонами в плагіні немає. Вбудований формат кожного документа описаний у `SKILL.md` скіла, який цей документ генерує. Зведений реєстр усіх документів лежить у `plugin/skills/projects/_templates.md`.
- Кожен документ має **ключ шаблону**, наприклад `client-report.weekly` або `change-request.cr`. Власний шаблон підключається через файл `{ключ}.md` або сторінку Notion з таким самим ім'ям. Скіли при цьому не змінюються.
- Шаблон шукається на трьох рівнях: **проєкт** (конфіг `pm_profile.templates`), потім **house** (реєстр `_templates.md`: компанія, PMO або сам ПМ), потім **вбудований** формат зі скіла. Спрацьовує перший знайдений.
- Шаблон визначає секції, їх порядок і постійний текст. Він не може змінити інваріанти: заголовок Data Completeness, мовне правило, санітизацію клієнтських документів, місце збереження і правило 5 хвилин.

Стан: механізм з'явився у v1.2.0 і ще не прогнаний на реальному наборі шаблонів компанії (`13`, #50).

## 1. Каталог документів

Колонка "Вбудований шаблон" вказує розділ у `plugin/skills/<скіл>/SKILL.md`, якщо не написано інше. Reports DB, Risks DB, Topics DB, Threads DB і Tasks Tracker описані в `02`.

### Звіти і prep

| Скіл | Документ | Ключ шаблону | Вбудований шаблон | Куди зберігається | Мова |
|---|---|---|---|---|---|
| `client-report` | Тижневий звіт клієнту | `client-report.weekly` | "Weekly Report Format" | Reports DB, Type `Client Weekly Report`, Visibility External + локальний `.md` у outputs | EN |
| `client-report` | Місячний звіт клієнту | `client-report.monthly` | "Monthly Report Format" | Reports DB, `Client Monthly Report`, External + `.md` | EN |
| `client-report` | Steering / exec update | `client-report.steering` | "Steering / Exec Update Format" | Reports DB, `Steering Update`, External + `.md` | EN |
| `client-meeting-prep` | Prep до планінгу | `client-meeting-prep.planning` | "Planning prep" | Reports DB, `Client Meeting Prep` | UA |
| `client-meeting-prep` | Prep до статус-синку | `client-meeting-prep.status-sync` | "Status sync prep" | Reports DB, `Client Meeting Prep` | UA |
| `client-meeting-prep` | Prep до 1-1 з лідом клієнта | `client-meeting-prep.one-on-one` | "1-1 with the client lead" | Reports DB, `Client Meeting Prep` | UA |
| `client-meeting-prep` | Prep до рев'ю / демо | `client-meeting-prep.review` | "Review prep" | Reports DB, `Client Meeting Prep` | UA |
| `daily-team-prep` | Prep до внутрішнього синку | `daily-team-prep` | "Report Format" | Reports DB, `Daily Team Prep`, Internal | UA |
| `weekly-overview` | Тижневий огляд по проєктах | `weekly-overview` | "Report Format" | Reports DB, `Weekly Overview`, Internal | UA |
| `velocity-report` | Місячний velocity-звіт | `velocity-report` | "Report Format" | Reports DB, `Velocity Report`, Internal | UA |
| `jira-board-health` | Здоров'я борди | `jira-board-health` | "Report Format" | Reports DB, `Board Health`, Internal | UA |
| `stability-scan` | Скан стабільності (внутрішній) | `stability-scan.internal` | "Report Format - Ukrainian (internal)" | Reports DB, `Stability Scan`, Internal + `.md` | UA |
| `stability-scan` | Звіт стабільності для клієнта | `stability-scan.external` | "Report Format - English (client-facing)" | локальний `stability-report-YYYY-MM-DD-EN.md` | EN |
| `deploy-analysis` | Аналіз деплою, реліз-ноути стейджа | `deploy-analysis` | `deploy-analysis/README.md`, крок 7 | Reports DB, `Deploy Analysis`, Internal + `{reports_root}/deploy-analysis-{slug}-{дата}.md` | UA |
| `risk-register` | RAID-зведення (внутрішнє) | `risk-register.internal` | "Internal summary" | Reports DB, `Risk Register`, Internal | UA |
| `risk-register` | Санітизований звіт ризиків | `risk-register.external` | "External summary" | Reports DB, `Risk Register`, External | EN |
| `risk-register` | Досьє одного ризику | `risk-register.dossier` | "Risk Dossier Format" | тіло сторінки в Risks DB | UA |
| `client-satisfaction-tracker` | Звіт про настрій клієнта | `client-satisfaction` | "Output Report" | Reports DB, `Client Satisfaction`, Internal | UA |

### Документи проєкту

| Скіл | Документ | Ключ шаблону | Вбудований шаблон | Куди зберігається | Мова |
|---|---|---|---|---|---|
| `change-request` | Change Request | `change-request.cr` | "Step 4" (з шаблону CR у Toolkit) | Reports DB, `Change Request`, External | EN |
| `change-request` | Scope & Extras Log | `change-request.extras-log` | "Step 3" | сторінка під сторінкою проєкту | UA |
| `project-lifecycle` | Звіт kickoff | `project-lifecycle.kickoff` | "K8" | Reports DB, `Project Kickoff`, Internal | UA |
| `project-lifecycle` | Project Charter | `project-lifecycle.charter` | сторінка Toolkit під `pm_toolkit_page_id`, інакше прості секції | сторінка під сторінкою проєкту | UA |
| `project-lifecycle` | KT / Handover Checklist | `project-lifecycle.kt-checklist` | сторінка Toolkit, інакше прості секції | сторінка під сторінкою проєкту | UA |
| `project-lifecycle` | Звіт прийому проєкту | `project-lifecycle.handover` | "Mode handover-in" | Reports DB, `Project Handover`, Internal | UA |
| `project-lifecycle` | Project Health Check | `project-lifecycle.health-check` | "Mode health-check" | Reports DB, `Project Health Check`, Internal | UA |
| `project-lifecycle` | Онбординг члена команди | `project-lifecycle.onboarding` | `onboarding_template_page_id`, інакше прості секції | сторінка під сторінкою проєкту | UA |
| `project-lifecycle` | Звіт закриття | `project-lifecycle.closure` | "Mode closure" | Reports DB, `Project Closure`, Internal | UA |
| `project-lifecycle` | Handover pack при закритті | `project-lifecycle.handover-pack` | "Mode closure", крок 3 | сторінка під сторінкою проєкту | UA |

### Мітинги, теми, драфти, тікети

| Скіл | Документ | Ключ шаблону | Вбудований шаблон | Куди зберігається | Мова |
|---|---|---|---|---|---|
| `notion-meeting-topics` | Двомовний звіт з мітингу | `notion-meeting-topics` | "Report Structure" | дописується в кінець сторінки мітингу | EN + UA |
| `topic-manager` | Місячна секція теми | `topic-manager.month-section` | "Month Section Format" | тіло сторінки в Topics DB | UA |
| `inbox-responder` | Драфт відповіді на тред | `inbox-responder.draft` | "Step 4", "Draft structure" | Threads DB, поле `Draft Response` + сторінка Inbox Review | мова оригіналу |
| `jira-management` | Опис баг-тікета | `jira-management.bug` | "Ticket template (description) - bug tickets" | тікет у трекері | EN |
| `jira-management` | Опис фіча-тікета | `jira-management.feature` | "Ticket template - feature/enhancement" | тікет у трекері | EN |
| `slack-collector` | Тікет зі Slack-треду | `slack-collector.ticket` | "4.4 - Create the ticket" | тікет у трекері | EN |
| `thread-ticket-sync` | Тікет на Notion-борді клієнта | `thread-ticket-sync.ticket` | тіло `task` у Phase 2 | борд клієнта в Notion | EN |

### Що не шаблонізується

Машинні записи, формат яких є контрактом між скілами: сторінки Threads DB від `slack-collector` і `mac-mail-collector`, властивості Topics, Risks і Decisions DB, рядки Tasks Tracker. Також відповіді `sentry-assistant` у чаті і всі підсумки в чаті. Якщо змінити їх формат, зламаються скіли, які ці записи читають.

## 2. Три рівні і порядок пошуку

```
проєкт (pm_profile.templates у конфігу)
   ↓ не знайдено
house (projects/_templates.md: компанія, PMO або сам ПМ)
   ↓ не знайдено
вбудований формат у SKILL.md
```

Детальний порядок для ключа `K` (спрацьовує перший знайдений):

1. `pm_profile.templates.overrides.K` у конфігу проєкту.
2. `{pm_profile.templates.root}/K.md`, тобто папка шаблонів конкретного проєкту.
3. Тільки для `client-report.*`: `pm_profile.reporting.locked_template_page_id`, попередній звіт, чия структура зафіксована. Механізм старший за цей документ і лишається робочим.
4. `overrides.K` у `_templates.md`.
5. `{templates_root}/K.md` з `_templates.md`.
6. Дочірня сторінка з назвою рівно `K` під `notion_templates_page_id` з `_templates.md`.
7. Тільки для Charter, KT Checklist і онбордингу: сторінка PM Toolkit, як і раніше.
8. Вбудований формат.

Джерело шаблону може бути або шляхом до `.md`-файлу, або `notion:<page id>`.

Rule Zero діє і тут. Конфіг проєкту перемагає house-реєстр, а house-реєстр перемагає текст скіла.

## 3. Сценарії

### 3.1. Шаблонів немає (стан за замовчуванням)

Нічого робити не треба. У `_templates.md` стоїть `templates_root: none`, у конфігах `templates.root: none`, і кожен скіл пише за своїм вбудованим форматом, як до v1.2.0. У заголовку Data Completeness видно `Template: built-in`.

### 3.2. У компанії є набір шаблонів (PMO)

1. Вибрати, де шаблони житимуть:

| Де | Коли підходить | Обмеження |
|---|---|---|
| **Сторінка в Notion** (`notion_templates_page_id`), дочірні сторінки з назвами-ключами | рекомендовано: видно всім ПМам, працює і в локальних, і в хмарних прогонах | потрібен доступ інтеграції Notion до сторінки |
| **Папка на Mac** (`templates_root`), наприклад синхронізована Google Drive / OneDrive | шаблони вже живуть файлами в компанії | досяжна лише в сесії з Mac; хмарний scheduled task без Mac падає на вбудований формат (розділ 5) |
| **Всередині плагіна** (`templates_root: templates`, тобто папка `projects/templates/` у встановленому плагіні; відносний шлях рахується від `projects/`) | потрібна досяжність скрізь без Notion | зміна шаблону = перезбірка плагіна через customize flow |

2. Назвати файли або сторінки за ключами з розділу 1: `client-report.monthly.md`, `change-request.cr.md`. Шаблон потрібен лише для тих документів, які компанія хоче змінити. Для решти скіли пишуть за вбудованим форматом.
3. Прописати джерело в `projects/_templates.md` (`templates_root` або `notion_templates_page_id`). Якщо назва файлу не збігається з ключем, наприклад `MBR v3.md`, додати рядок в `overrides`.
4. Перевірити командою `перевір шаблони` (розділ 7).

### 3.3. Колега піднімає систему зі своїми шаблонами

Колега встановлює плагін як зазвичай (`10`). Без шаблонів усе працює на вбудованих форматах, тому шаблони можна додавати пізніше і по одному.

- Шаблони лежать **поза плагіном**: папка колеги або його сторінка в Notion. Оновлення плагіна їх не зачіпає.
- Шлях до них записаний у `_templates.md` усередині встановленого плагіна, так само як конфіги проєктів. Після переустановлення плагіна з чистого `.plugin` цей файл треба відновити, як і конфіги. Правити його слід через customize flow плагіна, а не окремим скілом (`projects/SKILL.md`, "Adding a new project", крок 7).
- Скіли колега не правлять. Якщо йому здається, що без правки скіла не обійтися, найчастіше йдеться про інваріант (розділ 6). Його змінює власник фреймворку, а не шаблон.

### 3.4. Клієнт вимагає свій формат на одному проєкті

Це робиться на рівні проєкту в конфігу:

```yaml
pm_profile:
  templates:
    root: ~/work/acme/templates        # папка лише цього проєкту
    overrides:
      client-report.monthly: "notion:<id сторінки з форматом клієнта>"
```

Інші проєкти далі користуються house-шаблонами. Зміна формату за Rule Zero: того ж дня правка конфігу, рядок у Changelog і рядок у Decisions DB.

### 3.5. Шаблон у .docx, .pptx або Google Docs

Скіли пишуть Markdown у Notion і не читають такі файли як шаблони. Що з цим робити:

1. Перенести **структуру** (заголовки, порядок, постійний текст, дисклеймери) у `.md`-шаблон. Попросіть Claude: "зроби md-шаблон `client-report.monthly` з цього docx".
2. Брендинг (логотип, шрифти, колонтитули) застосовується, коли готовий звіт експортують вручну. Наприклад, можна попросити Claude зібрати `.docx` з готової сторінки за корпоративним файлом. Автоматичний експорт у брендований формат поки не зроблений (`13`, #50).

## 4. Як написати шаблон

Приклад з коментарями лежить у `templates/documents/_example.client-report.weekly.md` у корені репозиторію. Через підкреслення на початку назви він неактивний, навіть якщо папка підключена.

```markdown
---
doc_key: client-report.weekly
version: 2026-09-23
owner: PMO
---
# {{project_name}} - Weekly Status Report
**Period:** {{period}} · **Status:** {{status}}

## Summary
<!-- ct: 3 речення, outcomes, без номерів тікетів -->

## Delivered
<!-- ct: завершена робота, згрупована за бізнес-напрямами -->

## Decisions Needed From You
<!-- ct: з Risks DB і відкритих CR; якщо нічого, прямо сказати -->

## Confidentiality
This report is intended for {{client_name}} only.
```

| Елемент | Як скіл його обробляє |
|---|---|
| Заголовки `##` | стають секціями документа в тому ж порядку; скіл заповнює кожну за змістом із даних, які він і так збирає |
| `<!-- ct: ... -->` | інструкція для скіла, у результат не потрапляє |
| `{{project_name}}`, `{{client_name}}`, `{{period}}`, `{{date}}`, `{{prepared_by}}`, `{{status}}` | підставляються з конфігу і прогону; невідомий плейсхолдер лишається як є, і скіл показує його ПМу |
| Будь-який інший текст | копіюється дослівно (дисклеймери, футери, постійні формулювання) |
| Frontmatter | необов'язковий; якщо `doc_key` не збігається з ключем, під яким файл підключено, скіл попереджає |

Шаблон не додає нових джерел даних. Якщо секція просить те, чого скіл не збирає (наприклад "NPS за квартал" у `client-report`), він пише "TBD: fill manually" і показує це ПМу. Даних для такої секції він не вигадує.

## 5. Що буде, якщо...

| Ситуація | Поведінка |
|---|---|
| Для ключа немає файлу в `templates_root` | це не помилка: ключ не перевизначений, скіл переходить до наступного рівня |
| Файл явно названий в `overrides`, але його немає | fallback на наступний рівень, `Template: FALLBACK built-in (... unreachable)` у заголовку і попередження в чаті |
| Хмарний scheduled task, шаблон лежить на Mac | те саме: fallback і `FALLBACK`. Для хмарних прогонів тримайте шаблони в Notion |
| Шаблон не має "Decisions needed from you", статусного рядка або ризиків з діями | скіл **не** додає їх мовчки: пише `(missing: ...)` у заголовку і пропонує додати в чаті. Рішення за власником шаблону |
| Для секції немає даних за період | "No data for this period" (або відповідник мовою `default_language`) |
| Секція вимагає даних, яких скіл не збирає | "TBD: fill manually" і рядок у чаті |
| Шаблон клієнтського документа написаний українською | документ однаково пишеться мовою `client_language`: мовне правило є інваріантом |
| У шаблоні є довге тире | скіл замінює його на дефіс або кому |
| Шаблон Extras Log не має потрібних колонок | вісім колонок (`Date`, `Request`, `Source`, `Bucket`, `~Hours`, `Billed`, `CR`, `Status`) лишаються, бо `change-request` рахує за ними номери CR і goodwill; додаткові колонки дозволені |
| Оновили плагін | шаблони поза плагіном не змінюються; `_templates.md` треба зберегти так само, як конфіги |

## 6. Що шаблон змінити не може (інваріанти)

Ці правила живуть у `projects/SKILL.md` ("Document templates", пункт 4) і діють за будь-якого шаблону:

1. **Заголовок Data Completeness.** Перший рядок внутрішнього документа. У клієнтському документі він стоїть HTML-коментарем у збереженому `.md` і в чаті, а в тексті для клієнта його немає. Тепер він також показує, яким шаблоном написано документ.
2. **Мова.** Клієнтські документи пишуться мовою `client_language`, внутрішні мовою `default_language`. Довгого і середнього тире немає ніде.
3. **Санітизація External.** У клієнтських документах немає внутрішніх імен, інструментів, ставок і ризиків, пов'язаних з людьми (правила `risk-register`).
4. **Збереження.** База, `Type`, `Skill`, `Visibility`, relation `Project` / `Workspace` і шаблон назви звіту не змінюються, бо на них тримаються вʼюшки, дайджести і пошук.
5. **Правило 5 хвилин і ручна відправка.** Шаблон не може змусити скіл щось відправити.
6. **Машинна структура.** Колонки Extras Log, заголовок `## {Місяць} {Рік}` у секціях тем, розмітка тікетів за `task_tracker.type` (wiki для Jira Server, ADF для Cloud).
7. **Правило читача** (`_standards.md`, розділ 1) не вставляється в шаблон примусово, але його відсутність завжди видно (розділ 5).

## 7. Перевірка: `перевір шаблони`

Режим `template-check` скіла `project-lifecycle`. Команди: "перевір шаблони по <проєкт>" або "перевір house-шаблони". Скіл нічого не записує. Він показує в чаті таблицю: ключ, звідки береться шаблон (`project`, `house`, `Toolkit`, `built-in`), чи джерело досяжне з локальних і з хмарних прогонів, яких інваріантів не вистачає. Запускайте після кожної зміни набору шаблонів і перед першим хмарним прогоном.

## 8. Де що лежить

| Файл | Що в ньому | Хто править |
|---|---|---|
| `plugin/skills/projects/_templates.md` | house-налаштування, порядок пошуку, реєстр ключів, формат шаблону | власник інсталяції (компанія, PMO, ПМ) |
| `plugin/skills/projects/SKILL.md`, "Document templates" | як скіли застосовують шаблон, інваріанти, fallback | власник фреймворку |
| `pm_profile.templates` у `projects/<slug>.md` | шаблони конкретного проєкту | ПМ проєкту, за Rule Zero |
| `plugin/skills/<скіл>/SKILL.md` | вбудований формат і рядок **Template** з ключами перед ним | власник фреймворку |
| `templates/documents/` у репозиторії | приклад шаблону і README | власник фреймворку |
