# 20. Dashboard: install it yourself

This is the step-by-step install of the dashboard (`tools/dashboard`, document [19](19-dashboard.md)) for someone who has never seen it. Plan 20 to 30 minutes. Every step ends with a check, and `npm run doctor` tells you what is still wrong.

The dashboard is optional. The skills, the plugin and the Notion template work without it.

## Contents

1. [What you need](#1-what-you-need)
2. [Get the code and try the demo](#2-get-the-code-and-try-the-demo)
3. [Notion: the integration and access](#3-notion-the-integration-and-access)
4. [Notion: the properties the dashboard reads](#4-notion-the-properties-the-dashboard-reads)
5. [The config](#5-the-config)
6. [Check with doctor](#6-check-with-doctor)
7. [Deploy to Cloudflare](#7-deploy-to-cloudflare)
8. [The login gate: Cloudflare Access](#8-the-login-gate-cloudflare-access)
9. [Install the app on your devices](#9-install-the-app-on-your-devices)
10. [Updates, automatic deploy, rollback](#10-updates-automatic-deploy-rollback)
11. [When something goes wrong](#11-when-something-goes-wrong)
12. [Let Claude walk you through it](#12-let-claude-walk-you-through-it)

## 1. What you need

| What | Why | Check |
|---|---|---|
| Node.js 18 or newer | install, tests, deploy | `node --version` |
| The PM Control Tower in Notion | the dashboard shows its databases | the [public template](https://bodco.notion.site/pm-control-tower) duplicated into your workspace, or your own hub with the same databases |
| A free Cloudflare account | the Worker that serves the app and talks to Notion | you can log in at dash.cloudflare.com |
| Cloudflare Zero Trust, free plan | the login gate (Access). The sign-up asks for a card even at $0 | Zero Trust opens in the Cloudflare dashboard |
| Optional: a domain hosted in Cloudflare DNS | an address such as `dashboard.example.com` | without it you use the free `*.workers.dev` address |

Nothing runs on your computer after the deploy. The app is a web page from your Worker; your Notion token stays inside the Worker.

## 2. Get the code and try the demo

```bash
git clone https://github.com/bodco/pm-control-tower.git
cd pm-control-tower/tools/dashboard
npm install
npm test        # API and login checks against a mock Notion, rules, doctor, contrast
npm run demo    # http://localhost:8787 with demo data, no Notion, no Cloudflare
```

Open http://localhost:8787. You see two demo projects (Orbit SaaS Launch, Internal Delivery Playbook) with tasks, threads, risks and meetings. Changes in the demo stay in memory until you stop it (Ctrl+C).

**Check:** `npm test` ends with `all pairs pass AA` and no `FAIL` line; the demo opens.

Then create your two private files from the examples:

```bash
npm run setup   # creates config/dashboard.config.json and wrangler.toml
```

Both files are git-ignored. They hold your IDs and your Access settings and must never be committed.

## 3. Notion: the integration and access

1. Open [notion.so/profile/integrations](https://www.notion.so/profile/integrations) > **New integration**. Type: **Internal**. Workspace: the one with your Control Tower.
2. Capabilities: **Read content**, **Update content** and **Insert content** (the dashboard creates tasks, decisions and Inbox notes). No user information is needed.
3. Copy the **Internal Integration Secret**. This is your `NOTION_TOKEN`. Keep it in a password manager; you paste it twice (doctor, then the Worker secret) and never into a file in the repository.
4. Give the integration access to the Control Tower page: open the page > **...** > **Connections** > add your integration (or in the integration settings, tab **Access**, pick the page). Access to a page covers the databases inside it.
5. Do the same for every **Current State** page and every project page that lives outside the Control Tower page.

**Check:** later, `npm run doctor` with the token says `visible` for every database. "The token does not see this database" means step 4 or 5 is missing for that database.

## 4. Notion: the properties the dashboard reads

The property names follow [document 02](02-notion-control-tower.md). The public template has all of them, except the two optional Risks dates. If your names differ, map them under `schema` in the config (step 5) instead of renaming in Notion.

**Required.** Without them the views stay empty or the dashboard reports an error.

| Database | Properties |
|---|---|
| Tasks Tracker | `Task name`, `Status`, `Priority`, `Due date`, `Project` |
| Threads | `Thread Name`, `Status`, `Last Reply Date`, `Project` |
| Meetings | `Meeting Name`, `Date`, `Project` |
| Decisions | `Decision`, `Date`, `Status`, `Project` |
| Risks | `Name`, `Status`, `Severity`, `Project` |
| Reports | `Report Name`, `Date`, `Project` |
| Inbox (optional database) | `Inbox Name`, `Status` |

**Optional.** The dashboard works without them; this is what you lose.

| Database | Property | Type | Without it |
|---|---|---|---|
| Threads | `Manual Status At` | date | a status you set in the dashboard can be overwritten by the next collector run; "Still relevant" in the stale review does nothing |
| Threads | `Collector Status` | text | the collectors cannot tell a status you changed directly in Notion from their own |
| Threads | `Jira Key`, `Email Link`, `Slack Link` | text, url | no links in the details sheet; Ask Claude cannot match related items by Jira key |
| Risks | `Trigger Date` | date | no "in 2d"; risks sort by severity only |
| Risks | `Last Reviewed` | date | no "not reviewed 15d" and no Reviewed action |
| Risks | `Last Updated` | date | changes from the dashboard do not stamp a date |
| Tasks Tracker | `Source` | select | new tasks are created without `manual` or `inbox` |
| Inbox | the whole database | | the Inbox page stays empty and "+" cannot capture notes |
| Automation, Automation runs | two extra databases | | the read-only Automation page says it is not connected ([DEVELOPMENT.md](../../tools/dashboard/DEVELOPMENT.md), "Automation bridge") |

`npm run doctor` prints the same list for your real databases.

## 5. The config

Open `config/dashboard.config.json`. Replace every placeholder; doctor flags each one that is left.

| Key | What to put there |
|---|---|
| `app.title`, `app.locale` | the app name; `en` or `uk` |
| `app.timezone` | your IANA time zone, for example `Europe/Kyiv` or `America/New_York`; "today" and "overdue" follow it |
| `app.turn`, `app.freshness` | leave the defaults unless you changed the thread statuses ([document 19](19-dashboard.md)) |
| `notion.*_db` | the **data source ID** of each database. If you use the plugin, they are the same values as `notion.*` in `projects/<slug>.md`. In Notion: open the database as a full page > **...** > **Manage data sources** > **...** next to the source > **Copy data source ID**. Both `collection://<id>` and the bare ID work |
| `projects[]` | one entry per project you want on the board |
| `projects[].slug` | lowercase, the same as the project config file name (`orbit` for `projects/orbit.md`) |
| `projects[].name`, `short_name`, `color` | the display name, an optional short label, a hex color |
| `projects[].project_page_id` | the project's page in the Projects database: **Copy link**, the 32 characters at the end |
| `projects[].workspace_page_id` | the client or company page in Workspaces (for example Northwind Studio); new tasks and decisions link to it |
| `projects[].current_state_page_id` | optional; the Current State page of the project |
| `schema` | optional overrides of property names, for example `{ "tasks": { "due": "Deadline" } }`; the keys are in `src/schema.js` |

The dashboard shows and changes only the projects listed here. A record of any other project is refused.

## 6. Check with doctor

```bash
NOTION_TOKEN='<your integration secret>' npm run doctor
```

Doctor checks the two files, every placeholder, the Access values in `wrangler.toml`, that the token sees every database and project page, and that the expected properties exist. It never prints the token. Each problem comes with a `fix:` line. The exit code is 1 while anything must be fixed, so you can use it in scripts.

Without `NOTION_TOKEN` doctor checks the files only. On Windows PowerShell: `$env:NOTION_TOKEN='...'; npm run doctor`.

**Check:** the last line says `nothing to fix` (warnings for optional properties are fine) or lists only the Access values, which you fill in at step 8.

## 7. Deploy to Cloudflare

```bash
npx wrangler login                      # opens the browser once
npx wrangler secret put NOTION_TOKEN    # paste the integration secret
npm run deploy
```

`npm run deploy` prints the address, `https://pm-control-tower-dashboard.<your-subdomain>.workers.dev`. To change the name, edit `name` in `wrangler.toml` before the first deploy.

Opening the address now gives `{"error":"Access is not configured ..."}` (HTTP 503). That is correct: the Worker refuses everything until the gate exists.

**Wrangler cannot reach Cloudflare** (a locked network, a proxy, a sandbox: `api.cloudflare.com` is not reachable): run `npm run build:single`, which writes one file, `dist/worker.single.mjs`, with the app embedded. Upload it from a machine or tool that reaches Cloudflare, as an ES module through the API or the Workers editor, keeping the `NOTION_TOKEN` secret ([DEVELOPMENT.md](../../tools/dashboard/DEVELOPMENT.md), "Deploy paths"). The Access values then go into the Worker's variables in the Cloudflare dashboard.

## 8. The login gate: Cloudflare Access

Access puts a login page in front of the whole app; the Worker then verifies the Access token on every request (signature, audience, expiry) and refuses requests that bypass the gate.

1. First time only: open **Zero Trust** in the Cloudflare dashboard, pick a team name (it becomes `<team>.cloudflareaccess.com`) and the Free plan.
2. **workers.dev address:** Workers & Pages > your Worker > **Settings** > **Domains & Routes** > `workers.dev` > enable **Cloudflare Access**. **Own domain:** add it under the same **Domains & Routes** (the zone must be in Cloudflare DNS), then Zero Trust > **Access** > **Applications** > **Add an application** > **Self-hosted**, with that hostname.
3. In the application, set the policy: **Allow**, include **Emails**: only your address (and anyone you really want to let in).
4. Copy the application's **Audience (AUD) tag** (application > Overview or Basic information).
5. In `wrangler.toml` under `[vars]`:
   ```toml
   ACCESS_TEAM_DOMAIN = "<team>.cloudflareaccess.com"
   ACCESS_AUD = "<the AUD tag>"
   ALLOWED_EMAILS = "you@example.com"   # optional second gate, comma separated
   ```
   For an own domain also uncomment `routes = [{ pattern = "dashboard.example.com", custom_domain = true }]`.
6. `npm run deploy` again, then:
   ```bash
   npm run doctor -- --url https://<your address>
   ```

**Check:** doctor says `the URL redirects to the Cloudflare Access login`. In a private browser window the address shows the Access login, and after it the dashboard. In the app, open `/api/config` through the gate: every project is listed and `threadManualStatus` is `true` when Threads has `Manual Status At`.

## 9. Install the app on your devices

| Device | How |
|---|---|
| iPhone, iPad | open the address in **Safari**, log in, **Share** > **Add to Home Screen** |
| Android | open it in **Chrome**, log in, menu > **Install app** (or **Add to Home screen**) |
| Mac, Windows, Linux | Chrome or Edge: the install icon in the address bar, or menu > **Install PM Control Tower** |

The Access login is remembered for the session length set in Zero Trust (24 hours by default). The app keeps the last good data for offline use and says when it shows cached data.

## 10. Updates, automatic deploy, rollback

**Update by hand:**

```bash
git pull
cd tools/dashboard
npm install
npm test
npm run doctor     # new versions may expect new properties
npm run deploy
```

The service worker picks the new version up on the next open; if a device still shows the old one, close the app fully and open it again.

**Automatic deploy (optional).** `.github/workflows/dashboard-deploy.yml.example` deploys on every push to `main` that touches `tools/dashboard/`: tests first, then `wrangler deploy`. It does nothing until you turn it on in your own copy of the repository:

1. Cloudflare > **My Profile** > **API Tokens** > **Create Token** > template **Edit Cloudflare Workers**, or a custom token with only **Account > Workers Scripts > Edit** for your account. Copy the token and your **Account ID** (Workers & Pages overview).
2. GitHub > your repository > **Settings** > **Secrets and variables** > **Actions**, add:

   | Secret | Value |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | the token from step 1 |
   | `CLOUDFLARE_ACCOUNT_ID` | your account ID |
   | `DASHBOARD_CONFIG_B64` | `base64 -i config/dashboard.config.json` (Linux: `base64 -w0 ...`) |
   | `WRANGLER_TOML_B64` | `base64 -i wrangler.toml` |

   `NOTION_TOKEN` stays a Worker secret and is not needed in GitHub.
3. Optional: **Settings** > **Environments** > `dashboard` with yourself as a required reviewer, so every deploy waits for your click.
4. Rename the file to `dashboard-deploy.yml`, commit, push.

When you change the config or `wrangler.toml` later, update the two `_B64` secrets too.

**Rollback:**

```bash
npx wrangler deployments list    # the last versions with their IDs
npx wrangler rollback            # back to the previous version (or: rollback <version-id>)
```

A rollback changes the code only; the Notion data is untouched, since the dashboard stores nothing of its own.

## 11. When something goes wrong

| What you see | Cause | Fix |
|---|---|---|
| `{"error":"Access is not configured ..."}`, HTTP 503 | `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` is empty in the deployed Worker | step 8, then `npm run deploy` |
| HTTP 401 `Missing Access token` | the address is open, but Access is not in front of it | enable Access for this hostname (step 8.2) |
| HTTP 403 `Email not allowed`, or the Access page says you are not allowed | your email is not in the Access policy or in `ALLOWED_EMAILS` | add it in Zero Trust > Access > Applications > policy, and/or in `wrangler.toml` |
| HTTP 403 `Wrong audience` after changing the Access app | `ACCESS_AUD` belongs to another application | copy the AUD tag of the application in front of this hostname |
| The app opens, but lists are empty | the integration does not see the databases, or the projects in the config do not match the `Project` relations | `NOTION_TOKEN=... npm run doctor`; share the page (step 3.4); check `project_page_id` |
| A banner "Notion error (...)" naming a property | a required property is missing or renamed | add it, or map the name under `schema` (step 5) |
| A status you set comes back after a collector run | Threads has no `Manual Status At` / `Collector Status` | add both (step 4) |
| `Unauthorized` from Notion | the token was rotated or mistyped | `npx wrangler secret put NOTION_TOKEN` again |
| `npm run deploy` hangs or fails with a network error to `api.cloudflare.com` | the network blocks Cloudflare's API | `npm run build:single` and upload the file (step 7) |
| "Sorry, you have been blocked" when uploading through the Cloudflare dashboard | the dashboard WAF dislikes some upload bodies | deploy from a machine that reaches `api.cloudflare.com`, or use the API upload |
| A phone still shows the old version | the service worker serves the cached shell | close the app fully and reopen; on iPhone remove and add it again as a last resort |
| A change is refused with "Changed in Notion" | someone edited the record in Notion after the app loaded it | refresh and apply again; this protects the newer edit |

## 12. Let Claude walk you through it

You can do all of the above with Claude (Cowork, or Claude Code in the repository). Claude cannot click in Notion or Cloudflare for you without tools for them, so it guides you, runs the local commands when it has a shell, and checks with doctor. Paste:

```text
Install the PM Control Tower dashboard for me, following
docs/en/20-dashboard-install.md in the pm-control-tower repository.

Rules:
- Go one step at a time. Before each step say what you will do and wait for my OK.
- Run local commands only after I confirm them. Never commit, push or deploy without my explicit OK.
- Never ask me to paste my Notion token or Cloudflare token into the chat.
  When a command needs the token, tell me to type it myself in the terminal.
- For steps in Notion or Cloudflare, give me the exact clicks and wait until I say done.
- After each step run `npm run doctor` (with the token only if I set it in my terminal)
  and show me the FAIL and fix lines.
- If something does not match the document, stop and tell me; do not improvise.

My setup: Notion workspace with the Control Tower already duplicated: <yes/no>.
Cloudflare account: <yes/no>. Own domain in Cloudflare DNS: <yes/no, which>.
Projects to show: <names>.
```

Doctor is the shared truth for you and Claude: a step is done when its doctor lines are green.
