# stability-scan

Weekly stability digest combining Sentry error monitoring and CloudWatch log analysis for the Acme platform.

## What it does

Scans the in-scope Sentry projects (since 2026-08: ~~service-a only - see projects/acme.md) and local CloudWatch log files to produce a stability report. Identifies critical errors, recurring patterns, and creates Jira tickets for actionable issues.

## Outputs

1. **Ukrainian report** (`stability-scan-YYYY-MM-DD.md`) - full internal report with developer-level detail: stack traces, specific timestamps, log stream names, root cause analysis, and Jira ticket links
2. **English client report** (`stability-report-YYYY-MM-DD-EN.md`) - client-facing version without internal team names, with Executive Summary
3. **Notion page** - Ukrainian report saved to the Reports DB in Control Tower
4. **Jira tickets** - automatically created for critical findings (FATAL errors, infrastructure failures, new patterns)

## Data sources

- **Sentry** (self-hosted at ~~sentry-host) - in scope since 2026-08: ~~service-a. Out of scope (client-owned monitoring): ~~service-b, ~~service-c, ~~service-d, ~~service-e (since 2026-08); ~~service-f, ~~service-g (since 2026-06)
- **CloudWatch logs** (local at `~~home-folder/work/acme/AWS Logs/`) - staged into the session via the device bridge (device_stage_files)

## Schedule

Runs every Thursday at 22:10 (local time) as scheduled task `stability-scan`.

## Trigger phrases

`stability scan`, `скан стабільності`, `помилки за тиждень`, `weekly errors`, `cloudwatch`, `aws logs`, `лог аналіз`, `error digest`, `що ламається`, `stability report`

## Known quirks

- Self-hosted Sentry only supports `statsPeriod=14d` or `24h` (not `7d`)
- CloudWatch log files must be staged first - the skill handles this via the device bridge (device_list_dir + device_stage_files)
- Jira MCP write operations return "Unexpected end of JSON input" but actually succeed (HTTP 204)
- Notion relation properties require full URLs, not bare UUIDs

## Changelog

- **2026-04-02** - v2: Added CloudWatch directory mounting, detailed timestamps in recurring patterns, English client report, automatic Jira ticket creation, root cause analysis for each pattern
- **2026-03-xx** - v1: Initial version with basic Sentry scan and CloudWatch analysis
