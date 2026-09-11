# 02. Notion Control Tower: хаб знань

## Ідея

Notion тут - не вікі і не сховище документів, а структурована пам'ять з базами даних, між якими є відношення. Літо 2025: перша мета була зібрати весь контекст проєкту в одному місці (мітинги, треди, рішення). Спроба користуватись вбудованим Notion AI для аналізу провалилась на складних запитах ("знайди ризики за квартал"). Тому Notion залишився сховищем і хабом, а аналіз перейшов до Claude.

Головний архітектурний вибір: **бази спільні для всіх проєктів, розділення через relation**. Не "папка на проєкт", а одна база Threads, одна Meetings, одна Reports тощо, де кожен запис має relation `Project` (сторінка у Projects DB) і `Workspace` (сторінка у Workspaces DB, тобто клієнт або компанія). Це дає:
- один скіл працює з усіма проєктами, змінюється лише фільтр;
- крос-проєктні огляди (weekly-overview по всіх проєктах) без дублювання;
- ціна: суворе правило "ніколи не змішувати проєкти" (Default Project Rule у `03-project-config.md`).

## Сторінка CONTROL TOWER

Операційний центр ПМа: сторінка, на яку заходиш вранці і перед кожним мітом, і бачиш повну картину. Структура зверху вниз:

**Секція "Мій день"**
- **Inbox** - parking lot для швидких думок. Одним рядком, без деталей. Обробляється раз на день: Route у Tasks Tracker або видалити.
- **Today / This Week** - канбан і список активних задач. Головна робоча в'юшка.
- **Awaiting Reply** - треди (Email, Slack, Other), які чекають відповіді, розділені по типу.

**Секція "Свіжі репорти"**
- Today's Reports - усе, що згенерувалось сьогодні. Перед мітом сюди.
- This Week's Reports - огляд тижня.

**Секція "Здоров'я проєктів"**
- Tasks by Status / Priority (чарти), Threads by Status (чарт), Overdue, Open Risks.

**Навігація** - повні бази для глибокого занурення.

Кнопки швидких дій (Quick Add у Inbox, Tasks) винесені у дві колонки вгорі.

## Бази даних

> Схеми нижче зняті з реальних data source через Notion MCP. Назви властивостей дослівні, з емодзі там, де вони є. Це важливо: скіл, який пише у властивість `Title` замість `Thread Name` або `Workspace` замість `🏛️ Workspaces`, падає або мовчки не записує relation.

### Назви relation

У всіх семи базах relation на Projects DB називається `Project`, на Workspaces DB `Workspace` (однина, без емодзі). Крос-relation між базами теж без емодзі: `Meetings`, `Threads`, `Topics`, `Knowledge Base`, `Inbox`, `Tasks Tracker`. Перевірено живими схемами Risks, Decisions і Tasks Tracker. Попередня таблиця з чотирма варіантами назв (`Projects`, `Workspaces`, `🏛️ Workspaces`, назви з емодзі) історична; скіл або шаблон, що досі її використовує, застарів. Із самої Projects DB зворотні relation мають емодзі (`💬 Meetings`, `📨 Threads`, `🧵 Topics`, `📚 Knowledge Base`), але скіли пишуть з боку дочірніх баз.

### 📨 Threads
Вхідні комунікації з усіх каналів. Одна сторінка = один тред.

> Це первинне джерело, а не індекс. Сюди йде **повний текст** кожного повідомлення і кожної відповіді у тіло сторінки, а не прев'ю. Причина у принципі 10 (`00-manifest.md`): зникла розмова не відновлюється, і будь-який звіт поверх неповних тредів тихо бреше. Саме тому в колекторах стоїть жорстке правило "ніколи не залишати тіло сторінки порожнім" і правило розбиття на блоки по 2000 символів.

