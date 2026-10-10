# Setup, step by step

[Українською](SETUP.uk.md)

Plan one evening for the first working result (the config alone takes an hour
of honest answers). Calibrating the library to your own project takes a few
more evenings, and that is normal. This flow has not yet been run by anyone
except the author, so if a step does not behave as described, tell the author:
that is the pilot.

## Step 1. Notion

Duplicate the **PM Control Tower** template for yourself. It is a set of linked
databases: Reports, Threads, Meetings, Topics, Decisions, Risks, Knowledge Base,
Tasks Tracker, Projects, Workspaces, Inbox.

Do **not** create the project and workspace pages by hand: the `project-lifecycle`
skill does it in kickoff mode (Step 4). The step-by-step scenario with prompts is
`docs/en/16-runbook.md`.

If you want meeting transcripts in the Meetings database, switch on Notion's
**AI Meeting Notes** (a paid Notion add-on). Without it Meetings holds whatever
you write there by hand.

## Step 2. The secrets file

```bash
mkdir -p ~/work/Secrets && chmod 700 ~/work/Secrets
cp templates/secrets.env.example ~/work/Secrets/secrets.env
chmod 600 ~/work/Secrets/secrets.env
```

Inside, one variable per line, no quotes:

```
JIRA_TOKEN=
JIRA_EMAIL=
CONFLUENCE_TOKEN=
BITBUCKET_TOKEN=
```

You issue the tokens yourself, in your own Jira and Confluence profile (and, only for the optional `bitbucket`
server, a read-only personal access token in your Bitbucket profile). The
plugin holds no secret value at all, only the variable names and the command
that reads them.

## Step 3. Fill in the `~~` placeholders

Tell Claude:

> customize the pm-control-tower plugin for me

Cowork's plugin customization flow finds every spot marked with `~~` and walks
you through them: the data source IDs of your Notion databases, your home
folder, the URLs and the path to the local Jira server. You do not need to look up
the database IDs: add "find the database IDs yourself through the Notion MCP" to the
prompt (Notion must be able to see the CONTROL TOWER page). The full list of
placeholders and where to get each value is in `CONNECTORS.md`. If the flow
does not start, edit `.mcp.json` and `skills/projects/_template.md` by hand.

The Jira MCP server (and the optional Bitbucket one) is third-party code you clone yourself (see
`CONNECTORS.md`). After that, **restart Claude Desktop**: local MCP servers read
the secrets file once at startup, and without a restart the new values are not
picked up.

## Step 4. The config for your project

The easy way: in a task with `~/work` connected, say "set up a new project <Name>,
case A/B/C" (the `project-lifecycle` skill, kickoff mode). It builds the config, the
Notion pages, the first decision, the local folders and the registration itself, and
asks only for what is missing. By hand: copy `skills/projects/_template.md` to
`skills/projects/<your-slug>.md` inside the plugin (ask Claude "customize the pm-control-tower plugin: add project
<slug>", or edit the plugin folder by hand and repackage it) and fill it in:
access matrix, tracker access mode, team, channels, meeting schedule, mail
routing. `none` for what you do not have, `unknown` for what you do not know
yet.

This is the main file of the whole system. Skills know nothing about the project
beyond what is written here. Do not upload a separate skill named `projects`:
the plugin version would shadow it and the skills would look for configs in the
wrong folder.

## Step 5. First checks (by hand, before any schedule)

> prep me for the sync on <your project name>

If the config has enough in it, you get a ready agenda and a record in the
Reports DB. If something is missing, the skill tells you what exactly, and does
not invent it for you.

Then, one at a time: `collect Slack for <project> for the last week` (check the
Threads database: relations, statuses and icons per `projects/_standards.md`
section 11), `weekly overview for
<project>` (check that the report landed with the right Project and Workspace).
Every glitch is a config fix first, a skill fix second.

## Step 6 (optional). Autopilot

Once the skills work when you run them by hand, put a few of them on a schedule
in Claude Desktop → Scheduled Tasks. Start with one, for example
`daily-team-prep` an hour before your sync. The prompt names the project
explicitly and refers to the skill; it never repeats the skill's instructions.

## Step 7 (optional). Live tips on calls

`live-tips` is the only skill that needs a local program on your Mac: the call recorder
`tools/live-transcriber` from the repository (it is not inside the plugin). Without it the
skill only explains what is missing. Requirements: an Apple Silicon Mac, macOS 14.2+,
Python 3.10+.

1. Copy the recorder: `mkdir -p ~/work/Tools && cp -R <repo clone>/tools/live-transcriber ~/work/Tools/`.
2. In Terminal: `bash ~/work/Tools/live-transcriber/install.sh` (5-10 min, downloads a
   ~1.6 GB speech model). When macOS asks, allow Terminal the **microphone** and **System
   Audio Recording**. When the script asks, play any sound for 5 s.
3. Check the end of `~/work/Tools/live-transcriber/logs/install.log`: `install OK`, and the
   `mic` and `sys` peaks above zero. If `sys` is zero, play YouTube and run
   `~/work/Tools/live-transcriber/bin/audiocap --source system --seconds 5 | wc -c`:
   a number above zero means it works.
4. `live-tips/settings.yaml` in the plugin: `~~home-folder` is filled in by Step 3; check
   the call languages (`languages`), the labels and, if you put the recorder elsewhere,
   `paths.tool_root`.
5. The project config needs `project_root` in `Local Paths` (where `live/` transcripts
   go), and `notion.meetings_db`, `notion.project_page_id`, `notion.workspace_page_id` for
   the meeting page after the call.
6. In Cowork, the task must have the `~/work` folder connected and the Notion connector on.
7. Test: `live tips <project>` → a "Live transcriber" Terminal window opens by itself →
   talk for a minute → `стоп` → check the wrap-up and the new page in Meetings.

Everything about how it works, the tip format, the interview mode and troubleshooting:
`docs/en/17-live-tips.md`.

---

## If something does not work

| Symptom | Cause |
|---|---|
| "Project config not found" | The config file was never created, or it is not named the way you refer to it in the request |
| The skill does not see a fresh token | Claude Desktop was not restarted after `secrets.env` was edited |
| The report says "source unavailable" or the first line lists a source as SKIPPED / FAILED | That is by design: the skill does not fail, it writes into the report what exactly is missing |
| Records do not land in the right project | The Project and Workspace relations are empty, or the database IDs are wrong |
| A Jira skill cannot find its tools | The server name in `jira.mcp_write` / `jira.mcp_read` does not match `.mcp.json` (default `jira`), or Claude Desktop was not restarted |
| `live tips`: "Recording did not start" | The recorder is not installed (`install.sh`), or `paths.tool_root` in `live-tips/settings.yaml` points elsewhere |
| `live tips`: tips about you only, nothing about the other side | Terminal has no System Audio Recording permission (Privacy & Security → Screen & System Audio Recording) |
| A write to Notion "succeeds" but the field stays empty | The property name in your database differs from the plugin's expectation (see "Notion relation property names" in `_template.md`); the skill should report the discrepancy |
