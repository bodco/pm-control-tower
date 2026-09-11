# 05. Автопілот: scheduled tasks

## Ідея

Скіл, який запускається вручну, економить час. Скіл, який запускається сам і кладе результат туди, де ти його побачиш, змінює спосіб роботи: ти приходиш до вже готового prep, а не робиш його. Автопілот - це набір коротких промптів з cron-розкладом, кожен з яких викликає один або кілька скілів для конкретного проєкту і вимагає зберегти результат у Reports DB.

## Два планувальники

| | Cowork Scheduled Tasks | Хмарні Routines (Claude Code Remote) |
|---|---|---|
| Де виконується | Claude Desktop на Mac (потрібен увімкнений Mac і застосунок) | хмарний контейнер, Mac не потрібен |
| Доступ до файлів Mac | так, напряму | тільки через bridge, якщо Mac онлайн |
| Локальні MCP (jira-cosmix, jira-rixbeck, notion REST, confluence) | так | через bridge |
| Хмарні конектори (Slack, Notion, Gmail, Calendar) | так | так |
| Де визначено | папка `~/Documents/Claude/Scheduled/<task-id>/SKILL.md` (промпт) + розклад у застосунку | `create_trigger` / `list_triggers` через MCP Claude_Code_Remote |
| Що там зараз | 17 локальних задач по Acme (`proj-weekly-report` видалено) | 6: Skill Health Check (місячно), Monthly Memory Digest (місячно), Client Satisfaction (1-ше), **Project Health Check** (2-ге), **Acme daily Slack sync** (щодня 07:05 Київ), **Acme threads -> Jira tickets** (щодня ~09:15 Київ) |

> ⚠️ **`acme-daily-slack-sync` (локальна) досі активна.** Її двічі просили вимкнути (питання про перенос у хмару, потім самоперевірка), але enable-стан задачі керується тільки застосунком Claude Desktop, і Claude Cowork не може перемкнути його звідси. Перевірка підтвердила: файл давно не редагувався і досі кличе `acme-slack-collector` (перейменований) та `thread-ticket-sync` (теж застаріла назва), тобто щодня або мовчки падає, або дублює роботу двох хмарних Routines вище. Claude замінив тіло промпта на текст-заглушку, яка нічого не робить і пояснює причину, щоб зупинити шкоду до вимкнення, але **саму задачу все одно треба вимкнути або видалити в Claude Desktop → Scheduled Tasks вручну**: заглушка не рівнозначна вимкненню.
| Керування | Cowork → Scheduled Tasks (list / update / enable / run now) | `list_triggers`, `update_trigger`, `fire_trigger`, `delete_trigger` |
| Коли обирати | усе, що читає диск (логи, репо, буфер пошти) або локальні конектори | усе, що працює тільки з хмарними конекторами і має бігти незалежно від Mac |

Історична примітка: у квітні 2026 розглядалась міграція Cowork-автоматизацій на Claude Code Routines (пілот `acme-slack-collector`). Підсумок: локальні залежності (Mail.app буфер, CloudWatch на диску, локальні Jira-конектори) тримають основний автопілот на Mac; у хмару пішли тільки аудити, яким Mac не потрібен.

## Розклад (Acme, локальний час Europe/Kyiv)

### Щоденні
| Час | Task ID | Що робить |
|---|---|---|
| 07:05 щодня | ~~`acme-daily-slack-sync`~~ (локальна, ще не вимкнена руками замінена на заглушку) → **хмарна Routine `Acme daily Slack sync`** | `slack-collector` за вчора і сьогодні з перекриттям, авто-класифікація, 14-денний review pass. Причина переносу: локальний промпт кликав неіснуючий `acme-slack-collector` і збій не діагностувався з хмари. Кроки 2 (JSON) і 4 (Jira) свідомо пропущені в хмарному промпті: немає диска і немає локального Jira MCP |
| ~09:15 щодня (06:15 UTC) | **хмарна Routine `Acme threads -> Jira tickets`**  | Черга (не часове вікно): бере треди з `Jira Sync` порожнім або `Error`, трирівнева перевірка дублів (журнал Notion → якір Slack-permalink у Jira description → смисловий пошук), максимум 10 тредів за прогін, старі треди у беклог на ручне підтвердження. Покриває те, що `slack-collector` Step 4 не може зробити в хмарі |
| 09:01 Пн-Пт | `daily-work-report` | Щоденний робочий звіт українською (календар, мітинги, треди, Jira, Slack; вчора + план на сьогодні) → Reports DB + `~/work/Daily Reports/` |
| 09:12 щодня | `daily-process-mail-0910` | `mac-mail-collector` → `inbox-responder` |
| 09:32 щодня | `inbox-responder` | Драфти відповідей на нові треди (окремий запуск для тредів, що прийшли зі Slack) |
| 11:08 Пн-Пт | `daily-team-prep` | Prep до внутрішнього синку 12:00 (скіл сам визначає за конфігом, чи сьогодні день синку) |
| щодня 15:30 | `daily-current-state-distillation` | Інкрементальне оновлення сторінок Current State усіх активних проєктів (зараз Acme і Beta) за останні 2 дні |
| щодня 15:30 | `deploy-analysis-daily` | Stage vs prod по репо з конфігу за 24 год, тільки локальні refs |
| робочі дні 10/12/14/16/18 | `authorizer-branch-review` | Скан `#autorizer-development` на повідомлення `REVIEW: <гілка>`; якщо є, code review українською у тред; наступні запуски читають відповіді у треді як уточнення і можуть змінити вердикт; якщо нема - миттєвий вихід |