| Властивість | Тип | Значення / правило |
|---|---|---|
| `Thread Name` | title | тема треду |
| `Type` | multi_select | Email, Slack, Signal, Zoom, Other |
| `Status` | select | `Spectator Mode` (нас не стосується, спостерігаємо), `Awaiting Reply` (чекають нас), `Replied`, `Need Follow-up` (ми чекаємо їх, треба нагадати), `Closed`, `Claude` (fallback: неоднозначно, потрібна людина) |
| `Category` | select | ставить inbox-responder: Error/Bug, Data Question, Scope Change, Blocker, Status Update, FYI |
| `Context Sources` | multi_select | Sentry, AWS Logs, Jira Board, Topics DB, Knowledge Base, LLM Only (що використав inbox-responder) |
| `Draft Response` | text | чернетка відповіді мовою треду |
| `Description` | text | короткий прев'ю; повний текст тільки у тілі сторінки |
| `Email Link`, `Slack Link` | url | посилання на джерело |
| `Reported at` | date | перше повідомлення |
| `Last Reply Date` | date | останній коментар (оновлює 14-денний review pass) |
| `Follow-Up Check` | formula | галочка "все ок"; знята галочка = потрібен follow-up |
| `ID` | auto-increment | |
| `Project`, `Workspace` | relation | обов'язково |
| `Topics`, `Knowledge Base`, `Tasks Tracker`, `Inbox` | relation | зв'язки з іншими базами |
| Іконка сторінки | 🔴 або порожньо | червона крапка, якщо останній автор не з нашої команди (це іконка сторінки, не властивість) |
| Тіло сторінки | блоки | повний текст треду блоками по 2000 символів |

Правила класифікації статусу живуть у `slack-collector` (Step 3), `Claude` ставиться тільки коли впевненість правила < 70%. Раз на день 14-денний review pass перечитує non-Closed треди, дописує нові коментарі, перекласифіковує статус.

### 💬 Meetings
Пишуться Notion AI Meeting Notes (транскрипт + summary + action items). Далі `notion-meeting-topics` дописує на ту ж сторінку двомовний звіт.

| Властивість | Тип | Значення |
|---|---|---|
| `Meeting Name` | title | має містити впізнаваний суфікс ("Acme Internal Daily", "SG Weekly Thursday Sync"), бо пошук по назві - основний спосіб знайти мітинг без SQL |
| `Date` | date | з часом |
| `Meeting type` | multi_select | Product Discussions, Daily Sync, Sprint Planning, Weekly Team Sync, Internal Daily |
| `Summary` | text | |
| `Project`, `Workspace` | relation | |
| `Topics`, `Tasks Tracker` | relation | |
| `Parent item`, `Sub-item` | relation (self) | серії мітингів |

Транскрипт підтягується лише коли потрібні цитати (client-satisfaction, Gemini-бріфи).

### 🧵 Topics
Наскрізні теми, які тягнуться через кілька мітингів і тредів.

| Властивість | Тип | Правило |
|---|---|---|
| `Topic Name` | title | |
| `Status` | select | Claude, Open, Under Discussion, Resolved |
| `Status 2` | status | Not started, Planned, In progress, Under Review, Done, On Hold, Won't Do; перераховується скілом, не вручну |
| `Priority` | select | High, Medium, Low |
| `Summary` | text | **залишається порожнім**, весь зміст у тілі сторінки |
| `Date`, `Due date` | date | |
| `Meetings`, `Threads`, `Knowledge Base`, `Tasks Tracker`, `Inbox` | relation | без емодзі; невідповідність назви вже ламала скіл |
| `Project`, `Workspace` | relation | |
| `Parent item`, `Sub-item` | relation (self) | ієрархія тем |

Наповнюють: `topic-analyzer`, `weekly-topics-db-update`, Gemini `notion-project-brief`. Особлива сторінка у Topics: **Claude Skills & Prompts** (README бібліотеки скілів і розкладу з дочірніми сторінками документації).

### Decisions (журнал рішень)

