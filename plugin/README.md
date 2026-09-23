# PM Control Tower

[Українською](README.uk.md)

A library of PM automation, put together over a year on a demanding fintech
project and anonymized so it can be handed over. Twenty-one skills, with not a
single fact about any specific project inside them.

## The principle everything rests on

Skills know nothing about your project. All the facts (team, channels, tracker,
access, meeting schedule) live in **one config file per project**. Skills read
that file as their first step, every single time.

The consequence: when the team changes or an access is revoked, you edit one text
file, and a second later the whole library is working against the new reality.
Nothing has to be rewritten inside the skills themselves.

The second rule: **never guess the project**. If the request does not name a
project, the skill asks rather than assumes. Mixing up the data of two clients is
the worst thing a system like this can do.

## Start with these four

| Skill | What it does |
|---|---|
| **`projects`** | Infrastructure. The registry of configs. Not run directly, every other skill reads it |
| **`daily-team-prep`** | Agenda for the internal sync: tracker changes, recent threads, blockers, action items still open |
| **`weekly-overview`** | Monday review of last week and the plan for the current one |
| **`mac-mail-collector`** | Mail from Mail.app into Notion without an API. Requires a Mac |

That is enough to feel the effect within a week. The rest you plug in when you
actually need it.

## The rest of the library

**Client and reporting:** `client-meeting-prep`, `client-report` (weekly,
monthly, steering), `client-satisfaction-tracker` (client tone and mood over a
period), `change-request` (sorting client asks into scope and hours).

**Tracker:** `jira-management`, `jira-board-health` (board hygiene),
`velocity-report`.

**Communications:** `slack-collector`, `inbox-responder` (draft replies),
`thread-ticket-sync`, `notion-meeting-topics`, `topic-manager`.

**Risks and status:** `risk-register`, `stability-scan`, `sentry-assistant`,
`deploy-analysis`, `project-lifecycle`.

## Installation

Step by step in `SETUP.md`. In short: duplicate the Notion template, create a
secrets file, tell Claude "customize the pm-control-tower plugin for me" (Cowork's
plugin customization flow fills in the `~~` placeholders), add the config for
your own project inside the plugin and run the first skills by hand.

Status: version 1.1.0 is the first release that was reviewed end to end against
the Notion template and the config template, but it has not yet been installed
by anyone except the author. Expect rough edges and report them.

## What is deliberately missing

- **Secrets.** Not one value. Only variable names and the command that reads
  them from your local file.
- **Other people's project configs and client data.** All names, domains,
  database IDs and addresses are anonymized. `projects/` holds only a template
  and the standards.
- **Adapters for a specific client.** Those do not transfer: a different project
  means a different stack, a different tracker, a different architecture. Skills
  like that get written on site.
- **Code of third-party MCP servers.** The configuration is here, but the Jira
  server code itself has to be cloned separately.

## Important compatibility warning

The set travels **whole or not at all**. If you install the plugin and then load
a separate file with a skill of the same name, the plugin version overrides it,
and the skill will look for configs somewhere other than where they actually
sit. This goes for `projects` in particular: there must be exactly one of it in
the system. New project configs are added inside the installed plugin (see
`SETUP.md`, step 4), never as a separate upload.

If you want to add a skill of your own on top, give it its own name with a
project prefix, for example `acme-debug`.
