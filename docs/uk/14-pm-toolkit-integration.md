# 14. PM Toolkit у Control Tower: стандарти для всіх проєктів і для всього життя проєкту

> Усі частини збережені в живій системі: `projects.skill` v0.7.2 завантажено, картки `project-lifecycle`, `change-request`, `risk-register`, `client-report` збережено, синхронізовані копії звірені з чернетками побайтно. Жоден з нових скілів ще не пройшов реальний прогін на проєкті: перший плановий запуск health check 2026-10-02.

## 1. Рішення і навіщо

ПМ погодив напрям: PM Toolkit з Notion перестає бути лише бібліотекою для людини і стає стандартом, за яким працюють скіли на всіх проєктах.

Стан до цього дня:
- Toolkit фізично жив у Control Tower (Knowledge Base / Project Management / PM Toolkit), але жоден скіл на нього не посилався: пошук по синхронізованих скілах не знайшов ні ID його сторінок, ні Charter, RAID чи Stakeholder Register, ні секції "рішення від читача" у звітах.
- У конфігу не було полів під його артефакти: контракт, кап годин, SLA, decision rights, стейкхолдери.
- `06-pm-functions-coverage.md` п'ять разів описував прогалину як "є шаблон у PM Toolkit, вручну" (домени 2, 4, 11, 17, 21).

Сенс рішення: методологія, яку ПМ знає і так (метрики, аґенди, RAID, Change Request, KT, health check), має працювати однаково на кожному проєкті без того, щоб ПМ щоразу згадував і дублював шаблони. Скіли беруть стандарт з одного місця, а проєкт уточнює його у своєму конфігу.

## 2. Архітектура: три шари

| Шар | Де | Що тримає | Хто править |
|---|---|---|---|
| Стандарти, однакові для всіх проєктів | `projects/_standards.md` | каталог метрик з порогами 🚩, профілі під фазу, каденс, аґенди мітингів з ключами, правило читача для звітів, мінімум документів за кейсом A/B/C, early warning signals, RAID, стандарт рішення, правило естімації | Claude за погодженням, на прогоні на оптимізацію |
| Профіль проєкту (стан) | секція `PM Profile` у `projects/<slug>.md` + колонки стейкхолдерів у `Team - Client` + ключ `Agenda` у Meetings Schedule | кейс, фаза, підхід, metrics_profile, WIP-ліміт, контракт і кап годин, goodwill-бюджет, SLA, мілстоуни, decision rights (короткий RACI), ID документів (Charter, KT, Extras Log), дата останнього health check | ПМ, того ж дня при зміні (Rule Zero) |
| Методологія ("чому") | Notion PM Toolkit | пояснення, senior-практики, повні шаблони для ручного випадку | ПМ |

Старшинство: конфіг проєкту > `_standards.md` > Toolkit у Notion. Якщо Toolkit і `_standards.md` розійшлися, для скілів правий `_standards.md`, а розбіжність виправляється в одному з двох місць того ж дня. На кожній сторінці Toolkit, що має машинну версію або замінена базою, стоїть синій callout з посиланням; на корені Toolkit таблиця "де що живе".

Наскрізні правила, які діють для всіх двигунів, живуть у `projects/SKILL.md` (див. `04`, "Наскрізні правила"): Rule Zero, Default Project Rule, graceful degradation, JQL Isolation Validator, Data Completeness header і з 0.7.0 "PM standards and PM Profile" (сім правил: правило читача, метрики за профілем, prep за аґендою, Risks DB = RAID, повний запис рішення, стейкхолдери з конфігу, естімейт дає виконавець).

## 3. PM Toolkit на етапах проєкту

Головна ідея: Toolkit працює не як набір шаблонів "на старт", а як супровід усього життя проєкту. На кожному етапі видно, що бере на себе система, а що лишається за ПМом.

