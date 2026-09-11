# 01. Архітектура

## Схема шарів

```
 ШАР 1. ДЖЕРЕЛА (периферія, MCP-конектори і локальні файли)
 ┌────────┬────────┬────────┬──────────┬────────┬────────────┬─────────────┬──────────┐
 │  Jira  │ Slack  │ Gmail  │ Mail.app │ Sentry │ CloudWatch │ Confluence  │ Calendar │
 │ cosmix │        │        │ буфер    │  REST  │ експорти   │ sooperset   │          │
 │ rixbeck│        │        │ на диску │        │ на диску   │             │          │
 └───┬────┴───┬────┴───┬────┴────┬─────┴───┬────┴─────┬──────┴──────┬──────┴────┬─────┘
     │        │        │         │         │          │             │           │
     ▼        ▼        ▼         ▼         ▼          ▼             ▼           ▼
 ШАР 3. МОЗОК: Claude Cowork
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │  Глобальні інструкції Cowork + пам'ять Claude   (хто я, які проєкти, як писати)   │
 │  projects/  реєстр конфігів   (Rule Zero: конфіг перемагає)                       │
 │  Бібліотека скілів: колектори │ prep-скіли │ звіти │ аналітика │ проєктні │ утиліти│
 │  Файлова система Mac (~/work/<project>/): логи, репо, KB, тайм-репорти, .ai/       │
 └───────────────┬──────────────────────────────────────────────┬───────────────────┘
                 │ пише                                          ▲ запускає
                 ▼                                               │
 ШАР 2. ХАБ: Notion CONTROL TOWER                     ШАР 4. АВТОПІЛОТ
 ┌──────────────────────────────────────┐          ┌────────────────────────────────┐
 │ Threads  Meetings  Topics  Decisions │          │ Cowork Scheduled Tasks (Mac)   │
 │ Reports  Risks  Tasks Tracker  Inbox │          │  щоденні / тижневі / місячні   │
 │ Knowledge Base  Projects  Workspaces │          │ Хмарні Routines (Claude Code)  │
 │ + сторінки Current State per project │          │  місячні аудити               │
 └──────────────────────────────────────┘          └────────────────────────────────┘
                 ▲
                 │ читає
 ШАР 5 (опційно). ДРУГИЙ АГЕНТ: Gemini Spark + Notion MCP
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │ notion-project-brief (бріфи з історії)  │ project-decision-qa (QA проти рішень)   │
 │ протокол .ai/ у корені проєкту: tasks/ current.md reports/ investigations/       │
 └──────────────────────────────────────────────────────────────────────────────────┘
                 ▲
 ЛЮДИНА: Bohdan. Пріоритети, рішення, клієнт, арбітраж між агентами.
```

## Той самий фреймворк як потік даних

Шари вище - це статична карта компонентів. Новому ПМу легше зрозуміти систему через рух даних: звідки прийшло і де осіло.

```
 ЗБІР            БУФЕР                СИНТЕЗ                     ПАМ'ЯТЬ                  РІШЕННЯ
 Slack ─────┐                                                                              
 Gmail ─────┼─▶ Threads DB ──┐                                                             
 Mail.app ──┘ (буфер на диску ┤                                                            
               → Threads)    │   prep-скіли ─────────▶ Reports DB ──┐                     
 Календар ─┐                 ├─▶ inbox-responder ────▶ Threads (draft)                    
 Meetings ─┼─▶ Meetings DB ──┤   topic-analyzer ─────▶ Topics DB     ├─▶ CONTROL TOWER ─▶ Людина:
 (Notion AI)                 │   risk-register ──────▶ Risks DB      │   Today's Reports    відправити,
 Jira ─────────────────────▶ ┤   weekly/monthly ─────▶ Reports DB    │   Awaiting Reply     вирішити,
 Sentry, CloudWatch ───────▶ ┤   stability/deploy ───▶ Reports + Jira│   Open Risks         записати
 Репо, KB (диск) ──────────▶ ┘   digest, distillation ▶ Decisions,   │   Tasks Tracker      рішення
                                                        Current State ┘                     ▲
                                                                                            │
                                 конфіг projects/<slug>.md керує кожним кроком ─────────────┘
```

Читати так: усе, що прийшло ззовні, спершу стає записом у базі (Threads/Meetings), потім скіли перетворюють записи на артефакти (prep, драфт, тема, ризик, звіт), артефакти осідають у пам'яті (Reports/Topics/Risks/Decisions/Current State), а людина бачить їх на одній сторінці і діє. Конфіг проєкту визначає фільтри і правила на кожному кроці.