### Тижневі
| Час | Task ID | Що робить |
|---|---|---|
| Пн 06:32 | `weekly-topics-db-update` | Скан Control Tower DBs + Gmail на спільні теми → Topics DB |
| Пн 08:09 | `weekly-overview` | Повний огляд минулого тижня |
| Пн 16:09 | `monday-planning-prep` | `client-meeting-prep` тип Planning перед 17:00 |
| Вт 16:02 | `tuesday-client-prep` | `client-meeting-prep` тип Status Sync |
| Чт 16:04 | `thursday-1-1-prep` | `client-meeting-prep` тип 1-1 (pre-planning) |
| Чт 22:10 | `stability-scan` | Sentry + CloudWatch digest, EN-звіт, Jira-тікети, фаза 2 з acme-debug |
| Пт 16:02 | `friday-review-prep` | `jira-board-health` + `client-meeting-prep` тип Review (два окремі звіти) |
| Пт, у складі review-циклу | `risk-register` | Окремої scheduled task немає: скіл запускається як частина п'ятничного циклу огляду або вручну "перевір ризики" |
| (вимкнено) | `proj-weekly-report` | старий React-звіт, замінений на `weekly-overview`видалити з розкладу, промпт зберегти як приклад у `examples/` |

### Місячні
| Час | Task ID | Де | Що робить |
|---|---|---|---|
| 1-ше 09:00 | `monthly-velocity` | Mac | `velocity-report` за минулий місяць |
| 1-ше 09:00 | `client-satisfaction-bimonthly-1st` | Mac | Повний 30-денний звіт настрою клієнта |
| 15-те 09:00 | `client-satisfaction-bimonthly-15th` | Mac | Mid-month звіт, порівняння з 1-м числом |
| 1-ше 06:00 UTC | `Skill Health Check (monthly)` | хмара | Аудит усіх власних скілів проти конфігів → Reports DB |
| 1-ше 07:00 UTC | `Monthly Memory Digest (all projects)` | хмара | По кожному активному проєкту: дайджест місяця (події, рішення, метрики з застереженнями, ризики, невиконані action items, уроки), дописування незанесених рішень у Decisions DB → Reports DB |
| 2-ге 05:30 UTC | `Project Health Check (monthly)` | хмара, auto | Скіл `project-lifecycle`, режим health-check, по кожному активному проєкту окремо: 8 областей RAG з доказами, ⚪ де даних немає; бере Monthly Digest і Client Satisfaction за 1-ше; Tempo і Jira лише через міст до Mac, інакше SKIPPED; нових ризиків не створює, лише кандидати → Reports DB, Type `Project Health Check` |

### Схема тижня

- **Кожен ранок (Пн-Пт):** slack-sync 07:05 → work-report 09:01 → mail + inbox-responder 09:12 → inbox-responder 09:32 → team-prep 11:08 → мітинг 12:00 → 15:30 current-state + deploy-analysis; branch-review о 10/12/14/16/18.
- **Понеділок:** topics 06:32 + weekly-overview 08:09 + planning-prep 16:09 → планінг 17:00.
- **Вівторок:** status-prep 16:02 → статус 17:00.
- **Четвер:** 1-1 prep 16:04 → 1-1 17:00; stability-scan 22:10.
- **П'ятниця:** board health + review prep 16:02 → review 17:00.
- **1-ше число:** velocity, satisfaction, skill health, memory digest. **15-те:** satisfaction mid-month.

Час prep-скілів навмисно за ~55 хвилин до мітингу: досить, щоб ПМ прочитав і дописав "Мої нотатки до обговорення", але дані ще свіжі.

## Шаблон промпта scheduled task

Промпт має бути коротким і посилатись на скіл, а не переказувати його. Обов'язкові елементи:

