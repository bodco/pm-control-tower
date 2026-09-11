# 10. Setup Guide: як підняти свій Control Tower

Для ПМа, який хоче повторити фреймворк. Оцінка часу: базовий контур за день, автопілот за тиждень.

## Що ви отримуєте від автора (три шари передачі)

| Шар | Що входить | Як адаптувати |
|---|---|---|
| **1. Ядро** | Принципи (`00`, `03`, `11`), `projects/SKILL.md` з правилами реєстру, `projects/_template.md`, шаблон глобальних інструкцій Cowork, структура Notion Control Tower (дублікат шаблону з порожніми базами), цей setup guide | Використовується як є. Змінюються тільки значення у власному конфігу |
| **2. Генеричні скіли (двигуни)** | `slack-collector`, `mac-mail-collector`, `daily-team-prep`, `client-meeting-prep`, `jira-board-health`, `weekly-overview`, `client-report`, `velocity-report`, `risk-register`, `client-satisfaction-tracker`, `notion-meeting-topics`, `topic-analyzer`, `inbox-responder`, `jira-management`, `sentry-assistant`, `deploy-analysis`, `stability-scan`, `thread-ticket-sync`, промпти scheduled tasks | Працюють без змін, якщо стек такий самий (Jira, Slack, Notion, Gmail, Sentry). Для іншого стеку - адаптаційна матриця нижче |
| **3. Проєктні адаптери (приклади)** | `acme-debug`, `acme-db-assistant`, `acme-env-audit`, `authorizer-code-review`, `acme-beneficiary-audit`, `calyx-export` тощо, KB-структура (SYSTEM.md, SDLC.md, LESSONS.md) | Не переносяться. Це зразки, як виглядає адаптер під конкретний стек; для свого проєкту робите свої за тим же шаблоном. Шари 1-2 = ядро (~80%), шар 3 = ваші 20% |

## Крок 1. Інструменти

1. **Claude Max** (на Pro $20 не тестовано: токенів менше, автопілот може не вміщатись). Увімкнути **Cowork mode** у Claude Desktop (macOS).
2. **Notion** з увімкненими AI Meeting Notes (транскрипція мітингів). План: Plus/Business; SQL-запити до баз через MCP потребують Enterprise, фреймворк їх не використовує.
3. Опційно: **Gemini Desktop** (Spark) для шару 5.

## Крок 2. MCP-конектори

| Сервіс | Як підключити | Примітки |
|---|---|---|
| Slack, Notion, Gmail, Google Calendar, Google Drive | офіційні конектори у Claude (Settings → Connectors) | працюють і локально, і в хмарних сесіях |
| Slack (додатковий воркспейс) | локальний MCP-сервер (`slack-workspace2`), конфіг у Claude Desktop | коли офіційний конектор зайнятий іншим воркспейсом; токен читається з `Secrets/secrets.env` через `sh -c`, у JSON немає секрету |
| Jira Server / Data Center | локальний MCP-сервер (два варіанти використано: `jira-cosmix` для запису, `jira-rixbeck` для читання), конфіг у Claude Desktop | на Jira Server 7.x запис повертає косметичну помилку JSON, оновлення проходять; Jira Cloud - офіційний Atlassian MCP; токени читаються з `Secrets/secrets.env` через `sh -c`. Два конектори лишені свідомо: один резервний |
| Confluence Server | локальний MCP-сервер (`confluence-our-company`), конфіг у Claude Desktop | працює; URL `wiki.your-company.com` після міграції домену; токен читається з `Secrets/secrets.env` через `sh -c` |
| Control Chrome | локальний MCP-сервер, окремо від конектора Claude in Chrome | керування вкладками реального Chrome на Маку, без токена |
| Sentry | не MCP: REST API з токеном у конфігу (project:read, event:read, team:read) | self-hosted і SaaS однаково |
| CloudWatch / інші логи | експорт у папку на диску; Claude читає файли | без прямого AWS-доступу з Cowork |
| Chrome | розширення Claude in Chrome або вбудований браузер | для систем без API (клієнтський Notion, портали) |
| Mail.app | AppleScript + LaunchAgent → буфер JSON/EML на диску (`mac-mail-collector`) | для корпоративної пошти не в Gmail |

Порада: підключати по одному і перевіряти простим запитом ("покажи останні 5 повідомлень у #dev") до створення скілів.

## Крок 3. Notion Control Tower