## Ядро і адаптери: що з цього універсальне

Поділ, який знімає питання "чи це фреймворк, чи опис Acme":

| | Ядро (Core PM Framework, ~80%) | Проєктні адаптери (Project Adapters, ~20%) |
|---|---|---|
| Що | Notion Control Tower з 11 базами і relation-моделлю; персональний Tasks Tracker; поштовий конвеєр Mail.app + LaunchAgent; операційний ритм; реєстр `projects/`; скіли-двигуни (колектори, prep, звіти, аналітика); автопілот як механізм | Скіли з префіксом проєкту, скрипти парсингу клієнтських експортів, браузерні експорти з порталів без API, KB кодової бази, специфічні бізнес-звірки |
| Хто змінює | Автор ядра; зміни через версії | ПМ проєкту, коли завгодно |
| Живе | Спільна папка скілів, шаблон Notion, цей фреймворк | `projects/<slug>.md` + скіли `<slug>-*` + `~/work/<slug>/` |
| Приклад Acme | `slack-collector`, `daily-team-prep`, `weekly-overview`, `risk-register`, Reports DB | `acme-beneficiary-audit`, `acme-db-assistant`, `acme-debug` з KB, `authorizer-code-review`, `calyx-export` на іншому проєкті |
| Що з ним при новому клієнті | Береться як є | Пишеться заново під стек клієнта, часто з ручних експортів |

Наслідок для шару 1: джерела нижче - це те, що є на Acme. На іншому проєкті частина з них відсутня або доступна лише через браузер чи файли. Конфіг проєкту явно каже, що доступно (`task_tracker.api_access`, Access Matrix), і двигуни підлаштовуються.

## Шар 1. Джерела

Все, звідки береться інформація. Дві категорії:

**Через MCP-конектори** (Claude звертається напряму):

