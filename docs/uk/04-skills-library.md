# 04. Бібліотека скілів

## Що таке скіл

Скіл = папка з файлом `SKILL.md` (плюс за потреби `README.md`, `scripts/`, `references/`, `inputs/`), яку Claude читає і виконує. `SKILL.md` має frontmatter (`name`, `description` до 1024 символів, бо довші синхронізація відхиляє) і тіло з інструкціями. Description - це одночасно і опис, і тригер: Claude вирішує застосувати скіл, коли запит збігається з описом (тригерні слова двома мовами).

Скіли синхронізуються між Claude Desktop (Cowork) і хмарними сесіями. Зараз: **47 записів**: 37 власних (34 активних, 3 заморожених), 9 стокових Anthropic (docx, xlsx, pptx, pdf, canvas-design, skill-creator, learn, morning, import-memory), 1 плагінний (`topic-analyzer`). Тумбстоунів більше немає: усі пʼять видалено після перейменувань. Порівняно з v0.2 (53 записи) мінус `gmail-collector`, мінус `proj-weekly-report`, мінус пʼять тумбстоунів; окремо плагіни design, product-management, finance зі своїми скілами, які у цей рахунок не входять.

> у синхронізованій папці 50 записів. Додано двигуни `project-lifecycle` і `change-request`, суттєво оновлено `risk-register` і `client-report` (PM Toolkit, `14`). Детальний перерахунок власних / стокових / плагінних не робився.

## Анатомія PM-скіла (двигуна)

```
---
name: daily-team-prep
description: >
  Що робить. Для якого типу проєктів. Тригери: "підготовка до міту", "team prep", "daily prep",
  "agenda for standup"... Also triggers as part of the 11:00 scheduled prep. When triggered, execute immediately.
---

# Назва

## Project Config
Step 0 - always run first:
1. Визначити проєкт із запиту; не названий - спитати (Default Project Rule).
2. Прочитати ../projects/{slug}.md (fallback: Glob **/projects/{slug}.md).
3. Усі {config.xxx} беруться звідти.

## Data Sources
Паралельно: Jira (JQL з {config.jira.project_key}), Slack ({config.slack.channels_all}),
Notion Meetings (останні 3 дні, action items), Sentry (quick check по {config.sentry.projects_in_scope}).

## Report Format
Шаблон результату (мова, секції, що писати, якщо джерело порожнє).

## Behavior
Паралельність, стислість, що робити при відмові джерела, різниця scheduled / manual.

## Report Storage
Notion Reports DB ({config.notion.reports_db}), властивості: Report Name, Date, Type, Skill, Summary,
Workspace, Project; повний текст у тілі сторінки.
```

Три речі, які відрізняють хороший скіл від поганого: явний Step 0 (проєкт і конфіг), явна поведінка при порожньому або недоступному джерелі, явне місце збереження результату.

## Каталог

