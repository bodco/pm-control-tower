---
name: sentry-assistant
description: "Query and manage issues in a project's self-hosted Sentry via REST API. URL, org and the monitored scope come from the project config; the token is read at runtime from the project's secrets file, never from the config. If the project is not explicitly named, ask (Default Project Rule), even when only one config exists. Use this skill whenever the user mentions Sentry, errors, issues, exceptions, crashes, or wants to look up problems in the application. Triggers on: sentry, помилки, errors, issues, exceptions, краші, crashes, event, sentry issue, подивись помилки, що в sentry, or any combination of a project name with words like error, bug, crash, exception, stack trace. When triggered, execute immediately using the REST API - do not ask for confirmation."
---

# Sentry Assistant

Прямий доступ до Sentry проєкту через REST API.

## Step 0 - Project config, scope and token (always run first)

1. Determine the project from the user's request. If not explicitly named, ask which
   project, listing the configs in `projects/`: never guess, not even when only one
   config is active (Default Project Rule in `projects/SKILL.md`).
2. Read `../projects/{project_slug}.md` relative to this skill's folder (fallback:
   Glob `**/projects/{project_slug}.md`) and `projects/SKILL.md` for the cross-cutting
   rules.
3. If `{config.sentry.url}` is `none`, tell the user this project has no Sentry and stop
   (`Джерела: Sentry SKIPPED (url: none)`).
4. **Token.** It is NOT in the config. Read it at runtime and never print it:

```bash
SENTRY_TOKEN=$(grep '^{config.sentry.token_env}=' {config.sentry.secrets_file} | cut -d= -f2-)
```

5. **Scope.** `{config.sentry.projects_in_scope}` lists the slugs we monitor.
   `{config.sentry.projects_out_of_scope}` lists slugs that exist on the instance but
   belong to the client. Read an out-of-scope slug only on an explicit request, as
   debugging evidence, and never include it in scans, reports or tickets by default.

## Конфігурація

```
SENTRY_URL   = {config.sentry.url}
ORG_SLUG     = {config.sentry.org_slug}
IN SCOPE     = {config.sentry.projects_in_scope}
OUT OF SCOPE = {config.sentry.projects_out_of_scope}
```

`web_fetch` не підтримує кастомні хедери, тому всі запити йдуть через bash і curl:

```bash
curl -s -H "Authorization: Bearer $SENTRY_TOKEN" "{url}"
```

---

## API Довідник

Усі шляхи нижче використовують `{config.sentry.org_slug}` як org, а не зашите ім'я.

### 1. Список проєктів

teams endpoint працює зі скоупом `team:read` (на відміну від org endpoint, який
потребує `org:read`):
```
GET /api/0/organizations/{org_slug}/teams/
```
Кожна team містить масив `projects` з повним переліком slugів.

### 2. Issues (список помилок)

```
GET /api/0/projects/{org_slug}/{project_slug}/issues/
```

Параметри:
- `?query=is:unresolved`
- `?query=is:unresolved level:error`
- `?limit=25`
- `?sort=date` або `?sort=freq`
- `?statsPeriod=24h`

Відоме обмеження self-hosted: не всі інстанси приймають `statsPeriod`. Спершу пробувати
`statsPeriod`, якщо помилка - перейти на явні `start` / `end` у форматі ISO (той самий
підхід у всіх скілах, що читають Sentry).

### 3. Деталі issue

```
GET /api/0/issues/{issue_id}/
```

### 4. Events для issue (stack trace, контекст)

```
GET /api/0/issues/{issue_id}/events/
GET /api/0/issues/{issue_id}/events/latest/
```

### 5. Пошук по тексту помилки

```
GET /api/0/projects/{org_slug}/{project_slug}/issues/?query=TypeError
```

### 6. Змінити статус issue

```
PUT /api/0/issues/{issue_id}/
Body: {"status": "resolved"}  або "ignored"
```

Це єдина записуюча операція скіла. Робити тільки на явне прохання користувача і ніколи
на проєктах поза скоупом: там моніторинг веде клієнт. Правило 5 хвилин з
`projects/SKILL.md`: `resolved`/`ignored` легко відкотити, тому дозволено на прохання;
жодних інших змін у Sentry скіл не робить.

### 7. Статистика проєкту

```
GET /api/0/projects/{org_slug}/{project_slug}/stats/?stat=received&resolution=1h
```

---

## Workflow

### Подивитись останні помилки

1. Взяти slugи з `{config.sentry.projects_in_scope}`
2. `GET /api/0/projects/{org_slug}/{slug}/issues/?query=is:unresolved&sort=date&limit=10`
3. Показати таблицю: ID, назва, events, дата, рівень

### Розібрати конкретну помилку

1. `GET /api/0/issues/{issue_id}/events/latest/` - останній event з повним stack trace
2. Проаналізувати: exception type, message, culprit, stack frames
3. Повернути структурований аналіз: що сталось, де, можлива причина

### Знайти помилки по ключовому слову

1. `GET /api/0/projects/{org_slug}/{slug}/issues/?query={keyword}&limit=10`
2. Відобразити релевантні результати

### Якщо slug невідомий

Спочатку дивитись у конфіг (`projects_in_scope`, `projects_out_of_scope`). Тільки якщо
там його немає - `GET /api/0/organizations/{org_slug}/teams/`.

---

## Формат відповіді

Перший рядок будь-якої відповіді зі зведенням - Data Completeness header з
`projects/SKILL.md` (напр. `Джерела: Sentry OK (2 проєкти у скоупі)` або
`Джерела: Sentry FAILED (401)`).

Для списку issues завжди таблиця:
| ID | Помилка | Events | Перший раз | Останній раз | Рівень |
|----|---------|--------|------------|--------------|--------|

Для деталей issue:
- **Тип виключення** та повідомлення
- **Місце** (файл, рядок, функція)
- **Stack trace** (скорочений, найважливіші фрейми)
- **Контекст** (HTTP запит, user, теги якщо є)

Якщо в результат потрапив проєкт поза скоупом, позначити це явно: "поза нашим
моніторингом, відповідальність клієнта".

---

## Примітки

- 401 або 403: токен міг протухнути або йому бракує скоупу. Повідомити користувача і
  назвати файл, де лежить токен, але НІКОЛИ не друкувати саме значення
- Ніколи не класти токен у звіт, сторінку Notion, тікет або повідомлення в чаті