| Конектор | Що дає | Режим |
|---|---|---|
| Slack (офіційний конектор Claude) | читання каналів і тредів, пошук, надсилання, canvas | read + write (write під контролем людини) |
| Slack (`slack-workspace2`, локальний MCP) | власна read-only інтеграція ПМа на воркспейс наша компанія, коли офіційний конектор недоступний або зайнятий іншим воркспейсом; токен читається з `secrets.env` через `sh -c` у `claude_desktop_config.json` | read |
| Notion | пошук, fetch сторінок, створення і оновлення сторінок у базах | read + write, основний вихід системи |
| Gmail | пошук тредів, читання, чернетки, відповіді | read + draft |
| Google Calendar | події за день (для щоденного звіту) | read |
| Jira (`jira-cosmix`, локальний MCP) | create/update/search/transition/comment/attachment | write |
| Jira (`jira-rixbeck`, локальний MCP) | getTask з повним assignee, статуси, оновлення власника | read |
| Confluence (`confluence-our-company`, локальний MCP) | CQL-пошук, читання, створення, коментарі, вкладення | read + write; **зараз непрацездатний** - URL не оновлено після міграції домену (`13` #43) |
| Control Chrome (локальний MCP) | керування вкладками реального Chrome на Маку (окремо від Claude in Chrome конектора) | read + write під наглядом |
| Sentry | REST API напряму з токеном з конфігу (не MCP) | read + зміна статусів |
| Chrome / built-in browser | автоматизація там, де немає API: Calyx, Signant, клієнтський Notion, Jira REST через JS | read + write під наглядом |
| Figma, Mermaid, IBKR | допоміжні, поза PM-ядром | |

Секрети всіх локальних MCP-серверів вище (крім `notion` і `Control Chrome`, які не потребують окремого токена) мають переїхати на єдиний патерн: значення в `~/work/Secrets/secrets.env`, `claude_desktop_config.json` лише запускає `sh -c` з `grep`/`cut` (як уже зроблено для `slack-workspace2`). Зараз `jira-cosmix`/`jira-rixbeck`/`confluence-our-company` ще тримають токени прямо в JSON - `13` #43.

**Через файлову систему Mac** (Claude читає папки через bridge):

| Шлях (шаблон) | Що там | Хто наповнює |
|---|---|---|
| `~/work/<project>/AWS Logs/` | експорти CloudWatch (JSONL) | ПМ вручну або скрипт |
| `~/work/<project>/Time Reports/` | експорти Tempo для звітів клієнту та естімейтів | ПМ вручну |
| `~/work/<project>/repos/` | локальні клони репозиторіїв (тільки локальні refs, без fetch за проксі) | git |
| `~/work/<project>/Acme Documentation/_ for AI-assisted work/` | knowledge bases для code review і RCA (SYSTEM.md, SDLC.md, KB по компонентах) | Claude + ПМ |
| `~/work/Mail/<account>/incoming/` | буфер листів з Mail.app: JSON + EML, AppleScript + LaunchAgent кожні 15 хв | автоматично |
| `~/work/<project>/.ai/` | протокол другого агента (шар 5) | Gemini + Claude |
| `~/work/Daily Reports/` | локальні копії щоденних звітів | daily-work-report |

Принцип: якщо дані не можна отримати через API, вони з'являються у файловій системі, а Claude читає їх звідти. Це знімає залежність від наявності "правильного" конектора.

Режим "Zero-API Access" (клієнт не дає токенів): трекер клієнта читається через ручний експорт у `~/work/<slug>/exports/` або через браузер; статуси задач відновлюються з action items у Meetings DB і з поштового буфера. Конфіг фіксує `task_tracker.type`, `api_access: false`, `fallback_source`; двигуни при цьому не падають, а працюють з тим, що є (див. `03`, `04`).

## Шар 2. Хаб знань: Notion Control Tower

Одна сторінка-операційний центр і 11 баз даних, спільних для всіх проєктів. Розділення проєктів через relation `Project` (і `Workspace` для клієнта/компанії). Детально у `02-notion-control-tower.md`.

Ролі баз у потоці даних:

| База | Хто пише | Хто читає | Роль |
|---|---|---|---|
| Threads | колектори (Slack, Gmail, Mail.app) | inbox-responder, topic-analyzer, weekly-overview, client-satisfaction, Current State | вхідні комунікації з класифікацією статусу |
| Meetings | Notion AI (транскрипт + summary) | notion-meeting-topics, daily-team-prep, topic-analyzer, risk-register, Monthly digest | пам'ять про зустрічі |
| Topics | topic-analyzer, weekly-topics-db-update, Gemini | всі prep- і звітні скіли, Gemini-бріфи | наскрізні теми, що тягнуться тижнями |
| Decisions | людина, monthly digest, Gemini (notion-project-brief) | Gemini QA, Claude для перевірки констрейнтів | журнал рішень, джерело constraints |
| Reports | усі звітні та prep-скіли | людина, Monthly digest | архів усього згенерованого |
| Risks | risk-register | client-meeting-prep, weekly-overview, digest | живий реєстр ризиків з Visibility |
| Tasks Tracker | людина, prep-скіли (поле Source) | людина | персональна операційна система ПМа: усі його задачі наскрізно по проєктах і поза ними, управління власною ємністю; не дублює Jira |
| Inbox | людина (quick capture) | людина (щоденний triage) | parking lot |
| Knowledge Base | людина, Claude | всі | документація, PM Toolkit, гайди |
| Projects / Workspaces | людина при онбордингу | всі скіли через конфіг | якірні сторінки для relation |
| Current State (сторінка на проєкт) | daily-current-state-distillation | людина, Gemini, будь-який скіл на старті | дистилят "що зараз відбувається" |

## Шар 3. Мозок: Claude Cowork

Три компоненти:

### 3.1 Пам'ять і контекст
- **Глобальні інструкції Cowork** ("PM Workspace"): хто я, таблиця активних проєктів, коротка шпаргалка по дефолтному проєкту. Завантажується у кожну сесію.
- **Пам'ять Claude** (memory): факти про мене, стек, уподобання (мова звітів, заборона em dash, тощо). Живе в акаунті, доступна і в Cowork, і в чаті.
- **Реєстр `projects/`**: синхронізований скіл-інфраструктура з файлом на проєкт. Це не "ще один документ", а єдине джерело правди про стан проєкту (`03-project-config.md`). З 0.7.0 поруч лежить `_standards.md`: стандарти PM Toolkit, спільні для всіх проєктів (`14`).

### 3.2 Бібліотека скілів
50 записів у синхронізованій папці (серед них нові двигуни `project-lifecycle` і `change-request`), синхронізовані між Claude Desktop і хмарними сесіями. Категорії, каталог і анатомія у `04-skills-library.md`. Ключова властивість: скіл-двигун починає з Step 0 (визначити проєкт, прочитати конфіг) і закінчує секцією Report Storage (куди і з якими властивостями зберегти результат).

### 3.3 Виконавче середовище
Cowork дає Claude: файлові інструменти, bash-пісочницю, Python/Node, браузер, MCP-конектори, доступ до папок Mac через bridge. Сесії бувають локальні (Claude Desktop) і хмарні (контейнер, який бачить Mac через bridge). Це впливає на скіли: локальні шляхи `/Users/our-company/...` доступні тільки через bridge, тому скіли описують, як знайти дані в обох режимах.

## Шар 4. Автопілот

Два планувальники:

1. **Cowork Scheduled Tasks** (Claude Desktop, локально на Mac): 15-20 задач з cron-розкладом, кожна - короткий промпт, який викликає скіл(и) для конкретного проєкту і вимагає зберегти результат у Reports DB. Основний робочий автопілот.
2. **Хмарні Routines** (Claude Code Remote): задачі, які не потребують Mac. Зараз шість: місячні Skill Health Check (дрейф скілів проти конфігів), Monthly Memory Digest (дайджест стану кожного активного проєкту з дописуванням незанесених рішень у Decisions DB), Client Satisfaction (1-ше число) і Project Health Check (2-ге число, `project-lifecycle`, `14`); щоденні Acme daily Slack sync і Acme threads -> Jira tickets.

Повний розклад і шаблон промпта у `05-autopilot.md`.

## Шар 5 (опційно). Другий агент: Gemini

Потрібен, коли в Notion накопичується історія, яку Claude не може перечитати за один запит (річний масив транскриптів), і коли треба незалежний QA рішень проти домовленостей. Gemini не пише код і не чіпає файли проєкту, крім своїх у `.ai/`. Взаємодія через файли за протоколом `.ai/CONTRACT.md` з правилом одного писаря. Детально у `09-gemini-optional-layer.md`. Без Gemini фреймворк повністю працездатний: його функції частково закривають Decisions DB, сторінки Current State і Monthly Memory Digest.

## Потоки даних: три наскрізні приклади

### Приклад А. Slack-повідомлення клієнта стає тікетом
1. 07:05 `acme-daily-slack-sync` викликає `slack-collector` за вчора: нові треди у Threads DB зі статусом (Closed / Spectator Mode / Awaiting Reply / Need Follow-up / Replied), червона іконка, якщо останній автор не з нашої команди.
2. Той же запуск робить 14-денний review pass по non-Closed тредах (нові коментарі, перекласифікація) і gap-аналіз "треди без тікетів".
3. 09:12 `daily-process-mail-0910` збирає пошту, потім `inbox-responder` бере треди Awaiting Reply, класифікує, підтягує контекст (Sentry, логи, Jira, Topics), пише драфт відповіді у тред і на сторінку Inbox Review.
4. Вранці ПМ відкриває Control Tower: Awaiting Reply з драфтами, вирішує, що відправити, що перетворити на тікет (`jira-management` або `thread-ticket-sync`).

### Приклад Б. Клієнтський мітинг у вівторок
1. 16:02 `tuesday-client-prep` викликає `client-meeting-prep` для типу "Status Sync" з конфігу: Jira за тиждень, треди, ризики з Risks DB, відкриті питання з попередніх мітингів.
2. Результат у Reports DB з Type = Client Meeting Prep, нові задачі у Tasks Tracker з Source = client-meeting-prep.
3. 17:00 мітинг, Notion AI пише транскрипт і summary у Meetings DB.
4. Після мітингу ПМ кидає посилання у Claude ("міт <url>"), `notion-meeting-topics` дописує двомовний звіт з рішеннями і action items на ту ж сторінку.
5. У понеділок `weekly-topics-db-update` і `weekly-overview` підхоплюють цей мітинг у теми і тижневий огляд; на 1-ше число Monthly Memory Digest перевіряє, чи рішення з мітингу потрапили у Decisions DB, і дописує пропущені.

### Приклад В. Прод впав уночі
1. Четвер 22:10 `stability-scan`: Sentry unresolved по проєктах у скоупі, CloudWatch-логи за тиждень з диска, топ-3 з трейсами, англійський звіт для клієнта, Jira-тікети на нові дефекти, фаза 2 з `acme-debug` для глибокого RCA.
2. ПМ у п'ятницю вранці бачить звіт у Reports DB і тікети на борді, обговорює на Friday Review (prep до якого вже включив ці тікети).
3. Якщо потрібне окреме розслідування, ПМ (або Gemini через бриф) ставить задачу, Claude виконує `acme-debug`, звіт іде у `.ai/reports/` або в Reports DB.

## Що робить систему цілісною

- Один ключ зв'язку між системами: Jira-ключ тікета. Він же у назвах файлів `.ai/`, у Related Jira ризиків, у звітах.
- Одна relation-модель у Notion: усе прив'язане до Project і Workspace.
- Один реєстр конфігів для всіх скілів.
- Одне місце для результатів: Reports DB. Локальні копії лише як дублікат.
- Один арбітр: людина. Агенти ескалюють, не вирішують самі.
