# 16. Step by step: first setup and a new project

This document says what to click and what to type. Two scenarios:

- **Scenario 1.** A colleague has duplicated the Notion template and downloaded the repository. The system does not exist yet.
- **Scenario 2.** The system is already running (as for the author) and a new project starts.

The principle of both: **you do by hand only what Claude technically cannot do.** Notion pages, relations, the config, local folders, project registration and the schedule are done by Claude. The PM answers questions and presses confirmation buttons. Each scenario ends with the full list of manual steps.

Where this comes from: scenario 1 condenses `plugin/SETUP.md` and `10`, scenario 2 runs `08` through the `kickoff` mode of the `project-lifecycle` skill. Those documents describe what is done and why. This one only describes how to start it.

---

## Scenario 1. Setup from scratch (a colleague)

**Time:** 1-1.5 hours to the first prep, about 20 minutes of it by hand.
**You need:** Claude Max, Claude Desktop on macOS with Cowork, Notion (meeting transcripts need the paid AI Meeting Notes), the repository on disk, for example `~/work/pm-control-tower/`.

### Step 1. Connectors (5 min, by hand)

Claude Desktop → Settings → Connectors: switch on **Notion** (required) and **Slack** (if you use it). Gmail and Google Calendar are optional. When connecting Notion, give the integration access to the CONTROL TOWER page you duplicated.

### Step 2. Working folder (1 min, by hand)

Claude Desktop → Cowork → new task → **Add folder** → choose `~/work`. Run every later conversation in tasks with this folder: it holds the repository, the secrets and the project folders.

A Cowork project is optional. If you want the conversations kept together, create one shared "PM Control Tower", not one per client.

### Step 3. Install the plugin (2 min)

In the same task, drag `~/work/pm-control-tower/dist/pm-control-tower.plugin` into the chat and press **Install** on the card.

### Step 4. Customize it (15-20 min, Claude asks, you answer)

Prompt:

```
customize the pm-control-tower plugin for me.
- My Notion Control Tower: the duplicated template, the page is called CONTROL TOWER.
  Find the IDs of all databases yourself through the Notion MCP, do not ask me.
- Home folder: /Users/<me>.
- Jira: <Server at https://... | Cloud | none>. Confluence: <url | none>.
- Create ~/work/Secrets/secrets.env from templates/secrets.env.example (mode 600)
  and tell me which lines to fill in. Do not read or print the tokens.
```

What Claude does: finds the database IDs in your Notion and puts them into the plugin, fills in the `~~` placeholders, creates the secrets file and repackages the plugin. You confirm the cards.

If the Notion MCP cannot see the databases, press **Share** on the CONTROL TOWER page in Notion and give the Claude integration access.

### Step 5. Secrets and Jira (5-10 min, by hand, only for Jira Server / Confluence)

1. Open `~/work/Secrets/secrets.env` and paste the tokens. Claude does not see them and must not.
2. Jira Server: clone the Jira MCP server into the folder Claude named in step 4 (see `plugin/CONNECTORS.md`). You can also say "clone and build the jira MCP server into ~/work/tools" if the network allows.
3. **Restart Claude Desktop.** Local MCP servers read the secrets only at startup.

### Step 6. Global instructions (2 min, by hand)

Settings → Cowork → global instructions: paste a block from `templates/cowork-global-instructions.md`. The projects table stays empty for now; Claude gives you a row for it after every kickoff.

### Step 7. The first project

From here it is scenario 2, starting at step 2. **Do not** create the project pages in Notion by hand. `plugin/SETUP.md` used to ask for that; the kickoff does it now.

### By hand in scenario 1, the full list

| What | Why not Claude |
|---|---|
| Duplicate the Notion template | a public template is duplicated only by a click in the account owner's browser |
| Switch on connectors, give Notion access to the page | account permissions |
| Add folder, Install the plugin, confirm cards | Cowork permissions |
| Paste tokens into `secrets.env` | by rule, secrets never pass through Claude |
| Restart Claude Desktop | otherwise local MCP servers do not see the secrets |
| Paste the global instructions | Claude has no access to account settings |

---

## Scenario 2. A new project when everything is set up

**Time:** 30-45 minutes, mostly answering questions.
**Done by:** the `project-lifecycle` skill, `kickoff` mode (K1-K8).

### Step 1. Have at hand (optional, speeds things up)