1. Дублювати шаблон сторінки CONTROL TOWER з 11 базами (Inbox, Tasks Tracker, Meetings, Threads, Topics, Knowledge Base, Risks, Reports, Projects, Workspaces, Decisions) або створити за описом у `02-notion-control-tower.md`.
2. Записати data source ID кожної бази (з URL або через Notion MCP fetch) у майбутній конфіг.
3. Створити сторінку клієнта у Workspaces і сторінку проєкту у Projects.
4. Перевірити назви relation-властивостей у Topics (`💬 Meetings`, `📨 Threads`) або привести скіл `topic-analyzer` до своїх назв.

## Крок 4. Пам'ять Claude

1. **Глобальні інструкції Cowork** (Settings → Cowork): блок "PM Workspace" з таблицею проєктів (назва, slug, ключ трекера) і 2-3 правилами (мова звітів, заборонені символи, дефолти). Коротко: усе проєктне живе у конфігу.
2. **Пам'ять Claude**: 3-5 фактів про себе і стиль (роль, компанія, мова внутрішніх і клієнтських документів).
3. **Реєстр `projects/`**: завантажити як скіл папку з `SKILL.md`, `_template.md`, `<slug>.md` (Крок 5).

## Крок 5. Конфіг проєкту

`projects/_template.md` → `projects/<slug>.md`. Деталі кожної секції у `03-project-config.md`, порядок заповнення у `08-new-project-flow.md` Phase 1. Мінімум для старту: General, Access Matrix, Team, Meetings Schedule, трекер, канали, Notion ID, Changelog. Решта "none" до появи.

## Крок 6. Скіли

Стартовий набір на перший день: `daily-team-prep`, `weekly-overview`, `mac-mail-collector`. Логіка: миттєвий ефект без налаштування Sentry, логів і деплоїв. Якщо пошта не в Mail.app, третім іде `slack-collector`.


1. Завантажити генеричні скіли (Settings → Cowork → Skills → Upload). Кожен - папка або `.skill` zip.
2. Прочитати description кожного і за потреби додати свої тригерні слова (мова, сленг команди).
3. Перевірити один скіл вручну: "збери слак <Project> за минулий тиждень". Дивитись на Threads DB: relation, статуси, іконки.
4. Далі по одному: prep до мітингу, weekly-overview. Кожен збій - спершу конфіг, потім скіл.

## Крок 7. Автопілот

Створити scheduled tasks у Cowork за таблицею у `08-new-project-flow.md` Phase 6 (мінімум: sync каналів, prep до внутрішнього синку, prep до клієнтських мітингів, weekly-overview, пошта). Промпт за шаблоном з `05-autopilot.md`. Через тиждень додати board health, ризики, місячні метрики. Mac має бути увімкнений у час запуску.

## Крок 8. Ритуал

Перші два тижні: щоранку 10 хвилин у CONTROL TOWER за схемою з `07-operating-rhythm.md`. Це важливіше за будь-який скіл: система живе, якщо у неї заходять.

## Адаптаційна матриця під інший стек

| Стек колеги | Підхід | Статус (2026-04, оновлено 09) | Складність |
|---|---|---|---|
| Confluence Server (документація) | конектор `confluence-our-company`; use-case: meeting-notes-to-confluence, weekly-status-to-confluence, confluence-search-context, decision-log-to-confluence, release-notes-to-confluence | конектор працює, скіли ще не написані | легко |
| Папка з `.md` / Obsidian замість Notion | Cowork читає файли напряму; бази замінюються на папки з frontmatter; втрачаються relation і в'юшки | готово концептуально | легко, але бідніше |
| Jira Server (задачі) | `jira-cosmix` / `jira-rixbeck` | готово | легко |
| Jira Cloud | офіційний Atlassian MCP | не тестовано | легко |
| Slack + Gmail (комунікації) | офіційні конектори | готово | легко |
| Microsoft Teams / Outlook | немає готового шляху; варіанти: експорт у файли, браузер | не зроблено | середньо |
| Azure DevOps / Linear / ClickUp з API | потрібен MCP або REST через скіл; двигуни залишаються, змінюється Step "Data Sources" | не зроблено | середньо |
| Будь-який трекер клієнта **без API** (Jira Cloud, Linear, Trello, Asana, Monday, клієнтський Notion за SSO/MDM) | `task_tracker.api_access: false` у конфігу; джерела: ручний експорт CSV у `~/work/<slug>/exports/`, браузер (Chrome-скіл за зразком `calyx-export`), action items з Meeting Notes, пошта. Двигуни працюють у режимі деградації | концепція зафіксована, скіли ще не адаптовані | середньо; це найчастіший випадок в аутсорсі |
| Sentry SaaS / Datadog | Sentry так само REST; Datadog - REST зі своїм токеном, треба адаптувати `stability-scan` | частково | середньо |
| GitHub / GitLab замість Bitbucket | локальні клони працюють однаково; PR-ревʼю через API або локальний diff | готово для локального режиму | легко |
| Google Docs замість docx | `client-report` генерує docx; для Docs - через Drive-конектор | не зроблено | легко |