| Властивість | Тип | Опції / правило |
|---|---|---|
| `Decision` | title | рішення одним реченням |
| `Date` | date | |
| `Area` | select | Access, Scope, Process, Tech, Team, Client |
| `Context` | text | чому саме так |
| `Source` | url | мітинг або тред |
| `Status` | select | Active, Superseded, Cancelled |
| `Superseded By` | relation (self, DUAL) | нове рішення, яке замінило це |
| `Supersedes` | relation (self, DUAL) | зворотний бік тієї ж пари |
| `Alternatives rejected` | text | що відкинули і чому |
| `Trade-off` | text | від чого свідомо відмовились |
| `Review trigger` | text | за яких умов повертаємось до рішення |
| `Door` | select | One-way (дорого переграти), Two-way (дешево) |
| `Stated by` | text | хто озвучив (текст, а не person: клієнтські люди не є користувачами Notion) |
| `Project`, `Workspace` | relation | |

База має: додано `Alternatives rejected`, `Stated by`, а `Superseded By` з текстового поля став self-relation з парою `Supersedes`. Свідомі відхилення від CONTRACT: `Rationale` не додаємо (його роль виконує `Context`), статусу `Disputed` немає (розбіжність фіксується коментарем, а не станом). Одне текстове значення `Superseded By`, яке існувало до конвертації, збережено у `Context` того рішення з поміткою про відновлення. Додано `Trade-off`, `Review trigger`, `Door` з Decision Log і "Технічного старту" PM Toolkit; окрема сторінка Decision Log на проєкт більше не потрібна (стандарт у `projects/_standards.md` розділ 9, скіли не вигадують trade-off, якщо джерело його не називає). Правила: рішення не видаляються, лише Superseded/Cancelled; будь-яка зміна стану проєкту = рядок тут того ж дня; Monthly Memory Digest дописує пропущені рішення з мітингів.

### 🐳 Reports
Архів усього згенерованого.

| Властивість | Тип | Опції |
|---|---|---|
| `Report Name` | title | `<Назва> - <дата>` |
| `Date` | date | |
| `Type` | select | Weekly Overview, Daily Team Prep, Client Meeting Prep, Stability Scan, Board Health, Velocity Report, Daily Work Report, Client Weekly Report, Client Monthly Report, Risk Register, Client Satisfaction, Company General Report, Deploy Analysis, Monthly Digest, Skill Health Check; з 0.7.x скіли створюють при першому записі: Project Kickoff, Project Handover, Project Health Check, Team Change, Project Closure, Change Request, Steering Update |
| `Skill` | select | weekly-overview, daily-team-prep, client-meeting-prep, stability-scan, jira-board-health, velocity-report, daily-work-report, client-report, risk-register, client-satisfaction-tracker, company-general-report, deploy-analysis; з 0.7.x: project-lifecycle, change-request |
| `Visibility` | select | Internal, External |
| `Summary` | text | 2-3 речення |
| `Project`, `Workspace` | relation | |
| `ID` | auto-increment | |

Опції `Monthly Digest` і `Skill Health Check` створились автоматично при першому записі хмарних routines: Notion створює нову опцію select сам, тому нові типи звітів не треба заводити вручну.

### Risks
Живий реєстр, який веде `risk-register`.

| Властивість | Тип | Опції |
|---|---|---|
| `Name` | title | |
| `Status` | select | Claude, Open, Monitoring, Mitigated, Closed, Realized |
| `Severity` | select | Critical, High, Medium, Low |
| `Likelihood` | select | Almost Certain, Likely, Possible, Unlikely |
| `Category` | select | Technical, Resource, Scope, Client, Dependency, Security, Timeline, External |
| `Visibility` | select | Internal, External, Both |
| `Source` | multi_select | Jira, Slack, Meeting, Email, Manual, Sentry |
| `Owner`, `Summary`, `Mitigation`, `Related Jira` | text | |
| `First Seen`, `Last Updated` | date | |
| `Kind` | select | Risk, Assumption, Issue, Dependency |
| `Project`, `Workspace` | relation | уніфіковано |
| `Topics` | relation | |

Кожен ризик має досьє у тілі: опис, ознаки, вплив, план пом'якшення, тригери ескалації, Signal History. Без сигналів 30+ днів закривається. Visibility визначає, що йде у зовнішній звіт.

