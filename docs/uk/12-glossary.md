# 12. Глосарій

| Термін | Значення |
|---|---|
| **Control Tower (CT)** | 1) Сторінка-операційний центр у Notion з 11 базами; 2) назва всього фреймворку |
| **Cowork mode** | Режим Claude Desktop з доступом до файлів, bash, браузера, MCP і scheduled tasks. Центр фреймворку |
| **MCP-конектор** | Model Context Protocol: спосіб дати Claude інструменти зовнішньої системи (Slack, Notion, Jira...) |
| **Скіл (skill)** | Папка з `SKILL.md` (frontmatter + інструкції), яку Claude застосовує за тригерами з description |
| **Двигун (engine skill)** | Скіл без префікса проєкту, читає реєстр конфігів, працює з будь-яким проєктом |
| **Проєктний скіл** | Скіл з префіксом `<slug>-`, прив'язаний до одного проєкту |
| **Тумбстоун** | Скіл, залишений після перейменування з description "DEPRECATED... RENAMED to...", нічого не робить |
| **Заморожений скіл (HISTORICAL)** | Скіл для компонента, який пішов клієнту; спрацьовує лише на явний запит |
| **Реєстр `projects/`** | Скіл-інфраструктура з файлом конфігу на проєкт і правилами (Rule Zero, Default Project Rule, Naming) |
| **Rule Zero** | Конфіг перемагає будь-який скіл або документ |
| **Default Project Rule** | Проєкт не названий явно - спитати, не вгадувати |
| **Step 0** | Перший крок кожного двигуна: визначити проєкт, прочитати конфіг |
| **Report Storage** | Секція скіла: куди і з якими властивостями зберегти результат (Reports DB) |
| **Access Matrix** | Секція конфігу: доступ до кожного ресурсу з датами |
| **Engagement Status** | Секція конфігу: модель, команда, скоуп, QA, дати |
| **Metric Continuity** | Попередження у конфігу про непорівнянність метрик через дату зміни команди/скоупу |
| **Former Members** | Таблиця людей, які пішли з проєкту, з датою; не видаляються |
| **Transcript Alias Map** | Як транскрипти перекручують імена → реальні люди |
| **Cultural Profile** | Позиції культур за Erin Meyer (Culture Map) і індивідуальна калібровка учасників клієнта |
| **Downgrader multiplier** | Коефіцієнт серйозності для непрямих формулювань клієнта |
| **Threads** | База вхідних комунікацій (Slack, Email, Other) зі статусами |
| **Awaiting Reply / Need Follow-up / Spectator Mode / Replied / Closed / AI Review** | Статуси тредів |
| **AI Review** | Статус у Threads, Tasks Tracker, Inbox і Risks: запис потребує ревʼю агентом (у старій схемі називався `Claude`) |
| **Червона крапка (🔴)** | Іконка треду, де останній автор не з нашої команди |
| **Topics** | База наскрізних тем через мітинги і треди |
| **Decisions DB / Decision Log** | Журнал рішень; джерело constraints для брифів |
| **Reports DB** | Архів усіх згенерованих звітів з Type, Skill, Visibility |
| **Risks DB** | Живий реєстр ризиків з Visibility (Internal/External/Both) |
| **Tasks Tracker (Personal Operating System)** | База усіх задач ПМа наскрізно по проєктах і поза ними; управління персональною ємністю; не дублює і не синхронізує Jira, зв'язок лише через опційний `Jira Issue Key` |
| **Поле Source** | Хто створив задачу у Tasks Tracker: manual, inbox або назва скіла |
| **Ядро (Core PM Framework)** | ~80% системи, універсальне: Notion CT, Tasks Tracker, поштовий конвеєр, ритм, реєстр конфігів, двигуни |
| **Проєктний адаптер (Project Adapter / Edge Plugin)** | ~20% системи під конкретного клієнта: скіли `<slug>-*`, парсери експортів, браузерні збори, KB. Норма, а не борг |
| **Zero-API Access** | Ситуація, коли клієнт не видає API-токенів до свого трекера/чату; у конфігу `task_tracker.api_access: false` |
| **Graceful degradation** | Поведінка двигуна при відсутньому джерелі: не падати, перейти на `fallback_source`, позначити це у звіті |
| **`task_tracker`** | Секція конфігу: `type` (jira_server, jira_cloud, linear, trello, client_notion, manual), `api_access`, `fallback_source` (manual_export, meeting_action_items, email_summaries) |
| **Current State** | Сторінка-дистилят стану проєкту, оновлюється щодня інкрементально |
| **Scheduled task** | Промпт з cron-розкладом у Cowork (Mac) |
| **Routine** | Хмарна scheduled task (Claude Code Remote), без Mac |
| **Автопілот** | Сукупність scheduled tasks і routines |
| **Prep** | Підготовчий документ до мітингу, згенерований скілом |
| **Automation Health Check** | Місячний хмарний аудит скілів проти конфігів (стара назва Skill Health Check) |
| **Monthly Memory Digest** | Місячний хмарний дайджест стану кожного проєкту з дописуванням рішень у Decisions |
| **Knowledge Base (KB) для коду** | `SYSTEM.md`, `SDLC.md`, KB компонентів, `LESSONS.md` для code review і RCA |
| **RCA** | Root cause analysis; на Acme - `acme-debug` |
| **Frozen snapshot** | Локальний клон і KB компонента, до якого втрачено доступ; read-only історія на дату |
| **Bridge** | Зв'язок хмарної сесії Claude з Mac (файли, локальні MCP) |
| **`.ai/`** | Папка протоколу двох агентів у корені проєкту |
| **CONTRACT.md** | Протокол `.ai/`, пише тільки людина |
| **Single-Writer** | Один писар на файл; виправлення = новий файл |
| **Бриф** | `.ai/tasks/<task_id>.md`, пише Gemini |
| **Звіт** | `.ai/reports/<task_id>.md`, пише Claude |
| **QA-нота** | `.ai/reports/<task_id>.qa-N.md`, пише Gemini |
| **`current.md`** | Вказівник на активну задачу, пише тільки Gemini |
| **`challenged_constraints`** | Секція звіту, де Claude оскаржує застарілі домовленості з доказами |
| **`task_id`** | `<JIRA-KEY>-<slug>` або `NOJIRA-<YYYYMMDD>-<slug>` |
| **Spark** | Режим Gemini Desktop, у якому працюють скіли Gemini |
| **`notion-project-brief`, `project-decision-qa`** | Скіли Gemini: бриф з історії, QA проти рішень |
| **PM Toolkit** | Розділ Notion Knowledge Base: метрики, шаблони звітів і документів, карта мітингів, senior-практики. Має машинну версію `_standards.md` |
| **`_standards.md`** | Файл у скілі `projects`: стандарти, однакові для всіх проєктів (метрики, профілі, аґенди, правило читача, мінімум документів, RAID, рішення). Поступається конфігу проєкту, перемагає Toolkit у Notion (`14`) |
| **PM Profile** | Секція конфігу проєкту: кейс, фаза, підхід, профіль метрик, контракт і кап годин, SLA, мілстоуни, decision rights |
| **Правило читача** | Кожен звіт і prep для людини має статус 🟢🟡🔴, outcomes, ризики з діями і секцію "Decisions needed", навіть порожню |
| **Kind (Risks DB)** | Тип запису RAID: Risk, Assumption, Issue, Dependency; порожнє = Risk |
| **Door (Decisions DB)** | One-way (дорого переграти) або Two-way (дешево) рішення |
| **`project-lifecycle`** | Двигун рідкісних моментів проєкту: kickoff, handover-in, health-check, team-onboarding / offboarding, closure (`14`) |
| **Project Health Check** | Місячний аудит стану проєкту за 8 областями з доказами (2-ге число, хмара). Не плутати з Automation Health Check, який аудитує скіли проти конфігів |
| **`change-request`** | Двигун змін скоупу: відра A / B / C, Extras Log, чернетка CR, рішення в Decisions |
| **Відра A / B / C** | A: дрібниця, лише облік; B: реальні години; C: торкається даних, грошей, безпеки, публічних контрактів, завжди CR незалежно від розміру |
| **Extras Log** | Сторінка під сторінкою проєкту з усіма проханнями клієнта, включно з безкоштовними; основа для goodwill-бюджету і прозорості в місячному звіті |
| **Goodwill-бюджет** | Частка капу годин на безкоштовні дрібниці (`goodwill_budget_pct`, дефолт 10%, калібрувати); перевищення = сигнал scope creep |
| **Locked template** | Еталонний звіт, чия структура перемагає формати `client-report`; нові блоки лише пропонуються ПМу |
| **Правило 5 хвилин** | Межа автономності агента: без підтвердження пише лише туди, де наслідок можна відкотити за 5 хвилин; решта чекає людини (`projects/SKILL.md`) |
| **Tempo** | Тайм-трекінг у Jira; експорти для звітів клієнту та естімейтів |
| **PROJ** | Ключ Jira-проєкту Acme |
