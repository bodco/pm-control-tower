---
name: deploy-analysis
description: "Code-based deploy analysis for a registered project: compares stage and production branches across the repos listed in the project config, and produces stage release notes, a stage-vs-prod promotion table, and the current environment delta split into infra and business code. Works only against locally checked-out repos and never runs network git operations. Never defaults to a project: if the project is not named, it asks. Use whenever the user mentions \"deploy analysis\", \"аналіз деплоя\", \"реліз ноутси стейджа\", \"stage release notes\", \"порівняння стейджа і прода\", \"stage vs prod\", \"що залишилось на стейджі\", \"what's pending on stage\", \"різниця між прод і стейдж\", \"prod stage diff\", or when it runs as a scheduled task. When triggered, execute immediately."
---

# Deploy Analysis

## Step 0 - Project config (always run first)

1. Determine the project from the user's request. If the project is NOT explicitly named,
   do not guess and do not default: ask the user which project (list the configs in
   `projects/`). See the Default Project Rule in `projects/SKILL.md`.
2. Read the project config `../projects/{project_slug}.md` relative to this skill's
   folder (fallback: Glob `**/projects/{project_slug}.md` under the skills directory).
3. All values marked `{config.xxx}` come from that config. Also read `projects/SKILL.md`
   for the cross-cutting rules (Data Completeness header, 5-minute rule).
4. Read the config's `## Deploy Config` section. It is authoritative (Rule Zero: config
   wins over anything written here). It must define, per repo, the local path, the prod
   branch and the pending (stage) branch, plus `{config.local_paths.repos_root}`, and may
   carry `deploy_windows`, `promotion_rule` and `hotfix_policy`. If the section is
   missing or says `none`, tell the user the project is not configured for
   deploy-analysis and stop. Do not infer branch names and do not reuse another
   project's model.
5. Read the "Scope of Responsibility" table under the config's Engagement Status: repos
   marked client-owned or frozen are out of default scope. Include them ONLY on an
   explicit request, and then with a loud staleness warning in the report, because a
   frozen local clone produces a stale and misleading delta.
6. Writes allowed without asking (the 5-minute rule): the local report file and the
   Reports DB page. This skill never touches the repositories.

If the config file does not exist: "Project config not found. Available projects:
[list files in projects/]"

---

The full workflow, edge-case handling, and output template live in `README.md` next to
this file. Read it before running.

## Behavior (brief)

**This skill works exclusively against the locally checked-out repositories. NEVER run
`git fetch`, `git pull`, `git remote update`, or any other network operation.** A corporate
proxy usually blocks outbound git from an agent session anyway; burning round-trips and
tokens on calls that reliably fail is pure waste. The user is responsible for pulling fresh refs before
asking for a fresh analysis. The skill always uses whatever `origin/*` refs exist on disk
and prints a staleness banner.

1. Load the project config; resolve prod and stage branches per repo from `## Deploy
   Config`; drop out-of-scope repos.
2. For each repo, `cd` into it under `{config.local_paths.repos_root}`. **Do not fetch.**
   Read the local refs: `git rev-parse origin/{prod}`, `git rev-parse origin/{stage}`, and
   `git log -1 --format='%h %ai %s' origin/{prod}` (same for stage).
3. Stamp each repo with its local freshness: the `%ai` timestamp of the latest local
   origin commit on both branches. Put this in the report header so the reader knows when
   the data was last pulled.
4. Collect commits on `origin/{stage}` not in `origin/{prod}` (non-merge, `--since`
   matching the requested period, default 7 days).
