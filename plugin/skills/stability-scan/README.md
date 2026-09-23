# stability-scan

Weekly stability digest combining Sentry error monitoring and CloudWatch log analysis for a registered project. Everything project-specific (Sentry instance, scope, log paths, tracker) comes from `../projects/{slug}.md`.

## What it does

Scans the in-scope Sentry projects (`{config.sentry.projects_in_scope}`) and the local CloudWatch log exports (`{config.local_paths.aws_logs}`) to produce a stability report. Identifies critical errors, recurring patterns, and creates tracker tickets for actionable issues when the tracker has API access.

## Outputs

1. **Internal report** (`stability-scan-YYYY-MM-DD.md`, in `{config.default_language}`) - full report with developer-level detail: stack traces, specific timestamps, log stream names, root cause analysis, and ticket links
2. **Client report** (`stability-report-YYYY-MM-DD-EN.md`, in `{config.client_language}`) - client-facing version without internal team names, with an Executive Summary
3. **Notion page** - the internal report saved to the Reports DB (`{config.notion.reports_db}`)
4. **Tracker tickets** - created for critical findings (FATAL errors, infrastructure failures, new patterns) only when `{config.task_tracker.api_access}` is true; otherwise listed as recommendations

Both reports open with the Data Completeness header (`projects/SKILL.md`).

## Data sources

- **Sentry** (`{config.sentry.url}`, token read at runtime from `{config.sentry.secrets_file}` by `{config.sentry.token_env}`): only `{config.sentry.projects_in_scope}`. Slugs in `{config.sentry.projects_out_of_scope}` are client-owned monitoring and are never scanned by default
- **CloudWatch logs** (local exports under `{config.local_paths.aws_logs}`): staged into the session via the device bridge (device_list_dir + device_stage_files) when the session is not on the machine that holds them; `none` = skipped with one header line

## Schedule

No default schedule. Typical: once a week in the evening, as a Cowork scheduled task whose prompt names the project and the period.

## Trigger phrases

`stability scan`, `скан стабільності`, `помилки за тиждень`, `weekly errors`, `cloudwatch`, `aws logs`, `лог аналіз`, `error digest`, `що ламається`, `stability report`

## Known quirks

- Self-hosted Sentry may reject `statsPeriod`; the skill falls back to explicit `start` / `end` dates
- CloudWatch log files must be staged first - the skill handles this via the device bridge
- Some Jira Server MCP write operations return "Unexpected end of JSON input" but actually succeed (HTTP 204); the skill verifies by re-reading. Record such quirks in `jira.known_bug`
- Notion relation properties require full URLs (`https://app.notion.com/p/<id-without-dashes>`), not bare UUIDs
