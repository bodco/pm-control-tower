# Позначки `~~` і конектори

[In English](CONNECTORS.md)

## Як це працює

`~~щось` це місце, куди підставляється **твоє** значення. Плагін не знає ні твого
Notion, ні твоїх шляхів, тому всі такі місця позначені явно. Позначки живуть лише
у трьох місцях: `.mcp.json`, шаблон конфігу `projects/_template.md` та інструкція
налаштування `mac-mail-collector`. Усе інше скіли читають з конфігу проєкту.

Найпростіше: скажи Claude «налаштуй плагін pm-control-tower під мене». Вбудований
у Claude Cowork механізм налаштування плагінів відкриє встановлений плагін, знайде
всі `~~`, спитає значення і перепакує плагін. (Власного майстра у плагіні немає,
це можливість Cowork. Якщо механізм не запустився, відкрий файли зі списку нижче
і заміни позначки руками.)

## Що треба підставити

| Позначка | Де вона | Що це | Де взяти |
|---|---|---|---|
| `~~home-folder` | `.mcp.json`, `projects/_template.md`, `mac-mail-collector` | твоя домашня папка | `/Users/ivan` |
| `~~notion-reports-db`, `~~notion-threads-db`, `~~notion-meetings-db`, `~~notion-topics-db`, `~~notion-knowledge-base-db`, `~~notion-risks-db`, `~~notion-decisions-db`, `~~notion-tasks-tracker-db` | `projects/_template.md` | ID data source баз у **твоєму** продубльованому шаблоні Notion | відкрий базу як окрему сторінку, ID в URL. Скіли використовують форму `collection://<id>` |
| `~~jira-base-url` | `.mcp.json` | URL твого Jira Server | напр. `https://jira.your-company.com` |
| `~~jira-mcp-path` | `.mcp.json` | куди склонований локальний MCP-сервер Jira | див. нижче |
| `~~confluence-base-url` | `.mcp.json` | URL твого Confluence | напр. `https://wiki.your-company.com` |
| `~~org` | `mac-mail-collector` | префікс імені LaunchAgent для експортера пошти | `com.ivan.mail-collector.plist` |

Усе проєктне (ID сторінок проєкту і воркспейсу, Sentry, канали Slack, борд клієнта,
команда, мітинги) це НЕ позначки: воно йде у твій `projects/<slug>.md`, скопійований
з `projects/_template.md`.

## MCP-сервери в комплекті

У плагіні є `.mcp.json` з двома серверами під спільну інфраструктуру компанії.
Секретів там немає: команда читає значення з твого `secrets.env`.

**Jira** (сервер `jira`) потребує одного кроку руками: склонувати MCP-сервер Jira
і підставити шлях до нього замість `~~jira-mcp-path`. Сам сервер це чужий код, у
бандл він не входить. Скіли написані під набір операцій `search_issues`,
`get_issue`, `create_issue`, `update_issue`, `get_transitions`, `transition_issue`,
`add_comment`, `add_attachment`, `get_epic_children`; автор використовує Node-сервер
саме з такими інструментами (`cosmix/jira-mcp` на GitHub на момент написання;
перевір, що назви інструментів збігаються, перш ніж покладатись). Підійде будь-який
сервер з тими самими операціями: впиши його імʼя у `jira.mcp_write` / `jira.mcp_read`
конфігу проєкту, а розбіжності в назвах операцій занотуй у `jira.known_bug`. Для
Jira Cloud є офіційний конектор Atlassian.

**Confluence** (сервер `confluence`) працює одразу: потрібен лише `uv`
(`brew install uv`), який запускає `mcp-atlassian`, і токен у `CONFLUENCE_TOKEN`.
Жоден скіл цього випуску ще не пише у Confluence; сервер тут для пошуку на вимогу
і для сценаріїв, описаних у документації.

## Офіційні конектори

| Категорія | Для чого | Де вмикати |
|---|---|---|
| Notion | памʼять усієї системи, без неї скіли не мають куди писати | Settings → Connectors |
| Slack | `slack-collector`, `daily-team-prep`, `risk-register`, `client-satisfaction-tracker` | Settings → Connectors |
| Gmail | лише коли у конфігу заповнено `gmail.client_search_filter`; проєктна пошта зазвичай приходить через Mail.app | Settings → Connectors |
| Google Calendar | щоденні звіти і препи, якщо додаси крок календаря у промпт scheduled task | Settings → Connectors |

Для транскриптів у базі Meetings у Notion має бути увімкнено **AI Meeting Notes**:
це платне доповнення Notion, у плагін воно не входить.

Якщо конектора немає, скіли не падають. Вони пишуть у звіт рядок про недоступне
джерело і роблять решту. Це закладено навмисно і називається graceful degradation.