5. Collect commits on `origin/{prod}` within the period window.
6. For submodule repos, walk submodule pointer deltas and expand them into commits **from
   the local submodule clone**, not from any remote. If the local submodule state does not
   contain the SHA referenced by the parent repo, flag it in the report ("submodule SHA
   {sha} not present locally; pull needed") and keep going.
7. For each code commit in the window capture: ticket reference, author, timestamp, files
   touched, a 1-3 line summary of what changed. Keep autoformatting-only diffs out of
   headline items, in an appendix.
8. Compute the **true** stage-vs-prod delta: two-dot diff `origin/{prod}..origin/{stage}`,
   split into:
   - **Infra/DevOps only** (CI files, Terraform, secrets integration, env settings) into
     one grouped "Deployment pipeline" section, one line each.
   - **Business code** with full file-level and symbol-level review.
9. Produce three sections:
   - **Stage release notes**: what landed on stage in the period.
   - **Stage to prod promotion table**: per ticket, landed on stage on X, promoted to prod
     on Y, or "still on stage".
   - **Current stage-vs-prod delta**: what differs right now, split into infra and
     business code.
10. Save the report in two places:
    - local markdown under `{config.local_paths.reports_root}` (or, if the config has no
      such path, next to the repos root) as
      `deploy-analysis-{project_slug}-YYYY-MM-DD.md`
    - the Notion Reports DB (see below)
11. The report and the chat summary open with the Data Completeness header
    (`projects/SKILL.md`), e.g. `Джерела: git (local refs) OK, freshest ref 2 днi · Jira SKIPPED (api_access: false)`.
12. Print a concise chat summary with counts and links, and, if any local ref is older
    than 24h, one hint line: "Щоб освіжити: у терміналі `cd {repos_root} && for d in */; do (cd \"$d\" && git fetch --all --prune); done`".

## Branch model notes

The branch model belongs to the project, not to this skill. Read it from `## Deploy
Config`. Two rules that hold generally:

- A repo whose environment chain has no stage env at all (for example `dev` promoted
  straight to `master`) must be reported as "pending on {branch}", never "on stage".
- Branches that mirror stage for automated tests carry the same content as stage: do not
  report them as a separate environment. Legacy branches named in the config's ignore list
  are skipped.

If a repo's prod branch is ambiguous, resolve it from the repo's own CI definition (read
the file locally) before reporting, and say in the report how it was resolved.

Deeper SDLC rules, where they exist, live in the project's knowledge base at
`{config.local_paths.kb_root}`.

## Period

If the user specifies a period ("за останній тиждень", "since 21 Apr 17:00") use it.
Otherwise default to **the last 7 days ending now**.

For a scheduled run the period is "since the previous run's target date" so reports chain
without gaps, but the report still shows a fixed `since` / `until` header.

## Report Storage - Notion

**Database:** `{config.notion.reports_db}`. No database ID is hardcoded here; if the
config does not carry one, say so and leave the report local.

Use `notion-create-pages` with a `data_source_id` parent. Reports uses the relations
`Project` and `Workspace` (singular).

| Property | Value |
|----------|-------|
| Report Name | `Deploy Analysis - {config.project_name} - DD.MM.YYYY` |
| date:Date:start | Today's date (YYYY-MM-DD) |
| date:Date:is_datetime | 0 |
| Type | `Deploy Analysis` (create the option if missing) |
| Skill | `deploy-analysis` (create the option if missing) |
| Summary | 2-3 sentence headline: "X tickets on prod, Y still on stage, main delta = {infra\|business\|both}" |
| Workspace | `["https://app.notion.com/p/{config.notion.workspace_page_id}"]` (ID without dashes) |
| Project | `["https://app.notion.com/p/{config.notion.project_page_id}"]` (ID without dashes) |
| Visibility | `Internal` |

Relation properties need full Notion URLs, not bare UUIDs. The full Ukrainian report goes
as the page body in Notion Markdown. Keep `##` headings and tables.

## Style

- Output language: `{config.default_language}` (Ukrainian by default, same as
  weekly-overview and stability-scan).
- Ticket keys (`{config.task_tracker.project_key}-xxxx`) and commit hashes in monospace.
- No emojis. **No em dashes anywhere**, in chat or in the Notion body: use a hyphen, a
  comma, or restructure the sentence.
- When citing a commit hash, include the 7-char short hash and the full ISO timestamp.
- When citing a file path, use the repo-relative path, never the absolute mount path.

## Known quirks

- **Local-only by design.** No network git calls. This saves tokens on calls that would
  usually fail (a proxy blocks the git host, no credentials in the sandbox) and keeps runs cheap.
- Repos on an older CI often use `main` for prod and `stage` for stage; repos migrated to
  a newer pipeline may use a differently named prod branch. Verify from the repo's CI
  file, not from the branch name.
- `origin/stage` accumulates merge commits from integration branches. Always filter
  `--no-merges` on commit lists, and use a two-dot file diff (`prod..stage`) for the true
  delta: three-dot diffs walk through the common ancestor and show phantom reversions.
- If a ref is suspiciously old (for example `origin/main` last commit older than 7 days
  while the user says "yesterday's deploy"), do NOT try to fetch. Print a clear staleness
  note and let the user pull manually.
- Ticket context (summaries for the keys found in commit messages) comes from the Jira
  MCP server in `{config.jira.mcp_read}` (default `jira`, `get_issue`) only when
  `{config.task_tracker.api_access}` is true; otherwise the key is shown without a
  summary and the header says `Jira SKIPPED`. This skill only reads the tracker.

## Scheduled task

There is no default schedule and no default project. If a recurring run is wanted,
create a Cowork scheduled task whose prompt names the project, the in-scope repos and
the period (24 hours for a daily run); the report then chains from the previous run's
target date.