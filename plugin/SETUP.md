# Setup, step by step

[Українською](SETUP.uk.md)

Roughly an hour to the first working result. Calibrating it fully to your own
project takes a few more evenings, and that is normal.

## Step 1. Notion

Duplicate the **PM Control Tower** template for yourself. It is a set of linked
databases: Reports, Threads, Meetings, Topics, Decisions, Risks, Knowledge Base,
Tasks Tracker, Projects, Workspaces, Inbox.

In the **Projects** database create a page for your project, and in
**Workspaces** a page for your workspace. They are needed as relation values:
tagging with them is exactly what keeps projects apart inside shared databases.

## Step 2. The secrets file

```bash
mkdir -p ~/work/Secrets && chmod 700 ~/work/Secrets
touch ~/work/Secrets/secrets.env && chmod 600 ~/work/Secrets/secrets.env
```

Inside, one variable per line, no quotes:

```
JIRA_TOKEN=
JIRA_EMAIL=
CONFLUENCE_TOKEN=
```

You issue the tokens yourself, in your own Jira and Confluence profile. The
plugin holds no secret value at all, only the variable names and the command
that reads them.

## Step 3. Fill in the `~~` placeholders

Tell Claude:

> set up the pm-control-tower plugin for me

It will find every spot marked with `~~` and walk you through them with
questions: the IDs of your Notion databases, your home folder, the path to the
local Jira server. The full list of placeholders and where to get each value is
in `CONNECTORS.md`.

After that, **restart Claude Desktop**: local MCP servers read the secrets file
once at startup, and without a restart the new values are not picked up.

## Step 4. The config for your project

Copy `_template.md` into a file named after your project and fill it in: team,
channels, tracker, access with dates, meeting schedule, mail routing.

This is the main file of the whole system. Skills know nothing about the project
beyond what is written here.

## Step 5. First check

> prep me for the sync on <your project name>

If the config has enough in it, you get a ready agenda and a record in the
Reports DB. If something is missing, the skill tells you what exactly, and does
not invent it for you.

## Step 6 (optional). Autopilot

Once the skills work when you run them by hand, put a few of them on a schedule
in Claude Desktop → Scheduled Tasks. Start with one, for example
`daily-team-prep` an hour before your sync.

---

## If something does not work

| Symptom | Cause |
|---|---|
| "Project config not found" | The config file was never created, or it is not named the way you refer to it in the request |
| The skill does not see a fresh token | Claude Desktop was not restarted after `secrets.env` was edited |
| The report says "source unavailable" | That is by design: the skill does not fail, it writes into the report what exactly is missing |
| Records do not land in the right project | The Project and Workspace relations are empty, or the database IDs are wrong |