| Етап | Що з Toolkit | Що робить система | Що робить ПМ |
|---|---|---|---|
| **0. Pre-start** (до офіційного старту) | Pre-start Checklist | `project-lifecycle` kickoff веде інтерв'ю по чеклісту (контракт і маржа, SOW дослівно, доступи, стейкхолдери, ростер з PTO, підхід доставки) і складає відповіді в PM Profile | відповідає на питання, перевіряє пресейл-естімейти з виконавцями |
| **1. Kickoff** (день 1) | Charter, Stakeholder Register, RACI, Decision Log | чернетка конфігу з шаблону, Workspace і сторінка проєкту в Notion, Current State, Charter з конфігу, перший рядок у Decisions, локальні папки, пакет `projects.skill`, пропозиція автопілоту | вичитує конфіг, завантажує пакет, погоджує scheduled tasks |
| **2. Технічний старт** (тижні 1-2, якщо є розробка) | "Технічний старт з командою розробки" | невідомі NFR стають записами `Kind = Assumption` з датою перевірки; кандидати в one-way рішення стають задачами ПМа; задачі "архітектура на серветці" і spike | організовує експертну увагу на 3-5 несучих рішеннях, фіксує їх у Decisions з `Door = One-way` |
| **3. Стале життя: день** | аґенди daily і клієнтського синку, work item age | prep за ключем `Agenda`, завжди з блоком "рішення, які треба отримати"; застряглі айтеми за профілем метрик | веде мітинги до рішень, розблоковує |
| **3. Стале життя: тиждень** | метрики flow і якості, RAID, early warning signals | `weekly-overview`, `jira-board-health`, `risk-register` веде весь RAID (ризики, припущення, issues, залежності), сигнали клієнта і команди з цитатами, bus factor | читає, вирішує пріоритети, ескалує |
| **3. Стале життя: місяць** | Client Monthly, Steering / Exec Update, дашборд метрик, Health Check | 1-ше: Monthly Digest, Client Satisfaction, Automation Health Check; 2-ге: **Project Health Check** по кожному активному проєкту (8 областей RAG з доказами, ⚪ де даних немає); `client-report` monthly і steering з годинами проти капу і "Decisions Needed From You" | вичитує і відправляє звіти вручну, закриває топ-3 з health check |
| **4. Зміни скоупу** (за подією) | Change Request, "Scope creep & гра в маленькі хотєлки" | `change-request`: кожне прохання у відро A (дрібниця, облік) / B (години) / C (торкається даних, грошей, безпеки, публічних контрактів: завжди CR); Extras Log з безкоштовною роботою; чернетка CR англійською; goodwill-бюджет | вирішує, чи брати, відправляє CR, фіксує рішення клієнта |
| **5. Люди** (за подією) | Team Member Onboarding, Bus factor | `project-lifecycle` team-onboarding / offboarding: сторінка онбордингу з доступами як запитами, патч конфігу, рядок у Decisions, перевірка bus factor при відході | робить доступи, призначає buddy, розмовляє з людьми |
| **6. Прийом проєкту** (кейс B) | KT / Handover Checklist | `project-lifecycle` handover-in: KT з доказами, список незадокументованих усних обіцянок з цитатами, письмовий "стан на момент прийому", health check на 10-й день | проводить KT-сесії, перевіряє "все зелено" |
| **7. Перехід у саппорт або закриття** | "Закриття проєкту: від першого дня до handover" | `project-lifecycle` closure: чекліст з доказами (acceptance, loose ends, доступи, фінанси), handover pack, патч конфігу (`phase: support` або `status: archived`), список scheduled tasks на вимкнення | фінальні розмови, фінансовий closeout, renewal |

Що свідомо лишається людським на всіх етапах: сендвіч між клієнтом, компанією і командою, доменна грамотність, стосунки, будь-яке судження про людей. Скіли підсвічують факти з цитатами, висновок робить ПМ. Prep до 1-on-1 не аналізує настрій людини.

## 4. Мапінг Toolkit на систему