Легенда типу: **E** = двигун (ядро, project-agnostic, читає реєстр), **P** = проєктний адаптер (прив'язаний до одного проєкту; це норма, а не борг), **H** = історичний (заморожений адаптер, тільки на явний запит), **X** = поза PM-системою (особисті/інші домени; технічно теж адаптери під інші стеки), **S** = стоковий Anthropic.

### 1. Колектори (джерела → Notion Threads)

| Скіл | Тип | Що робить | Тригери | Розклад |
|---|---|---|---|---|
| `slack-collector` | E | Slack-канали проєкту за період → Threads DB з авто-класифікацією статусу, червоною іконкою, 14-денним review pass, gap-аналізом. Два режими з конфігу (`slack_access`): `mcp` (пряме підключення воркспейсу до Claude) і `chrome` (читання веб-UI через Claude in Chrome) | "збери слак Acme за тиждень", "collect slack" | щодня 07:05 через `acme-daily-slack-sync` |
| `mac-mail-collector` | E | Читає буфер `~/work/Mail/<account>/incoming/` (AppleScript + LaunchAgent експортують нові листи з Mail.app кожні 15 хв як JSON + EML), фільтрує шум і календарні інвайти, роутить по проєктах, пише у Threads, переносить у `processed/` | "перевір пошту", "обробити пошту" | щодня 09:12 |
| `signal-desktop` | X | Читання/надсилання у Signal Desktop через computer use | "прочитай сигнал" | on-demand |

> `gmail-collector` видалено. Усі робочі пошти ПМа підключені до Mail.app, тому їх забирає `mac-mail-collector`; єдиний акаунт, який лишався у Gmail, підключений напряму по MCP і не потребує колектора. Реєстр маршрутизації емейлів, який жив у тілі того скіла, переїхав у секцію `email_routing` конфігів проєктів (див. `03`).

**Обмеження колекторів: повнота, а не зручність.** Принцип 10 у `00` (усі повідомлення і зустрічі мають бути у Notion) працює як фільтр допустимих режимів збору, а не як побажання. Режим збору годиться лише тоді, коли він дає **повний** зріз каналу за період з тілами повідомлень і тредами. Email-нотифікації зі Slack, часткові браузерні читання "останніх 20 повідомлень" і ручні дайджести цей критерій не проходять і не є "гіршою, але прийнятною" альтернативою: вони дискваліфіковані, бо створюють хибну впевненість, що контекст зібрано.

Практичний наслідок для Slack, **вирішено**: конектор Claude тримає одну авторизацію на акаунт, але другий і кожен наступний воркспейс підключається власною read-only інтеграцією ПМа (`xoxp`-токен) через локальний MCP-сервер `slack-mcp-server` у `claude_desktop_config.json`. Перевірено на наша компанія: список каналів, історія, треди з коментарями. Токен читається з `secrets.env` при старті і в JSON не лежить. Отже, `slack_access` має три значення: `mcp` (конектор Claude), `mcp_local` (власний сервер, поки не реалізовано у скілі) і `chrome` (резерв). Повний опис, чекліст підключення і межі: сторінка "Slack без конектора" у Notion під проєктом Control Tower Framework.

### 2. Prep-скіли (перед мітингами)

| Скіл | Тип | Що робить | Розклад |
|---|---|---|---|
| `daily-team-prep` | E | Компактний prep до внутрішнього синку: хто чим зайнятий, рух по борді, блокери, теми зі Slack, невиконані action items, Sentry за 24 год | робочі дні 11:08 (перед 12:00) |
| `client-meeting-prep` | E | Адаптивний prep для типів мітингів з конфігу (Planning, Status Sync, 1-1, Review): прогрес, блокери, ризики, відкриті питання, що спитати | Пн/Вт/Чт/Пт 16:0x перед 17:00 |
| `jira-board-health` | E | Гігієна борди: без лейблів, stale In Progress, Done без fixVersion, long-blocked, застряглі статуси | Пт 16:02 разом з review prep |

### 3. Звіти та огляди

| Скіл | Тип | Що робить | Розклад |
|---|---|---|---|
| `weekly-overview` | E | Понеділковий огляд минулого тижня по всіх проєктах: Jira throughput, мітинги, треди, ризики, відкриті питання, аутлук | Пн 08:09 |
| `client-report` | E | Клієнтський weekly/monthly/steering звіт англійською: статус 🟢🟡🔴, зроблене як outcomes, Tempo і години проти капу, блокери, "Decisions Needed From You", опційно "Delivered beyond scope", аутлук; Steering Update як окремий формат (хвиля 2) | on-demand (docx) |
| `velocity-report` | E | Місячні метрики: throughput, cycle time, лейбли, навантаження по людях, тренд vs попередній місяць, з Metric Continuity анотацією | 1-ше число 09:00 |
| `deploy-analysis` | E | Stage vs prod по репозиторіях з конфігу: реліз-ноутси стейджа, дельта, що ще не промоутнули; тільки локальні refs | щодня (`deploy-analysis-daily`) |
| `stability-scan` | E | Фаза 1: Sentry unresolved + CloudWatch-логи з диска → digest з трейсами, англійський звіт клієнту, Jira-тікети. Фаза 2: `acme-debug` для глибокого RCA | Чт 22:10 |
| `daily-work-report` (scheduled prompt) | E | Щоденний робочий звіт українською по всій нашій компанії: вчора (календар, мітинги, треди, Jira, Slack) і план на сьогодні; у Reports DB і локально | робочі дні 09:01 |

### 4. Аналітика і пам'ять

| Скіл | Тип | Що робить | Розклад |
|---|---|---|---|
| `notion-meeting-topics` | E | З Notion-сторінки мітингу робить детальний двомовний звіт (рішення, action items, теми) і дописує на ту ж сторінку | on-demand: "міт <url>" |
| `topic-analyzer` | E | Meetings + Threads за період → створення/оновлення сторінок Topics DB з relation на джерела | on-demand + Пн 06:32 через `weekly-topics-db-update` |
| `risk-register` | E | RAID-реєстр: сканує Jira/Slack/Meetings/Threads/Sentry і early warning signals з `_standards.md`, групує, створює/оновлює Risks DB з `Kind` (Risk / Assumption / Issue / Dependency), генерує два звіти (Internal UA / External EN з "Decisions needed from you"). Картка v0.7.1: Kind, виправлена назва title `Name`, сигнали і bus factor | Пт (перед review) |
| `change-request` | E | Кожна хотєлка клієнта → відро A (дрібниця, лише облік) / B (години) / C (торкається даних, грошей, безпеки, публічних контрактів: завжди CR); Extras Log на проєкт з безкоштовною роботою; чернетка CR англійською; рішення клієнта в Decisions; goodwill-бюджет (дефолт 10% капу годин, калібрувати) | on-demand + треди Category Scope Change |
| `project-lifecycle` | E | Режими kickoff (конфіг, Notion-якорі, Charter, перше рішення, tech start, пакет `projects.skill`), handover-in (KT з доказами, baseline, незадокументовані обіцянки), health-check (8 областей RAG з доказами), team-onboarding/offboarding, closure / перехід у саппорт | on-demand + щоквартальний health check |
| `client-satisfaction-tracker` | E | Настрій клієнта зі Slack/Gmail/транскриптів з культурною калібровкою (Culture Map, індивідуальні профілі, 4 рівні сигналів, 6 культурних патернів) | 1-ше і 15-те число |
| `thread-ticket-sync` | E | Двофазний: треди без тікетів у клієнтському Notion → перетворення обраних тредів на задачі (individual / consolidated) | on-demand |
| `inbox-responder` | E | Треди Awaiting Reply → категорія, контекст (Sentry, логи, Jira, Topics), драфт відповіді мовою треду, Inbox Review | щодня після пошти |

### 5. Управління трекером і моніторингом

| Скіл | Тип | Що робить |
|---|---|---|
| `jira-management` | E | Створення/оновлення/пошук/переходи/лейбли за правилами з конфігу (taxonomy, transition ID, епіки, assignment rules) |
| `sentry-assistant` | E | Прямий REST до self-hosted Sentry: unresolved, деталі з трейсом, пошук, зміна статусів |
| `acme-jira-estimate-setter` | P | Масове проставлення originalEstimate по правилах (bug-fix 4h, решта timeSpent), через Chrome + Jira REST через обмеження Bug типу |
| `acme-notion-jira-sync` | P | Jira → CSV для імпорту в клієнтський Notion DEV Board (fixVersion + активні тікети, Work Dates з Tempo) |

### 6. Проєктні інженерні скіли (Acme)

| Скіл | Тип | Що робить |
|---|---|---|
| `acme-debug` | P | RCA будь-якого бага: локальні KB (компоненти + SYSTEM.md + SDLC.md), код на гілці, задеплоєній на уражений енв, схеми БД, Sentry + CloudWatch, живі API |
| `acme-db-assistant` | P | Знання схем PBR (89 таблиць, 106 FK) і Authorizer (14 таблиць), SQL, дебаг даних |
| `acme-env-audit` | P | Аудит гілок і енвів на локальних git refs: дрейф dev/master, прямі коміти, небекпортнуті хотфікси, коміти-двійники; вердикти про готовність до деплою; п'ять законів верифікації |
| `acme-beneficiary-audit` | P | Тристороння звірка бенефіціарів: Authorizer xlsx ↔ PBR csv ↔ провайдер карток API (19k+ юзерів), ACTION_PLAN.md українською |
| `acme-beneficiary-transactions` | P | Хронологія операцій бенефіціара з усіх джерел, момент виходу балансу в мінус |
| `authorizer-code-review` | P | KB-driven code review Authorizer (Java 11 / Spring Boot): KB спершу, потім тільки файли з diff; LESSONS.md наприкінці |
| `middle-office-code-review`, `client-portal-code-review`, `mobile-code-review` | H | Заморожені з 2026-08 / 2026-06 (компоненти клієнтські), тільки на явний запит |

### 7. Інші домени (показують універсальність двигунів)

| Скіл | Тип | Домен |
|---|---|---|
| `t2-worklog-collect`, `t2-worklog-check` | X | Звірка логування команди Swan на T2 (Beta): збір 5 файлів, перевірка тоталів, PTO, свят |
| `calyx-export`, `signant-export` | X | Експорти з IRT/RTSM клінічних досліджень через Chrome + українське порівняння з попереднім зрізом |
| `dila-lab-order`, `marken-order` | X | Замовлення кур'єра лабораторії: docx у папку пацієнта + чернетка листа |
| `ukr-dissertation-format` | X | Вимоги МОН до дисертацій |

### 8. Стокові та мета

`docx`, `xlsx`, `pptx`, `pdf` (створення документів), `canvas-design`, `skill-creator` (створення, ітерація, evals скілів), `learn`, `morning`, `import-memory`, плагіни `design`, `product-management` (brainstorm, spec, roadmap, sprint planning, stakeholder update, metrics review), `finance`.

## Ядро проти адаптерів: що перейменовувати, а що ні

Апендикс рецензії зняв ідею "прибрати назву проєкту з усіх імен скілів": проєктні скіли - нормальний патерн адаптера під чужий стек. Перейменування має сенс лише там, де під префіксом `acme-` ховається справді універсальний двигун, а проєктні факти можна винести у конфіг:

| Скіл зараз | Що в ньому універсальне | Що має піти у конфіг | Пропонована назва |
|---|---|---|---|
| `acme-env-audit` | аудит дрейфу гілок/енвів, п'ять законів верифікації, `scripts/audit.sh` | карта гілки→енв, аліаси авторів, навмисні дивергенції (`references/acme-map.md`) | `env-audit` |
| `acme-jira-estimate-setter` | масове проставлення estimate за правилами | правила (bug-fix 4h, решта timeSpent), обхід типу Bug | перейменування не потрібне: після v0.3 це коректний адаптер |
| `authorizer-branch-review` (scheduled) | реакція на `REVIEW:` у каналі, тред-ревʼю | канал, скіл ревʼю | `branch-review` з `{config.slack.dev_review_channel}` |
| `acme-daily-slack-sync` (scheduled) | щоденний ingest + review pass | проєкт | **Зроблено**: хмарна Routine `Acme daily Slack sync`, промпт задає лише проєкт і період |

Адаптери, які залишаються проєктними назавжди: `acme-beneficiary-audit`, `acme-beneficiary-transactions`, `acme-db-assistant`, `acme-debug` з KB, `acme-notion-jira-sync` (клієнтський Notion), `calyx-export` / `signant-export` (портали без API), `dila-lab-order` / `marken-order`. У нового клієнта на їхньому місці з'являться свої: парсер ручного CSV з Linear, браузерний збір з Trello, звірка їхніх експортів. Рішення про три перейменування - за ПМ (див. `13`).

### Правило graceful degradation для двигунів
Кожен двигун, який читає трекер, зобов'язаний після Step 0 перевірити `{config.task_tracker.api_access}`:
- `true`: звичайний шлях через MCP/REST з `project = {config.task_tracker.project_key}`.
- `false`: без помилки перейти на `{config.task_tracker.fallback_source}`: `manual_export` (останній файл у `~/work/<slug>/exports/`), `meeting_action_items` (action items з Meetings DB за період), `email_summaries` (Threads DB за період). У звіті явно позначити: "Джерело задач: ручний експорт від <дата>", щоб читач розумів свіжість.
- Те саме для Sentry (`url: none`), репозиторіїв (`none`), Slack (`channels_all` порожній): джерело пропускається з одним рядком у звіті, решта звіту генерується.

## Життєвий цикл скіла

### Створення ("без Skills 101")
1. **Ідея народжується з рутини.** Ловиш повторюване "я знову питаю Claude те саме" і фіксуєш як скіл. Не читати документацію наперед.
2. **Дебаг одразу в чаті.** Запускаєш, бачиш косяк, кажеш "виправ ось це", Claude сам редагує SKILL.md.
3. **README-as-you-go.** Документація пишеться під час роботи, не після. Сторінка скіла у Notion (під Claude Skills & Prompts) створюється одразу.
4. Мета-скіл `skill-creator` для evals і оптимізації description, коли скіл стабільний і треба поліпшити тригери.

### Правила якості
- Description до 1024 символів, тригери двома мовами, наприкінці "When triggered, execute immediately" для скілів, які не потребують підтвердження.
- Проєктні факти тільки в конфігу (Naming Convention).
- Жодних мовчазних дефолтів проєкту.
- Явна поведінка при недоступному джерелі: коротко зазначити і рухатись далі.
- Для скіла, що працює з репозиторіями: ніколи `git fetch/pull` у хмарі (корпоративний проксі блокує), тільки локальні refs.
- Дата-марковані факти ("VERIFIED 2026-08-17") перевіряються раз на 90 днів.

### Перейменування і депрекація
Скіл не видаляється, а стає тумбстоуном: description починається з "DEPRECATED <дата> - RENAMED to <new>", тіло каже нічого не робити і повідомити про перейменування. Приклади: `beneficiary-audit` → `acme-beneficiary-audit`, `jira-server-management` → `jira-management`, `acme-slack-collector` → `slack-collector`. Тумбстоуни видаляються вручну в Settings → Skills, коли зручно (усі пʼять видалено).

> **Урок.** Перейменування коштує дорожче, ніж здається. Коли `acme-slack-collector` став `slack-collector`, проєктна конкретика мала переїхати у конфіг, але не переїхала: у `acme.md` не було ні ID каналів, ні `permalink_base`, ні `json_output_folder`, ні `slack_access`, хоча скіл на всі чотири посилався. Скіл підставляв порожнечу і мовчав. Паралельно промпт scheduled task далі кликав стару назву. Звідси два правила: (1) перейменування двигуна не завершене, поки кожне `{config.xxx}` з його тіла не знайдене у конфігу; (2) при перейменуванні перевіряються ВСІ промпти scheduled tasks на стару назву.

Заморожені скіли (компонент пішов клієнту) отримують у description "OUT OF SCOPE since <дата>: HISTORICAL REFERENCE ONLY. Trigger ONLY when the user explicitly asks". Це тримає знання про кодову базу, не даючи скілу спрацьовувати проактивно.

### Аудит
Місячний хмарний Skill Health Check порівнює кожен власний скіл з конфігами: суперечності фактам, посилання на неіснуючі шляхи/інструменти, захардкоджені значення, прострочені дата-марковані факти, заморожені скіли з проактивними тригерами, порушення naming, мовчазні дефолти, довгі description. Звіт у Reports DB з таблицею "скіл | розбіжність | серйозність | що виправити".

### Установка і синхронізація
- Cowork: Settings → Cowork → Skills → Upload skill (папка або `.skill` zip).
- Після зміни SKILL.md на диску: повторний upload або редагування через Cowork; хмарні сесії бачать синхронізовану копію.
- Локальні `.skill` архіви зберігаються у `~/work/Skills/` і `~/work/<project>/` як бекап.

## Knowledge bases для інженерних скілів

Code review і RCA працюють не по всьому репо, а через локальні knowledge bases: `SYSTEM.md` (як влаштована система), `SDLC.md` (гілки, енви, деплої), KB по компонентах, `LESSONS.md` з датованими уроками після кожного ревʼю. Скіл читає KB, потім тільки файли з diff. Це тримає токени під контролем і накопичує інституційну пам'ять про кодову базу. Для нового проєкту KB створюється один раз (найдорожча операція) і далі дописується.

## Що скілів ще немає (для матриці функцій у `06-pm-functions-coverage.md`)

Retro-фасилітація, sprint planning для Scrum-проєктів (є лише плагінний `sprint-planning`), estimation-документ, бюджет і маржа проєкту в грошах, автоматична публікація у Confluence (є конектор і 5 задуманих use-case, скілів ще немає). Покриті картками: change request (`change-request`), onboarding нового члена команди і stakeholder map (`project-lifecycle` + колонки стейкхолдерів у конфігу).

## Наскрізні правила: один блок замість копії в кожному скілі

Правила, які мають діяти в усіх скілах одразу, живуть у `projects/SKILL.md`, а не дублюються по тілах. Скіли читають цей файл на Step 0, бо вже посилаються на нього по Default Project Rule.

| Правило | Що робить | Додано |
|---|---|---|
| Rule Zero | конфіг перемагає текст скіла | v0.1 |
| Default Project Rule | ніколи не вгадувати проєкт | v0.1 |
| Graceful degradation | `api_access: false` не ламає скіл | v0.3 |
| **JQL Isolation Validator** | жоден запит до трекера не йде без `project = {key}`; немає ключа в конфігу - аварійна зупинка | v0.6.0 |
| **Data Completeness header** | кожен звіт починається рядком про стан кожного джерела; `EMPTY` і `FAILED` ніколи не зливаються в одне | v0.6.0 |
| **PM standards і PM Profile** | звіти, prep, метрики, ризики і рішення йдуть за `projects/_standards.md` і секцією `PM Profile` конфігу: правило читача з обов'язковою секцією "Decisions needed", профіль метрик, аґенди за ключем, RAID через `Kind`, стандарт рішення | v0.7.0 |

> **Урок.** Правил у живому `projects/SKILL.md` не виявилось, хоча документи описували їх як діючі: картка не збереглась або була перезаписана наступним збереженням. Відновлено в пакеті v0.7.0. Висновок: стан наскрізного правила перевіряється грепом по синхронізованій копії (`~/.claude/skills/synced/.../projects/SKILL.md`), а не за документацією.

Причина такої конструкції проста: наскрізне правило, скопійоване у десять скілів, розходиться після першої ж правки одного з них. Копія в кожному скілі допустима лише тоді, коли правило справді різне для різних скілів.

**Наслідок для ревізії бібліотеки:** під час проходу по скілах кожен двигун має отримати явне посилання на ці два правила у своєму Step 0. Скіл, який шле незапиданий JQL або друкує звіт без рядка повноти, вважається застарілим, і місячний Skill Health Check тепер це ловить окремим чеком.