The SOW or contract (a file in `~/work/<slug>/` or a link), both teams, the meeting schedule, the tracker key, the Slack channels. Whatever is missing Claude records as "to clarify", to be filled in later.

### Step 2. A new task with the `~/work` folder

Cowork → new task → make sure `~/work` is connected. Without it Claude cannot create the project's local folders.

### Step 3. Prompt

```
set up a new project <Name>, case <A new from scratch | B taking over from another PM | C not software>.
What I know: client <...>, SOW <path or link>, our team <...>, client side <who and roles>,
meetings <day, time, type>, tracker <Jira key | client's own, no API | none>,
Slack <channels | none>, start <date>.
Do everything yourself: config, Notion (Workspace, project page, Current State, Charter,
first decision), local folders, registration. Ask only for what is missing.
```

### Step 4. What happens (you answer questions)

| Stage | What Claude does | What you do |
|---|---|---|
| K1 Pre-start | a short interview: contract, access, stakeholders, approach | answer the question cards |
| K2 Config | drafts `projects/<slug>.md` from `_template.md`, section by section | answer; unknowns stay "to clarify" |
| K3 Notion | finds or creates the Workspace, creates the page in the Projects DB (Status, Start date, Workspace relation), under it Current State and the Project Charter from the PM Toolkit or your own template (`15`), the first Decisions DB row, writes all IDs into the config | if Claude says the tool did not apply the "New project" database template: one click **Template → New project** on the project page |
| K4 Tech start | assumptions as risks (`Kind = Assumption`), "record the decision" tasks, "napkin architecture", a spike | nothing |
| K5 Folders | `~/work/<slug>/` and only the subfolders needed | nothing |
| K6 Registration | builds the updated `projects` package with the new config (plugin: customize flow; standalone skills: `projects.skill`) and a ready row for the global instructions | plugin: confirm the card. Standalone skills: Settings → Skills → Upload the file Claude gives you. Paste the row into the global instructions |
| K7 Autopilot | a table of scheduled tasks: name, schedule in your time zone, cloud or Mac, prompt | say "yes, create them" (all or some) |
| K8 Verification | a Project Kickoff report in the Reports DB: what is done and what waits for you | read the "to clarify" list |

The `Project` / `Workspace` relations, views and tags are done by Claude. Nothing is created by hand in Notion.

### Step 5. Check (5 min, a new task)

1. `prep me for the daily` without a project name. Claude must list all active projects and ask which one. If the new project is missing, the K6 registration is not finished.
2. `prep me for the sync on <slug>`. The prep must land in the Reports DB with the right Project and Workspace, and its first line must show the state of the sources.
3. With Slack: `collect slack for <slug> for last week`.

### Step 6. Variants

- **Case B, taking over from another PM.** Right after the kickoff: `take over project <Name> from <PM>: KT and baseline`. This is the `handover-in` mode: a KT page with evidence, a list of undocumented commitments, a baseline in Decisions, a health check on day 10.
- **Case C, not software.** The same, with `none` for the tracker, repos and Sentry in the config; K4 is skipped.
- **Tracker without an API.** Claude records `api_access: false` and asks where you will put the CSV export. The skills work from the latest export and state its date.

### By hand in scenario 2, the full list

| What | When |
|---|---|
| Answers to the K1-K2 questions | during the kickoff |
| One click on the "New project" template in Notion | only if Claude says the tool did not apply it |
| Upload `projects.skill` or confirm the customize flow | K6 |
| Paste the row into the global instructions | K6 |
| "Yes" on the scheduled tasks | K7 |
| Switch on AI Meeting Notes for the project's meetings and give them a recognizable suffix | before the first meeting (in Notion, outside Claude) |

---

## If something goes wrong

| Symptom | What to do |
|---|---|
| Claude asks for Notion database IDs | the Notion MCP cannot see the page: Share → give the Claude integration access, then "find the IDs yourself again" |
| "Project config not found" after the kickoff | K6 is not finished: the `projects` package was not uploaded, or a separate `projects` skill was uploaded on top of the plugin (not allowed, `10`) |
| The kickoff did not create folders | `~/work` was not connected in the task |
| Records landed without Project / Workspace | the project page IDs in the config are empty: "check the notion IDs in the <slug> config and fill them in" |
| Jira skills see no tools | Claude Desktop was not restarted after the secrets change, or the server name in the config does not match `.mcp.json` |
