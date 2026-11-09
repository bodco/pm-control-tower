# 20. Дашборд: встановлення самостійно

Це покрокове встановлення дашборда (`tools/dashboard`, документ [19](19-dashboard.md)) для людини, яка бачить його вперше. Закладіть 20-30 хвилин. Кожен крок закінчується перевіркою, а `npm run doctor` каже, що ще не так.

Дашборд необовʼязковий. Скіли, плагін і Notion-шаблон працюють без нього.

## Зміст

1. [Що потрібно](#1-що-потрібно)
2. [Код і демо](#2-код-і-демо)
3. [Notion: інтеграція і доступ](#3-notion-інтеграція-і-доступ)
4. [Notion: властивості, які читає дашборд](#4-notion-властивості-які-читає-дашборд)
5. [Конфіг](#5-конфіг)
6. [Перевірка doctor](#6-перевірка-doctor)
7. [Деплой у Cloudflare](#7-деплой-у-cloudflare)
8. [Вхід через Cloudflare Access](#8-вхід-через-cloudflare-access)
9. [Застосунок на пристроях](#9-застосунок-на-пристроях)
10. [Оновлення, автодеплой, відкат](#10-оновлення-автодеплой-відкат)
11. [Якщо щось не так](#11-якщо-щось-не-так)
12. [Встановлення разом із Claude](#12-встановлення-разом-із-claude)

## 1. Що потрібно

| Що | Навіщо | Перевірка |
|---|---|---|
| Node.js 18 або новіший | встановлення, тести, деплой | `node --version` |
| PM Control Tower у Notion | дашборд показує його бази | [публічний шаблон](https://bodco.notion.site/pm-control-tower) продубльовано у ваш workspace, або ваш хаб із тими самими базами |
| Безкоштовний акаунт Cloudflare | Worker, що віддає застосунок і говорить з Notion | ви входите на dash.cloudflare.com |
| Cloudflare Zero Trust, план Free | вхід (Access). Реєстрація просить картку навіть за $0 | Zero Trust відкривається в дашборді Cloudflare |
| Необовʼязково: домен у Cloudflare DNS | адреса на кшталт `dashboard.example.com` | без нього ви користуєтесь безкоштовною адресою `*.workers.dev` |

Після деплою на вашому компʼютері нічого не працює. Застосунок це веб-сторінка з вашого Worker; токен Notion лишається всередині Worker.

## 2. Код і демо

```bash
git clone https://github.com/bodco/pm-control-tower.git
cd pm-control-tower/tools/dashboard
npm install
npm test        # API і перевірка входу проти mock Notion, правила, doctor, контраст
npm run demo    # http://localhost:8787 з демо-даними, без Notion і Cloudflare
```

Відкрийте http://localhost:8787. Там два демо-проєкти (Orbit SaaS Launch, Internal Delivery Playbook) із задачами, тредами, ризиками й зустрічами. Зміни в демо живуть у памʼяті, поки ви його не зупините (Ctrl+C).

**Перевірка:** `npm test` закінчується рядком `all pairs pass AA` без жодного `FAIL`; демо відкривається.

Потім створіть два приватні файли з прикладів:

```bash
npm run setup   # створює config/dashboard.config.json і wrangler.toml
```

Обидва файли в git-ignore. У них ваші ID і налаштування Access, їх ніколи не можна комітити.

## 3. Notion: інтеграція і доступ

1. Відкрийте [notion.so/profile/integrations](https://www.notion.so/profile/integrations) > **New integration**. Тип: **Internal**. Workspace: той, де ваш Control Tower.
2. Capabilities: **Read content**, **Update content** і **Insert content** (дашборд створює задачі, рішення й нотатки Inbox). Інформація про користувачів не потрібна.
3. Скопіюйте **Internal Integration Secret**. Це ваш `NOTION_TOKEN`. Тримайте його в менеджері паролів: ви вставите його двічі (doctor, потім секрет Worker) і ніколи не у файл у репозиторії.
4. Дайте інтеграції доступ до сторінки Control Tower: сторінка > **...** > **Connections** > додайте інтеграцію (або в налаштуваннях інтеграції, вкладка **Access**, виберіть сторінку). Доступ до сторінки покриває бази всередині неї.
5. Те саме для кожної сторінки **Current State** і кожної сторінки проєкту, що лежить поза сторінкою Control Tower.

**Перевірка:** далі `npm run doctor` із токеном пише `visible` для кожної бази. "The token does not see this database" означає, що для цієї бази пропущено крок 4 або 5.

## 4. Notion: властивості, які читає дашборд

Назви властивостей за [документом 02](02-notion-control-tower.md). Публічний шаблон має їх усі, крім двох необовʼязкових дат у Risks. Якщо ваші назви інші, задайте відповідність у `schema` в конфігу (крок 5), а не перейменовуйте в Notion.

**Обовʼязкові.** Без них списки порожні або дашборд показує помилку.

| База | Властивості |
|---|---|
| Tasks Tracker | `Task name`, `Status`, `Priority`, `Due date`, `Project` |
| Threads | `Thread Name`, `Status`, `Last Reply Date`, `Project` |
| Meetings | `Meeting Name`, `Date`, `Project` |
| Decisions | `Decision`, `Date`, `Status`, `Project` |
| Risks | `Name`, `Status`, `Severity`, `Project` |
| Reports | `Report Name`, `Date`, `Project` |
| Inbox (необовʼязкова база) | `Inbox Name`, `Status` |

**Необовʼязкові.** Дашборд працює без них; ось що ви втрачаєте.

| База | Властивість | Тип | Без неї |
|---|---|---|---|
| Threads | `Manual Status At` | date | статус, поставлений у дашборді, може перезаписати наступний прохід колектора; "Still relevant" у рев'ю застарілих нічого не робить |
| Threads | `Collector Status` | text | колектори не відрізнять статус, змінений вами прямо в Notion, від свого |
| Threads | `Jira Key`, `Email Link`, `Slack Link` | text, url | немає посилань у картці; Ask Claude не знайде повʼязане за ключем Jira |
| Risks | `Trigger Date` | date | немає "in 2d"; ризики сортуються лише за severity |
| Risks | `Last Reviewed` | date | немає "not reviewed 15d" і дії Reviewed |
| Risks | `Last Updated` | date | зміни з дашборда не ставлять дату |
| Tasks Tracker | `Source` | select | нові задачі створюються без `manual` чи `inbox` |
| Inbox | уся база | | сторінка Inbox порожня, "+" не зберігає нотатки |
| Automation, Automation runs | дві додаткові бази | | сторінка Automation (лише читання) каже, що не підключена ([DEVELOPMENT.md](../../tools/dashboard/DEVELOPMENT.md), "Automation bridge") |

`npm run doctor` друкує той самий список для ваших реальних баз.

## 5. Конфіг

Відкрийте `config/dashboard.config.json`. Замініть кожен плейсхолдер; doctor позначає кожен, що лишився.

| Ключ | Що вписати |
|---|---|
| `app.title`, `app.locale` | назва застосунку; `en` або `uk` |
| `app.timezone` | ваш часовий пояс IANA, наприклад `Europe/Kyiv` чи `America/New_York`; від нього залежать "сьогодні" і "прострочено" |
| `app.turn`, `app.freshness` | лишіть як є, якщо не міняли статуси тредів ([документ 19](19-dashboard.md)) |
| `notion.*_db` | **data source ID** кожної бази. Якщо у вас є плагін, це ті самі значення, що `notion.*` у `projects/<slug>.md`. У Notion: відкрийте базу на всю сторінку > **...** > **Manage data sources** > **...** біля джерела > **Copy data source ID**. Працює і `collection://<id>`, і просто ID |
| `projects[]` | один запис на кожен проєкт, який має бути на дошці |
| `projects[].slug` | малими літерами, так само, як назва файлу конфігу проєкту (`orbit` для `projects/orbit.md`) |
| `projects[].name`, `short_name`, `color` | назва, необовʼязкова коротка мітка, hex-колір |
| `projects[].project_page_id` | сторінка проєкту в базі Projects: **Copy link**, 32 символи в кінці |
| `projects[].workspace_page_id` | сторінка клієнта чи компанії у Workspaces (наприклад Northwind Studio); до неї привʼязуються нові задачі й рішення |
| `projects[].current_state_page_id` | необовʼязково; сторінка Current State проєкту |
| `schema` | необовʼязкові заміни назв властивостей, наприклад `{ "tasks": { "due": "Deadline" } }`; ключі в `src/schema.js` |

Дашборд показує і змінює лише перелічені тут проєкти. Запис будь-якого іншого проєкту відхиляється.

## 6. Перевірка doctor

```bash
NOTION_TOKEN='<ваш integration secret>' npm run doctor
```

Doctor перевіряє обидва файли, кожен плейсхолдер, значення Access у `wrangler.toml`, що токен бачить кожну базу й сторінку проєкту, і що очікувані властивості на місці. Токен він ніколи не друкує. До кожної проблеми є рядок `fix:`. Код виходу 1, поки є що виправляти, тож його можна вживати у скриптах.

Без `NOTION_TOKEN` doctor перевіряє лише файли. У Windows PowerShell: `$env:NOTION_TOKEN='...'; npm run doctor`.

**Перевірка:** останній рядок `nothing to fix` (попередження про необовʼязкові властивості це нормально) або в списку лише значення Access, які ви заповните на кроці 8.

## 7. Деплой у Cloudflare

```bash
npx wrangler login                      # один раз відкриває браузер
npx wrangler secret put NOTION_TOKEN    # вставте integration secret
npm run deploy
```

`npm run deploy` друкує адресу `https://pm-control-tower-dashboard.<ваш-піддомен>.workers.dev`. Щоб змінити назву, поправте `name` у `wrangler.toml` до першого деплою.

Якщо зараз відкрити адресу, буде `{"error":"Access is not configured ..."}` (HTTP 503). Так і має бути: Worker відмовляє в усьому, поки немає входу.

**Wrangler не дістає до Cloudflare** (закрита мережа, проксі, пісочниця: `api.cloudflare.com` недоступний): запустіть `npm run build:single`, він пише один файл `dist/worker.single.mjs` із вбудованим застосунком. Завантажте його з машини чи інструмента, що дістає до Cloudflare, як ES-модуль через API або редактор Workers, зберігаючи секрет `NOTION_TOKEN` ([DEVELOPMENT.md](../../tools/dashboard/DEVELOPMENT.md), "Deploy paths"). Значення Access тоді задаються у змінних Worker у дашборді Cloudflare.

## 8. Вхід через Cloudflare Access

Access ставить сторінку входу перед усім застосунком; Worker потім перевіряє токен Access у кожному запиті (підпис, audience, строк дії) і відмовляє запитам в обхід входу.

1. Лише перший раз: відкрийте **Zero Trust** у дашборді Cloudflare, виберіть назву команди (вона стане `<team>.cloudflareaccess.com`) і план Free.
2. **Адреса workers.dev:** Workers & Pages > ваш Worker > **Settings** > **Domains & Routes** > `workers.dev` > увімкніть **Cloudflare Access**. **Власний домен:** додайте його там само в **Domains & Routes** (зона має бути в Cloudflare DNS), потім Zero Trust > **Access** > **Applications** > **Add an application** > **Self-hosted** із цим hostname.
3. У застосунку задайте політику: **Allow**, include **Emails**: лише ваша адреса (і ті, кого справді треба пустити).
4. Скопіюйте **Audience (AUD) tag** застосунку (application > Overview або Basic information).
5. У `wrangler.toml` під `[vars]`:
   ```toml
   ACCESS_TEAM_DOMAIN = "<team>.cloudflareaccess.com"
   ACCESS_AUD = "<AUD tag>"
   ALLOWED_EMAILS = "you@example.com"   # необовʼязкова друга перевірка, через кому
   ```
   Для власного домену ще розкоментуйте `routes = [{ pattern = "dashboard.example.com", custom_domain = true }]`.
6. Знову `npm run deploy`, потім:
   ```bash
   npm run doctor -- --url https://<ваша адреса>
   ```

**Перевірка:** doctor пише `the URL redirects to the Cloudflare Access login`. У приватному вікні браузера адреса показує вхід Access, після нього дашборд. У застосунку відкрийте `/api/config` через вхід: усі проєкти в списку, а `threadManualStatus` дорівнює `true`, якщо в Threads є `Manual Status At`.

## 9. Застосунок на пристроях

| Пристрій | Як |
|---|---|
| iPhone, iPad | відкрийте адресу в **Safari**, увійдіть, **Share** > **Add to Home Screen** |
| Android | відкрийте в **Chrome**, увійдіть, меню > **Install app** (або **Add to Home screen**) |
| Mac, Windows, Linux | Chrome або Edge: іконка встановлення в адресному рядку або меню > **Install PM Control Tower** |

Вхід Access памʼятається на час сесії із Zero Trust (типово 24 години). Застосунок тримає останні добрі дані для офлайну і каже, коли показує кеш.

## 10. Оновлення, автодеплой, відкат

**Оновлення вручну:**

```bash
git pull
cd tools/dashboard
npm install
npm test
npm run doctor     # нові версії можуть чекати нових властивостей
npm run deploy
```

Service worker підхоплює нову версію при наступному відкритті; якщо пристрій ще показує стару, повністю закрийте застосунок і відкрийте знову.

**Автодеплой (необовʼязково).** `.github/workflows/dashboard-deploy.yml.example` деплоїть при кожному push у `main`, що зачіпає `tools/dashboard/`: спершу тести, потім `wrangler deploy`. Він нічого не робить, поки ви не ввімкнете його у своїй копії репозиторію:

1. Cloudflare > **My Profile** > **API Tokens** > **Create Token** > шаблон **Edit Cloudflare Workers**, або власний токен лише з **Account > Workers Scripts > Edit** для вашого акаунта. Скопіюйте токен і **Account ID** (огляд Workers & Pages).
2. GitHub > ваш репозиторій > **Settings** > **Secrets and variables** > **Actions**, додайте:

   | Секрет | Значення |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | токен із кроку 1 |
   | `CLOUDFLARE_ACCOUNT_ID` | ID акаунта |
   | `DASHBOARD_CONFIG_B64` | `base64 -i config/dashboard.config.json` (Linux: `base64 -w0 ...`) |
   | `WRANGLER_TOML_B64` | `base64 -i wrangler.toml` |

   `NOTION_TOKEN` лишається секретом Worker, у GitHub він не потрібен.
3. Необовʼязково: **Settings** > **Environments** > `dashboard`, ви як required reviewer, тоді кожен деплой чекає вашого кліку.
4. Перейменуйте файл на `dashboard-deploy.yml`, закомітьте, запуште.

Коли пізніше змінюєте конфіг чи `wrangler.toml`, оновіть і обидва секрети `_B64`.

**Відкат:**

```bash
npx wrangler deployments list    # останні версії з ID
npx wrangler rollback            # до попередньої версії (або: rollback <version-id>)
```

Відкат змінює лише код; дані в Notion не зачіпаються, бо дашборд нічого свого не зберігає.

## 11. Якщо щось не так

| Що бачите | Причина | Що зробити |
|---|---|---|
| `{"error":"Access is not configured ..."}`, HTTP 503 | у задеплоєному Worker порожні `ACCESS_TEAM_DOMAIN` або `ACCESS_AUD` | крок 8, потім `npm run deploy` |
| HTTP 401 `Missing Access token` | адреса відкрита, але Access перед нею немає | увімкніть Access для цього hostname (крок 8.2) |
| HTTP 403 `Email not allowed`, або сторінка Access каже, що вам не можна | вашої пошти немає в політиці Access чи в `ALLOWED_EMAILS` | додайте в Zero Trust > Access > Applications > policy та/або в `wrangler.toml` |
| HTTP 403 `Wrong audience` після зміни застосунку Access | `ACCESS_AUD` від іншого застосунку | скопіюйте AUD tag того застосунку, що стоїть перед цим hostname |
| Застосунок відкривається, але списки порожні | інтеграція не бачить баз, або проєкти в конфігу не збігаються з relation `Project` | `NOTION_TOKEN=... npm run doctor`; поділіться сторінкою (крок 3.4); перевірте `project_page_id` |
| Банер "Notion error (...)" з назвою властивості | обовʼязкової властивості немає або її перейменовано | додайте її або задайте назву в `schema` (крок 5) |
| Поставлений вами статус повертається після проходу колектора | у Threads немає `Manual Status At` / `Collector Status` | додайте обидві (крок 4) |
| `Unauthorized` від Notion | токен змінено або вписано з помилкою | знову `npx wrangler secret put NOTION_TOKEN` |
| `npm run deploy` висить або падає з мережевою помилкою до `api.cloudflare.com` | мережа блокує API Cloudflare | `npm run build:single` і завантаження файлу (крок 7) |
| "Sorry, you have been blocked" при завантаженні через дашборд Cloudflare | WAF дашборда не любить деякі тіла завантаження | деплой із машини, що дістає до `api.cloudflare.com`, або завантаження через API |
| Телефон показує стару версію | service worker віддає закешовану оболонку | повністю закрийте застосунок і відкрийте; на iPhone в крайньому разі видаліть і додайте знову |
| Зміну відхилено з "Змінено в Notion" | хтось редагував запис у Notion після завантаження в застосунку | оновіть і застосуйте знову; це захищає новішу правку |

## 12. Встановлення разом із Claude

Усе це можна пройти з Claude (Cowork або Claude Code в репозиторії). Без інструментів для Notion і Cloudflare Claude не клікає там за вас, тож він веде вас, запускає локальні команди, коли має shell, і перевіряє doctor. Вставте:

```text
Встанови для мене дашборд PM Control Tower за документом
docs/uk/20-dashboard-install.md у репозиторії pm-control-tower.

Правила:
- Іди по одному кроку. Перед кожним кроком скажи, що зробиш, і чекай мого "ок".
- Локальні команди запускай лише після мого підтвердження. Нічого не коміть, не пуш і не деплой без мого явного "ок".
- Ніколи не проси вставити в чат мій токен Notion чи Cloudflare.
  Якщо команді потрібен токен, скажи мені ввести його самому в терміналі.
- Для кроків у Notion чи Cloudflare дай точні кліки і чекай, поки я скажу "готово".
- Після кожного кроку запускай `npm run doctor` (з токеном, лише якщо я задав його в терміналі)
  і показуй рядки FAIL і fix.
- Якщо щось не збігається з документом, зупинись і скажи; не імпровізуй.

Мій стан: Control Tower уже продубльовано в Notion: <так/ні>.
Акаунт Cloudflare: <так/ні>. Власний домен у Cloudflare DNS: <так/ні, який>.
Проєкти на дошці: <назви>.
```

Doctor це спільна правда для вас і Claude: крок зроблено, коли його рядки doctor зелені.