| Toolkit | Де живе | Використовує |
|---|---|---|
| Дашборд метрик | `_standards.md` розділи 2-4, `pm_profile.metrics_profile` | `velocity-report`, `jira-board-health`, `weekly-overview`, `daily-team-prep`, `project-lifecycle` health-check |
| Метрики `sla_adherence`, `hours_burn` (нові, у Toolkit їх не було) | `_standards.md` розділ 2, `pm_profile.sla`, `pm_profile.contract.hours_cap_month` | `client-report`, `project-lifecycle` health-check |
| Мітинги: кадеси та аґенди | `_standards.md` розділ 5, колонка `Agenda` | `client-meeting-prep`, `daily-team-prep` |
| Шаблони звітів | правило читача (`_standards.md` розділ 1) | `client-report` (weekly, monthly, steering), `weekly-overview`, `risk-register` External |
| Decision Log | Decisions DB + `Trade-off`, `Review trigger`, `Door` | усі скіли, Monthly Memory Digest, `change-request` |
| RAID Log | Risks DB + `Kind` (Risk / Assumption / Issue / Dependency) | `risk-register`, `project-lifecycle` |
| Stakeholder Register | `Team - Client`: Influence, Interest, Channel, Cadence, Notes | `client-satisfaction-tracker`, `risk-register`, prep-скіли |
| RACI | `pm_profile.decision_rights` | prep-скіли, `change-request`, `client-report` |
| Project Charter | сторінка під сторінкою проєкту, з конфігу | `project-lifecycle` kickoff |
| Pre-start Checklist | Phase 0 у `08`, K1 у `project-lifecycle` | `project-lifecycle` kickoff |
| KT / Handover, Health Check, Team Onboarding, Закриття | режими `project-lifecycle` | ПМ за запитом; health check щомісяця за розкладом |
| Change Request, Scope creep | `change-request`, Extras Log під сторінкою проєкту | ПМ, треди з Category `Scope Change` від `inbox-responder` |
| Технічний старт | режим kickoff (K4) | `project-lifecycle` |
| Senior-практики | early warning signals і bus factor у `_standards.md` розділ 7; no-surprises у правилі читача | `risk-register`, `client-satisfaction-tracker`, `inbox-responder` |

## 5. Що зроблено
### Хвиля 1 (0.7.0): стандарти і схема
- `projects.skill` v0.7.0: новий `_standards.md`; `_template.md` з PM Profile, колонками стейкхолдерів, `Agenda`, повним списком спільних баз і уніфікованими назвами relation; `SKILL.md` з правилами "PM standards and PM Profile" і відновленими JQL Isolation Validator та Data Completeness header; PM Profile у `acme.md` лише з фактами самого конфігу.
- Notion: Decisions DB + `Trade-off`, `Review trigger`, `Door`; Risks DB + `Kind`; callout-и на 8 сторінках Toolkit, таблиця "де що живе" на його корені.
- Документи: цей файл, `08` (Pre-start, PM Profile, Charter, реєстрація через Upload, Claude Projects), `02` приведений до живих схем, `03`, `04`, `06`, `12`, промпт онбордингу нового проєкту (згодом став режимом kickoff у `project-lifecycle`).

### Хвиля 2 (0.7.1): двигуни
- Нові скіли `project-lifecycle` (kickoff, handover-in, health-check, team-onboarding / offboarding, closure) і `change-request` (відра A/B/C, Extras Log, CR, рішення в Decisions, goodwill-бюджет).
- Оновлені `risk-register` (RAID через `Kind`, early warning signals, bus factor, "Decisions needed from you", Assumptions і Dependencies не закриваються мовчанням, виправлена назва title-властивості `Name`) і `client-report` (Steering Update, статус і "Decisions Needed From You" у всіх форматах, години проти капу, "Delivered beyond scope", правило locked template, прибраний проєктний факт з тіла двигуна).

### Доведення (0.7.2): каденс і реєстр
- Health check **щомісяця, не щокварталу** (рішення ПМ): хмарна задача "Project Health Check (monthly)", 2-ге число 05:30 UTC, автоматичне схвалення, одна сторінка на проєкт у Reports DB. `_standards.md` і `project-lifecycle` оновлені під місячний каденс.
- `projects.skill` v0.7.2: поля `goodwill_budget_pct` і `extras_log_page_id` у шаблоні; Gamma `status: archived` (проєкт фактично завершений, рядок у Decisions DB); у `acme.md` виправлено лише підтверджене ПМом (години DevOps за новим контрактом, кап годин).