```
Use the <skill-name> skill for the <Project> project.
<Період / режим: за вчора / за минулий тиждень / тип мітингу>.
<Особливі умови: тільки локальні refs, не робити fetch; спершу змонтувати папку логів>.
After generating the report, save it to the outputs folder AND to the Notion Reports DB
(see the Report Storage section in the skill for exact properties and DB ID).
The report page in Notion should contain the full report as page content.
```

Проєкт називається явно завжди: це і є спосіб задовольнити Default Project Rule в автономному режимі.

На проєкті з `task_tracker.api_access: false` prep-задачі і weekly-overview працюють так само за розкладом, але їхній промпт має додаткове речення: "Трекер без API: використовуй fallback з конфігу і познач у звіті дату останнього експорту". Якщо ручний експорт старший за 3 дні, скіл каже про це першим рядком, а не мовчить.

Для дорогих задач - явна економія токенів на початку промпта: "Спершу легкий скан; репо, KB і генерацію чіпай ТІЛЬКИ якщо є необроблений тригер; якщо нема - швидко вийди" (`authorizer-branch-review`). Для інкрементальних - "тільки останні 2 дні, не пересканувати історію" (`daily-current-state-distillation`).

Хмарні Routines вимагають повністю самодостатнього промпта (свіжа сесія без пам'яті розмови): де знайти скіли і конфіги (Glob по `**/projects/*.md`), які data source ID, які властивості сторінки, якою мовою відповідати, що надіслати користувачу наприкінці.

## Mac-bound проти Cloud-eligible (план міграції)

| Залишаються на Mac (читають диск або локальні конектори) | Кандидати у хмарні Routines (тільки хмарні конектори) |
|---|---|
| `daily-process-mail-0910` (буфер Mail.app) | `weekly-overview` |
| `deploy-analysis-daily`, `authorizer-branch-review`, `acme-env-audit` (локальні git refs) | `client-satisfaction-bimonthly-1st` / `-15th` |
| `stability-scan` (CloudWatch-експорти на диску) | `monthly-velocity` |
| `daily-work-report` (пише у `~/work/Daily Reports/`) | вже там: Skill Health Check, Monthly Memory Digest |
| prep-задачі: можуть у хмару, якщо Jira доступна хмарним конектором | `daily-current-state-distillation` (тільки Notion); **`Acme daily Slack sync` (перенесено в хмару)**; **`Acme threads -> Jira tickets` (нова хмарна задача, не міграція: Jira-запис через `jira-cosmix`, локальний MCP)** |

**Крон у хмарі рахується в UTC.** "07:05 за Києвом" це `5 4 * * *` улітку і `5 5 * * *` узимку; без ручної правки двічі на рік усі хмарні задачі зсуваються на годину. Локальний планувальник десктопа працює у локальному часі і цієї проблеми не має. Рішення не прийняте (питання 42 у `13`).

Ризик, який рецензія назвала явно: після пробудження Mac прострочені задачі можуть запуститись лавиною і перевантажити ліміти. Поки рішення одне: не запускати вручну все підряд, а дивитись, чого справді бракує у Today's Reports.

## Куди падають результати

1. **Notion Reports DB** - завжди (Type, Skill, Date, Summary, Project, Workspace, повний текст).
2. **Локальна папка outputs** сесії - дублікат для Cowork-задач; для daily-work-report ще й `~/work/Daily Reports/`.
3. **Побічні ефекти у зовнішні системи** - обмежені і явні: Jira-тікети від stability-scan, сторінки у Threads/Topics/Risks/Decisions, коментарі у Slack-треді від authorizer-branch-review (тільки як відповідь на явний `REVIEW:`), CSV для клієнтського Notion. Нічого не надсилається клієнту автоматично.

## Що ламається і як це видно

- Mac заснув або застосунок закритий - локальні задачі не виконались. Видно з порожньої секції Today's Reports вранці. Рішення: `Run now` у Cowork.
- Хмарна задача не бачить Mac - вона і не повинна; якщо задачі потрібен диск, вона має бути локальною.
- Скіл застарів відносно конфігу - Skill Health Check покаже 1-го числа; між аудитами сигнал - дивні імена людей або компонентів у звітах.
- Notion повернув помилку 2000 символів або relation мовчки не записалась - видно у звіті скіла ("saved with warnings") або відсутністю сторінки; перевірити назви властивостей.
- `git fetch` у хмарі висить - проксі; скіл має працювати тільки з локальними refs.

## Шпаргалка команд керування

Cowork (Mac): відкрити Scheduled Tasks у застосунку: список, увімкнути/вимкнути, змінити cron або промпт, Run now. Створення нової задачі: через застосунок або скіл `schedule`.

Хмара (у будь-якій сесії Claude): `list_triggers` (стан і остання спроба), `update_trigger` (cron, промпт, enabled), `fire_trigger` (запустити зараз), `delete_trigger`. Cron у UTC.