### Tasks Tracker: персональна операційна система ПМа
Це не "ще один трекер задач" і не дублікат Jira. Аксіома:

| Критерій | Jira (або трекер клієнта) | Tasks Tracker у Notion |
|---|---|---|
| Для кого | вся команда і стейкхолдери проєкту | тільки ПМ |
| Скоуп | задачі одного проєкту: фічі, баги, спайки | усі задачі ПМа наскрізно: проєкт A, проєкт B, компанійські справи, особисте |
| Цільова функція | статус розробки, прозорість для клієнта | управління персональною ємністю: реалістичне навантаження дня і тижня |
| Чому не об'єднувати | особистим і крос-проєктним таскам ПМа не місце на командній дошці | задачі, розсипані по 3-5 клієнтських трекерах плюс блокнот, не дають побачити сумарний ліміт часу; виникає ілюзія вільного часу і перевантаження |

Три наслідки:
1. Скіли (`daily-team-prep`, `risk-register`, `jira-board-health`) кладуть свої рекомендації ("перевірити гілку", "нагадати про інвойс") саме сюди з полем `Source`, а не у Jira.
2. Зв'язок з Jira тільки референтний: опційне текстове поле `Jira Issue Key` (рішення за ПМ, п. 3 у `13`), без синхронізації. ПМ керує своїм днем у Notion, команда деліверить у Jira.
3. На проєкті без API до трекера клієнта Tasks Tracker стає єдиним місцем, де ПМ бачить свої зобов'язання по цьому проєкту.

| Властивість | Тип | Опції |
|---|---|---|
| `Task name` | title | |
| `Status` | status | To Do, In progress, Under Review, Done, On Hold |
| `Priority` | select | High, Medium, Low |
| `Effort level` | select | Small, Medium, Large |
| `Type` | select | Task, Meeting Note, Email, Slack, Decision, Info, Idea |
| `Source` | select | manual, inbox, daily-team-prep, weekly-overview, client-meeting-prep, jira-board-health, risk-register, stability-scan, client-report, slack-collector; з 0.7.x: project-lifecycle, change-request |
| `Jira Issue Key` | text | референс на тікет, якщо задача повʼязана з бордою. Без синхронізації, лише посилання |
| `Inbox Status` | select | New, Routed |
| `Assignee` | person | |
| `Due date` | date | |
| `Description` | text | |
| `Project`, `Workspace` | relation | |
| `Threads`, `Meetings`, `Topics`, `Knowledge Base`, `Inbox` | relation | |

`Source` - ключ: фільтр "що мені наскидали скіли" проти "що я сам поставив". Правило запису: < 2 хв робити одразу; > 2 хв без дедлайну у Inbox; > 2 хв з дедлайном або контекстом одразу сюди. Зв'язок з Jira референтний через текстове поле `Jira Issue Key`. Двосторонньої синхронізації свідомо немає: ПМ керує своїм днем у Notion, команда деліверить у Jira.

### Inbox
Quick capture (Inbox DB, data source `~~inbox-db`). Обробляється щодня: Route (стає задачею, Inbox Status = Routed) або видалити. Це думки і ідеї самого ПМа; зовнішні вхідні живуть у Threads. Дві різні сутності, об'єднувати не варто.

### 📚 Knowledge Base
Документація: Acme Documentation (THE AUTHORIZER, Scheduled Jobs), Project Management (PM Toolkit: метрики, шаблони, мітинги, senior-практики, KT/Handover Checklist), CV, навчання. Людська частина; скіли сюди майже не пишуть. Виняток: PM Toolkit має машинну версію `projects/_standards.md`, за якою працюють скіли (див. `14`); на сторінках Toolkit стоять callout-и з посиланнями на неї і на бази, що замінюють шаблони.

### Projects і Workspaces
Якірні сторінки. Projects DB: одна сторінка на проєкт. Workspaces DB: одна на клієнта/компанію (Acme, Beta, ...). ID записуються у конфіг і використовуються як relation в усіх інших базах.

