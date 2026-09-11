# The `~~` placeholders and connectors

[Українською](CONNECTORS.uk.md)

## How it works

`~~something` is a spot where **your** value gets substituted in. The plugin
knows neither your Notion nor your paths, so every such spot is marked
explicitly.

The easiest way: tell Claude "set up the pm-control-tower plugin for me". It will
find all the placeholders and walk you through them with questions.

## What you have to substitute

| Placeholder | What it is | Where to get it |
|---|---|---|
| `~~notion-reports-db` and the other `~~notion-*-db` | IDs of the databases in **your** Notion | open the database, take the ID from the URL |
| `~~notion-project-page-id` | your project page in the Projects database | from the page URL |
| `~~notion-workspace-page-id` | your workspace page in the Workspaces database | from the page URL |
| `~~notion-page-id` | individual pages that skills link to | create them and take the ID |
| `~~home-folder` | your home folder | `/Users/ivan` |
| `~~jira-mcp-path` | where the local Jira MCP server sits | see below |
| `~~sentry-host`, `~~service-a` … `~~service-g` | your Sentry and the service names | only if you use `stability-scan` |
| `~~client-roadmap-url`, `~~client-tasks-db-url` | the client's board, if they have one | only for `thread-ticket-sync` |
| `~~org` | the LaunchAgent name prefix | `com.ivan.mail-collector.plist` |

## MCP servers included

The plugin ships a `.mcp.json` with two servers for shared company
infrastructure. There are no secrets in it: the command reads the values from
your `secrets.env`.

**Confluence** works right away, all it needs is `uv` (`brew install uv`) and a
token in `CONFLUENCE_TOKEN`.

**Jira** needs one manual step: you have to clone the local MCP server yourself
and substitute the path to it for `~~jira-mcp-path`. The server itself is not
part of the bundle, it is third-party code. Ask the plugin author where to get
it.

## Official connectors

| Category | What for | Where to enable it |
|---|---|---|
| Notion | the memory of the whole system, without it skills have nowhere to write | Settings → Connectors |
| Slack | thread collection, `daily-team-prep`, `slack-collector` | Settings → Connectors |
| Gmail and Calendar | `weekly-overview`, daily reports | Settings → Connectors |

If a connector is missing, skills do not fail. They write a line into the report
about the unavailable source and do the rest. This is intentional and is called
graceful degradation.