Нові значення select створюються скілами при першому записі (Notion створює опцію автоматично, так уже сталося з `Monthly Digest` і `Automation Health Check`): Reports `Type` = `Project Kickoff`, `Project Handover`, `Project Health Check`, `Team Change`, `Project Closure`, `Change Request`, `Steering Update`; Reports `Skill` і Tasks Tracker `Source` = `project-lifecycle`, `change-request`.

## 6. Знахідки й уроки

1. **Документація казала, що правило діє, а в живому скілі його не було.** JQL Isolation Validator і Data Completeness header з версії 0.6.1 були відсутні в синхронізованому `projects/SKILL.md`: картка або не збереглась, або її перезаписало наступне збереження. Відновлено в 0.7.0. Урок: стан скіла перевіряється грепом по синхронізованій копії, а не за документацією; після кожного збереження звіряти побайтно.
2. **Шаблон застаріває непомітно.** `_template.md` досі описував розбіжні назви relation через два дні після уніфікації бази. Новий проєкт з такого шаблону тихо не писав би relation. Шаблон тепер посилається на живу схему як на старшу.
3. **Двигун не має знати фактів проєкту.** `client-report` мав у тілі дату і розмір команди Acme, `risk-register` писав у неіснуючу властивість `Risk Name`. Обидва виправлені; Automation Health Check і локальний лінтер скілів (`07`) ловлять цей клас помилок.
4. **Загальна робота лишається загальною.** Коли будується фреймворк, проєктні розбіжності (контракти, години людей) не розбираються попутно: вони йдуть у свій проєктний контекст. Зафіксовано як правило роботи з ПМ.
5. **Бібліотека без проводки мертва.** Toolkit рік жив поруч із системою і не впливав на жоден звіт. Цінність з'явилась, коли стандарт отримав одне машинне місце і правило "двигуни читають його на Step 0".

## 7. Відомі обмеження

- Нові скіли ще не обкатані на реальному проєкті. Перший плановий прогін health check 2026-10-02; `change-request` і режими `project-lifecycle` запускаються за запитом.
- Пороги з позначкою `(калібрувати)` операціоналізовані Claude з якісних формулювань Toolkit. Їх перевіряють на перших реальних звітах.
- У хмарному прогоні без мосту до Mac недоступні Tempo і локальні Jira-конектори: відповідні області health check стають SKIPPED або ⚪, це видно у звіті.
- Двигуни підхоплюють наскрізні правила через посилання на `projects/SKILL.md` у Step 0; явне посилання на `_standards.md` у тілі кожного старого двигуна з'явиться під час ревізії бібліотеки (беклог у `13`).
- PM Profile, колонки стейкхолдерів і `Agenda` у діючих конфігах заповнені частково; поки їх немає, скіли працюють за дефолтом і пишуть `PM Profile: SKIPPED`.

## 8. Далі

| Хвиля | Що | Закриває |
|---|---|---|
| 3 | пороги метрик у `velocity-report` і `jira-board-health` за профілем; `sla_adherence` і `lead_time`; `hours_burn` у місячному звіті; явне читання `_standards.md` у `client-meeting-prep` і `daily-team-prep` (аґенди) | домени 11 і 21 матриці `06` |
| після першого прогону | калібрування порогів за першими health check і risk-register; рішення, чи потрібен `Kind` у зовнішньому звіті ризиків | - |

## 9. Чого не робимо

- Не копіюємо тексти Toolkit у тіла скілів (принцип 6: двигуни окремо від фактів, наскрізні правила в одному місці).
- Не створюємо RAID- і Decision-Log сторінок на проєкт: бази з relation роблять це краще і дають крос-проєктний огляд.
- Не автоматизуємо судження: сендвіч, доменна грамотність, стосунки. Скіл підсвічує сигнал з цитатою, висновок робить ПМ.
- Не вигадуємо цифри: естімейт дає виконавець, гроші лише з цифр ПМа, невідоме = "уточнити".
- Нічого не відправляємо клієнту автоматично.