### Сторінка Current State (на проєкт)
Дистилят "що зараз відбувається": відкриті питання, заплановані деплої, невирішені треди, останні рішення. Оновлюється щодня інкрементально (`daily-current-state-distillation`, останні 2 дні). Перше, що читає агент або людина після перерви.

### Три часові масштаби пам'яті (щоб не плутати Current State, Topics і Digest)

| Шар | Горизонт | Що це | Коли читати |
|---|---|---|---|
| Current State | гарячий, 48 годин | оперативний зріз "сьогодні-вчора" | щоранку, перед будь-якою дією по проєкту |
| Topics DB | теплий, 1-3 місяці | наскрізні теми і проблеми через мітинги і треди | перед тематичним мітингом, при брифі |
| Monthly Memory Digest (Reports) | холодний, місяць/квартал | ретроспектива для менеджменту, хронічні проблеми, уроки | 1-го числа, при місячному звіті, при передачі проєкту |

## Щоденний workflow з Control Tower

**Ранок (~09:00, після daily-work-report):**
1. Inbox: нові елементи? Обробити за 2 хв.
2. Today's Reports: що вже згенерувалось (щоденний звіт, драфти відповідей, prep).
3. Today / This Week: план дня.
4. Overdue: є прострочене?

**Перед мітом (~16:00, prep-скіли вже відпрацювали):**
1. Today's Reports: відкрити свіжий prep.
2. Нові задачі від prep вже у Tasks Tracker.

**Протягом дня:** думка або задача у Inbox; скіли працюють, задачі з'являються з полем Source.

**Кінець дня:** Inbox triage; закрити виконане; один рядок "що завтра №1". Без аналізу, це робота для ранку.

## Технічні особливості, які треба знати

- **Два Notion-конектори**: офіційний Notion MCP (пошук, fetch, create/update pages, AI search) і локальний REST-конектор `notion` через bridge. Хмарні задачі використовують офіційний; SQL-запити `query_data_sources` вимагають Enterprise-план і не працюють, тому фільтрація робиться через `notion-search` з `data_source_url` + relation.
- **Data source ID проти database ID**: у скілах використовуються `collection://...` ідентифікатори data source, а не URL бази. Вони записані у конфігу проєкту (спільні для всіх проєктів).
- **Ліміт 2000 символів на блок**: тіла тредів і звітів ріжуться на блоки.
- **Назви властивостей мають збігатися дослівно**, інакше relation мовчки не записується (реальний баг з емодзі-префіксами). Після уніфікації емодзі в назвах relation дочірніх баз немає.
- **Клієнтський Notion** (DEV Board у воркспейсі клієнта) - окремий воркспейс, у нього пишемо через CSV-імпорт (`acme-notion-jira-sync`) або через браузер (`thread-ticket-sync`), не через свій MCP.

## Ідентифікатори

| Об'єкт | ID |
|---|---|
| Сторінка CONTROL TOWER | `~~control-tower-page` |
| Reports DB (data source) | `collection://~~reports-db` |
| Threads DB | `collection://~~threads-db` |
| Meetings DB | `collection://~~meetings-db` |
| Topics DB | `collection://~~topics-db` |
| Knowledge Base DB | `collection://~~knowledge-base-db` |
| Risks DB | `collection://~~risks-db` |
| Decisions DB | `collection://~~decisions-db` |
| Inbox DB | `collection://~~inbox-db` |
| Tasks Tracker DB | `collection://~~tasks-tracker-db` |
| Projects DB | `collection://~~projects-db` |
| Workspaces DB | `collection://~~workspaces-db` |
| Skills README (Claude Skills & Prompts) | `~~skills-readme-page` |
| Acme: Project page / Workspace page | `~~project-page` / `~~workspace-page` |
| Acme: Current State page | `~~current-state-page` |

Для нового ПМа ці ID будуть іншими: він створює власний Control Tower (можна дублювати структуру) і записує свої ID у свій конфіг. Скіли не містять ID у тілі, вони беруть їх з конфігу.
