# Developing the dashboard

This is the handoff for whoever picks the dashboard up next, a person or an AI agent, on any machine. Read it together with `README.md` (what it is and how to deploy) and `docs/en/19-dashboard.md` (why it exists and the rules it follows).

## Start in five minutes

```bash
cd tools/dashboard
npm install
npm test        # API, safety and Access against a mock Notion; client rules; WCAG AA contrast
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
| `src/api.js` | queries, the allowed writes (with the 409 conflict check on `expectEdited`), the router; `/api/config` also returns option colors, the turn mapping and freshness thresholds (per project too) and which optional risk dates exist | you add a view or an action |
| `src/automation.js` | `AutomationSource`: the Notion reader for `automation_db` and `runs_db`, and the fixture source for demo and tests | the Automation databases change |
| `src/notion.js` | REST client (API version 2025-09-03), property readers and builders | Notion changes its API |
| `src/schema.js` | property names and default options of the Control Tower databases, including the optional `Trigger Date` and `Last Reviewed` of Risks | document `02` changes |
| `public/js/logic.js` | every rule: whose turn, freshness and stale, the metrics (`METRICS`, one definition each), the queue, health, risks to watch, the next call. Pure functions, tested in `test/logic.mjs` | a number, a list or a rule changes |
| `public/js/dates.js` | the one date rule (`fmtDue`, `fmtAge`, `fmtIn`, `fmtWhen`) and `cleanTitle`, which cuts ISO dates out of titles | dates look different |
| `public/js/i18n.js` | English and Ukrainian strings with plural forms | any text |
| `public/js/net.js` | reads with a local cache, deferred writes with undo, the offline outbox, conflicts | how data moves |
| `public/js/ui.js` | the row (anatomy, hover actions, swipe, long press), quiet rows, metric strip, sheets and the side panel, toast | a component changes |
| `public/js/actions.js` | per entity: what a row shows and its actions; the details sheet, status menu, snooze, stale review, quick add, Inbox routing, ⌘K | an action changes |
| `public/js/views.js`, `public/js/app.js` | the pages; navigation, routing, keys, boot | a page or the shell changes |
| `public/styles.css` | v2 tokens (dark main, light, `data-theme` override, 2.0 names kept as aliases) and components | the look changes; then run `node test/contrast.mjs` |
| `scripts/make-icons.mjs` | renders the PWA icons from 🗼 (needs Playwright) | the icon changes |
| `public/sw.js` | offline shell and last-good API data | you add a static file (add it to `SHELL`, bump `VERSION`) |
| `test/mock-notion.mjs` | in-memory Notion with demo data and the same filter rules as Notion | the API starts using a new endpoint or filter |
| `test/smoke.mjs` | end-to-end API checks | every new API behaviour gets a check |
| `test/logic.mjs`, `test/contrast.mjs` | client rules and strings; WCAG AA of the token pairs in both themes | rules, strings or tokens change |

## Rules the code keeps

1. **Notion is the only store.** The Worker keeps a 30 s read cache in memory and nothing else.
2. **Default Project Rule.** Every create takes an explicit project; the API returns 400 without one. The UI never preselects a project unless the user is already inside that project's view.
3. **Only configured projects and databases.** Reads filter by the configured projects; writes check the record's parent database and its `Project` relation (`guardedPage`, `assertProjectPage`).
4. **Values from the live schema.** `optionsOf()` reads select and status options from Notion; validation and the UI menus use them.
5. **Threads.** A status written here also writes `Manual Status At` and the icon from `schema.threads.icons`. Never write `Collector Status`: only collectors do.
6. **No secrets in code or config files in git.** The token is a Worker secret; IDs live in the git-ignored config.
7. **Colors come from Notion, as dots.** A Notion option color is an 8px dot (`--o-{color}`) in a group header or a sheet, never a pill or a fill; never hard-code a status color. Semantic colors (`--danger`, `--warn`, `--ok`) are text or dots only.
8. **Every rule in one place** (`public/js/logic.js`): one definition per metric, and a click on a number opens the same list. Stale threads (no activity for `stale_days`) are counted nowhere. The turn mapping and thresholds come from the config; the Settings swap only changes this device.
9. **Automation is read-only.** There is no write route for it, and the UI has no run buttons.
10. **Text.** No em dash anywhere (the repository linter rejects it). Example names in demo data and screenshots are neutral or American (Mike, Emily).

## Recipes

**A new read view (for example Topics).** Add the database key to the config example and `schema.js`, a mapper and a query in `api.js`, a `case` in `projectSection`, a page in `views.js` and its route in `app.js`, a `describe()` case in `actions.js`, strings in both languages, data in the mock, a check in `smoke.mjs`.

**A new write action.** Add the route in `handle()`, build values with `buildProps(schemaProps(...))`, validate with `pick(value, await optionsOf(...))`, guard with `guardedPage` and `assertProjectPage`, call it from the UI through `act()` in `net.js` (undo, offline queue and the conflict check come with it) or `api()` (the `X-CT-Request` header is added for you), add a check for both the allowed and the refused case.

**A new metric.** Add an entry to `METRICS` in `public/js/logic.js` (label, formula string, `items()` returning queue entries) from data the overview already loads, strings in both languages, and a check in `test/logic.mjs`. Avoid new Notion queries per project: the overview makes one query per database for all projects.

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
- Topics and Knowledge Base views; global search.
- Push notifications for new 🔴 threads (Web Push from a Cron Trigger).
- Upcoming meetings next to the last ones (the Pacenote module, deferred).
- Retry and run-now for Automation once there is a safe bridge to Cowork (today the page is read-only by design).