## Типові помилки при розгортанні

1. Почати зі скілів, а не з конфігу і Notion. Скіли без конфігу брешуть, без Notion їм нікуди писати.
0. Очікувати від фреймворку "усе як на Acme" на проєкті без API. Спершу визначити `task_tracker.api_access` і `fallback_source`, потім очікування.
2. Захардкодити факти проєкту у скілі "тимчасово". Через місяць ніхто не пам'ятає, де вони.
3. Увімкнути 10 scheduled tasks у перший день. Результат: 10 незрозумілих звітів і недовіра до системи. По одному.
4. Не заходити у Control Tower вранці. Тоді все, що генерується, нікому не потрібне.
5. Автоматичне надсилання клієнту. Ніколи. Драфти - так, відправка - людина.
6. Забути про приватність: клієнтський контекст у `.ai/` і у скілах не має потрапляти у репозиторії, до яких має доступ клієнт.

## Що ви забираєте з собою (артефакти)

- Ця папка Control Tower (документи 00-13).
- `projects/SKILL.md`, `projects/_template.md`.
- Набір генеричних скілів (шар 2).
- Шаблон глобальних інструкцій Cowork.
- Промпти scheduled tasks (з `~/Documents/Claude/Scheduled/`, знеособлені).
- Презентація воркшопу (AI_PM_Framework_Workshop, квітень 2026) як вступ.
- Notion: сторінка "Claude Skills & Prompts" як зразок README бібліотеки; PM Toolkit (метрики, шаблони, мітинги) у Knowledge Base.

## Портативність: як колега піднімає систему в себе

Раніше тут був список із семи пунктів, які колега мав
зібрати руками. Він застарів: скіли тепер їдуть одним бандлом.

### Де живуть скіли

| Що | Де | Це джерело правди? |
|---|---|---|
| **Скіл в акаунті Cowork** | у хмарі, у сесії читається з `~/.claude/skills/synced/<uuid>/<skill>/` | так, це те, що виконується |
| **Плагін** | `~/.claude/plugins/synced/<uuid>/<plugin>/` | так, для того, хто його встановив |
| **`.skill`-архіви на диску** | локальна папка | ні, історичний склад вихідників, відстає |

### Пакет передачі: два файли і одне посилання

1. **`dist/pm-control-tower.plugin`.** Колега надсилає його собі в чат Claude і
   натискає кнопку встановлення. Усередині 21 знеособлений скіл, `.mcp.json` з
   блоками Jira і Confluence (без значень секретів), `SETUP.md`, `CONNECTORS.md`.
2. **Посилання на публічний шаблон Notion.** Колега дублює його собі.
3. **`templates/secrets.env.example`** (лежить і всередині плагіна): куди класти
   файл секретів і які змінні заповнити.

Далі колега каже Claude «налаштуй плагін pm-control-tower під мене». Вбудований
майстер знаходить усі місця, позначені `~~`, і проводить по них питаннями: ID баз
його Notion, домашня папка, шлях до локального сервера Jira.

### Що НЕ переноситься

- **Секрети.** Ніколи, у жодному вигляді. Тільки назви змінних.
- **Проєктні конфіги.** У плагіні лише `_template.md` і `_standards.md`.
- **Проєктні адаптери** (`acme-*` тощо). На іншому проєкті інший стек і трекер,
  такі скіли пишуться на місці.
- **Код чужих MCP-серверів.** Конфігурація їде, сам сервер Jira колега клонує сам.

### Правило сумісності, перевірене на практиці

Набір їде **цілком або ніяк**. Якщо після встановлення плагіна довантажити
окремим файлом скіл з такою самою назвою, версія з плагіна перекриє його, і скіл
шукатиме конфіги не там, де вони лежать.

Особливо це стосується `projects`: він інфраструктурний, його читають усі інші
скіли на Step 0, і в системі він мусить бути один. Тому **автор дистрибутива не
встановлює власний плагін собі**.

Свої скіли поверх додавати можна, але з власною назвою і префіксом проєкту.

