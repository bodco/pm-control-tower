# Developing the dashboard

This is the handoff for whoever picks the dashboard up next, a person or an AI agent, on any machine. Read it together with `README.md` (what it is and how to deploy) and `docs/en/19-dashboard.md` (why it exists and the rules it follows).

## Start in five minutes

```bash
cd tools/dashboard
npm install
npm test        # 17+ checks against a mock Notion: API, safety, Access
npm run demo    # http://localhost:8787 with neutral demo data, no Notion, no Cloudflare
```

`npm run dev` runs the real Workers runtime (`wrangler dev`). Point it at the mock with a `.dev.vars` file (git-ignored):

```
NOTION_TOKEN=test-token
NOTION_API_BASE=http://127.0.0.1:8788
DEV_ALLOW_NO_AUTH=true
```

and start the mock separately: `node -e "import('./test/mock-notion.mjs').then(m=>m.createMock().server.listen(8788))"`. `DEV_ALLOW_NO_AUTH` must never reach a deployed Worker.

## Code map

| File | Responsibility | Change it when |
|---|---|---|
| `src/worker.js` | entry for `wrangler deploy`: auth, `/api`, static files from `public/` | routing or headers change |
| `src/worker-inline.js` | entry for the single-module build (PWA embedded by `scripts/build-single.mjs`) | same as above, keep both in step |
| `src/headers.js` | security headers and CSP for both entries | you load anything from another origin (avoid it) |
| `src/auth.js` | Cloudflare Access JWT check, fails closed | the gate changes |
| `src/api.js` | queries, metrics, the allowed writes, the router; `/api/config` also returns option colors and the turn mapping | you add a view, a metric or an action |
| `src/automation.js` | `AutomationSource`: the Notion reader for `automation_db` and `runs_db`, and the fixture source for demo and tests | the Automation databases change |
| `src/notion.js` | REST client (API version 2025-09-03), property readers and builders | Notion changes its API |
| `src/schema.js` | property names and default options of the Control Tower databases | document `02` changes |
| `public/app.js` | the whole UI: i18n (en, uk), health rule, Start here, views, rows in 6 states, sheets, gestures, keys, settings, routing | anything the user sees |
| `public/styles.css` | 2.0 design tokens (dark-first, light, `data-theme` override, 1.x names kept as aliases), `.o-{color}` option classes and components | the look changes |
| `public/sw.js` | offline shell and last-good API data | you add a static file (add it to `SHELL`, bump `VERSION`) |
| `test/mock-notion.mjs` | in-memory Notion with demo data and the same filter rules as Notion | the API starts using a new endpoint or filter |
| `test/smoke.mjs` | end-to-end checks | every new behaviour gets a check |

## Rules the code keeps

1. **Notion is the only store.** The Worker keeps a 30 s read cache in memory and nothing else.
2. **Default Project Rule.** Every create takes an explicit project; the API returns 400 without one. The UI never preselects a project unless the user is already inside that project's view.
3. **Only configured projects and databases.** Reads filter by the configured projects; writes check the record's parent database and its `Project` relation (`guardedPage`, `assertProjectPage`).
4. **Values from the live schema.** `optionsOf()` reads select and status options from Notion; validation and the UI menus use them.
5. **Threads.** A status written here also writes `Manual Status At` and the icon from `schema.threads.icons`. Never write `Collector Status`: only collectors do.
6. **No secrets in code or config files in git.** The token is a Worker secret; IDs live in the git-ignored config.
7. **Colors come from Notion.** Status and select pills use the option color name from the live schema (`.o-{color}`); never hard-code a status color.
8. **Health and turn are rules in one place** (`health()`, `turnOf()` in `app.js`). The turn mapping comes from `app.turn` in the config; the Settings swap only changes this device.
9. **Automation is read-only.** There is no write route for it, and the UI has no run buttons.
10. **Text.** No em dash anywhere (the repository linter rejects it). Example names in demo data and screenshots are neutral or American (Mike, Emily).

## Recipes

**A new read view (for example Topics).** Add the database key to the config example and `schema.js`, a mapper and a query in `api.js`, a `case` in `projectSection`, a tab in `TABS` and a view in `TAB_VIEWS` in `app.js`, i18n strings in both languages, data in the mock, a check in `smoke.mjs`.

**A new write action.** Add the route in `handle()`, build values with `buildProps(schemaProps(...))`, validate with `pick(value, await optionsOf(...))`, guard with `guardedPage` and `assertProjectPage`, call it from the UI through `patch()` or `api()` (the `X-CT-Request` header is added for you), add a check for both the allowed and the refused case.

**A new metric.** Compute it in `metricsFor()` from data the overview already loads; add a `kpi()` in `projectCard` or the Today tab. Avoid new Notion queries per project: the overview makes one query per database for all projects.

## Automation bridge

The Automation page reads two Notion databases. Both are optional; without them the page says it is not connected.

| Database | Properties |
|---|---|
| `automation_db` | `Name` (title), `Kind` (select: Scheduled task, Skill), `Summary` (text, why it exists in one sentence), `Schedule` (text, human), `Project` (relation to Projects, empty = General), `State` (select: Active, Manual, Paused, Retired), `Last run` (date), `Last result` (select: Done, Failed, Running, Abandoned), `Next run` (date), `Source` (select), `Key` (text, trigger id or skill name, for upserts) |
| `runs_db` | `Name` (title), `Automation` (relation), `Started`, `Finished` (dates), `Trigger` (select: Schedule, Manual), `Result` (select as above), `Summary` (text), `Link` (url), `Project` (relation), `Run ID` (text) |

A sync task keeps them current: it lists the Cowork scheduled tasks, upserts one row per task by `Key`, adds a run row for every new last run, and never starts anything. Scheduled tasks stored only in the desktop app are not visible to it; add those rows by hand. Skills are rows with `Kind = Skill`, the project mapping is edited in Notion. To try the UI without Notion, set `"automation": { "fixtures": true }` in the config (the demo does).

## Deploy paths

| Path | Command | When |
|---|---|---|
| Wrangler | `npm run deploy` | your machine reaches `api.cloudflare.com` |
| Single module | `npm run build:single` (all files embedded as base64, see below), then upload `dist/worker.single.mjs` as an ES module through the Cloudflare API (`PUT /accounts/{id}/workers/scripts/{name}`, metadata `main_module`, `keep_bindings: ["secret_text"]`) or the dashboard editor | Wrangler cannot reach Cloudflare (sandboxes, locked networks) |

The single-module build embeds every PWA file as base64: plain HTML and JS inside the upload body can trip the Cloudflare dashboard WAF. If uploads through the dashboard session still return "Sorry, you have been blocked", use `npm run deploy` from a machine that reaches `api.cloudflare.com`.

After any deploy: open `/api/config` through the gate and check that every project is listed and `threadManualStatus` is `true`.

## Roadmap

- Read the project list from the Projects DB (`Slug`, `Current State` properties) instead of the config.
- Upcoming meetings from the calendar next to the last ones, with a link to the matching prep report.
- Topics and Knowledge Base views; global search.
- Push notifications for new 🔴 threads (Web Push from a Cron Trigger).
- Upcoming meetings next to the last ones (the Pacenote module, deferred).
- Retry and run-now for Automation once there is a safe bridge to Cowork (today the page is read-only by design).
