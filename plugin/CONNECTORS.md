# The `~~` placeholders and connectors

[Українською](CONNECTORS.uk.md)

## How it works

`~~something` is a spot where **your** value gets substituted in. The plugin
knows neither your Notion nor your paths, so every such spot is marked
explicitly. Placeholders live only in three places: `.mcp.json`, the
`projects/_template.md` config template and the `mac-mail-collector` setup
instructions. Skill bodies read everything else from your project config.

The easiest way: tell Claude "customize the pm-control-tower plugin for me".
Claude Cowork's built-in plugin customization flow opens the installed plugin,
finds every `~~` placeholder, asks you for the values and repackages the plugin.
(The plugin has no wizard of its own; this relies on Cowork. If the flow does not
start, open the files listed below and replace the placeholders by hand.)

## What you have to substitute

| Placeholder | Where it is | What it is | Where to get it |
|---|---|---|---|
| `~~home-folder` | `.mcp.json`, `projects/_template.md`, `mac-mail-collector` | your home folder | `/Users/ivan` |
| `~~notion-reports-db`, `~~notion-threads-db`, `~~notion-meetings-db`, `~~notion-topics-db`, `~~notion-knowledge-base-db`, `~~notion-risks-db`, `~~notion-decisions-db`, `~~notion-tasks-tracker-db` | `projects/_template.md` | data source IDs of the databases in **your** duplicated Notion template | open the database as a full page; the ID is in the URL. Skills use the `collection://<id>` form |
| `~~jira-base-url` | `.mcp.json` | the URL of your Jira Server | e.g. `https://jira.your-company.com` |
| `~~jira-mcp-path` | `.mcp.json` | where the local Jira MCP server is cloned | see below |
| `~~confluence-base-url` | `.mcp.json` | the URL of your Confluence | e.g. `https://wiki.your-company.com` |
| `~~org` | `mac-mail-collector` | the LaunchAgent name prefix for the mail exporter | `com.ivan.mail-collector.plist` |

Everything project-specific (project and workspace page IDs, Sentry, Slack
channels, the client's board, team, meetings) is NOT a placeholder: it goes into
your `projects/<slug>.md`, copied from `projects/_template.md`.

## MCP servers included

The plugin ships a `.mcp.json` with two servers for shared company
infrastructure. There are no secrets in it: the command reads the values from
your `secrets.env`.

**Jira** (server name `jira`) needs one manual step: clone a Jira MCP server
and substitute its path for `~~jira-mcp-path`. The server itself is third-party
code and is not part of the bundle. The skills are written against the
operation set `search_issues`, `get_issue`, `create_issue`, `update_issue`,
`get_transitions`, `transition_issue`, `add_comment`, `add_attachment`,
`get_epic_children`; the author uses a Node-based server with exactly these
tools (`cosmix/jira-mcp` on GitHub at the time of writing; check that the tool
names match before you rely on it). Any server with the same operations works:
write its name into `jira.mcp_write` / `jira.mcp_read` in the project config
and map the operation names in `jira.known_bug` if they differ. Jira Cloud users
can use the official Atlassian connector instead.

**Confluence** (server name `confluence`) works right away, all it needs is `uv`
(`brew install uv`), which runs `mcp-atlassian`, and a token in
`CONFLUENCE_TOKEN`. No skill in this release writes to Confluence yet; the
server is here for ad-hoc search and for the use cases listed in the docs.

## Official connectors

| Category | What for | Where to enable it |
|---|---|---|
| Notion | the memory of the whole system, without it skills have nowhere to write | Settings → Connectors |
| Slack | `slack-collector`, `daily-team-prep`, `risk-register`, `client-satisfaction-tracker` | Settings → Connectors |
| Gmail | only when `gmail.client_search_filter` is set in a config; project mail normally arrives through Mail.app | Settings → Connectors |
| Google Calendar | daily reports and preps, when you add a calendar step to your scheduled prompts | Settings → Connectors |

Notion needs **AI Meeting Notes** switched on if you want transcripts in the
Meetings database; it is a paid Notion add-on, not part of the plugin.

If a connector is missing, skills do not fail. They write a line into the report
about the unavailable source and do the rest. This is intentional and is called
graceful degradation.
