# deploy-analysis: method reference

Code-based deploy analysis. Compares what is on the pending (stage) branch against
production across the repositories listed in the project config, emits release notes,
and writes the result to the Notion Reports DB. `SKILL.md` is the executable summary;
this file holds the detailed method and the report template. Everything project-specific
(repos, branches, paths, IDs) comes from `../projects/{slug}.md`; nothing here is a fact
about any particular project.

> **Local-only, no network.** This skill works exclusively against the locally
> checked-out clones under `{config.local_paths.repos_root}`. It **never** runs
> `git fetch`, `git pull`, `git remote update`, or any other outbound git operation. If
> the refs on disk are stale, the skill says so in a banner and asks the user to pull
> manually; it does not try to refresh them itself. This is deliberate: it keeps runs
> cheap on tokens and avoids the proxy and credential failures an agent session usually
> hits when it reaches for a git host.

## What it does

Every run produces three artefacts inside a single report:

1. **Stage release notes**: a per-repo, per-ticket breakdown of code shipped to the
   pending branches in the requested period, based on the actual diff (not ticket titles).
2. **Stage to prod promotion matrix**: for every ticket touched on stage, a row showing
   when it landed on stage and when (if at all) it was promoted to production. Tickets
   still on stage are flagged.
3. **Current stage-vs-prod environment delta**: a two-dot diff between the prod branch
   head and the stage branch head, grouped into infrastructure or deploy-pipeline changes
   and business-code changes. This is the "what is different between the two environments
   right now" view.

## Outputs

1. **Local Markdown file** under `{config.local_paths.reports_root}` (fallback: next to
   `{config.local_paths.repos_root}`): `deploy-analysis-{project_slug}-YYYY-MM-DD.md`
   with the full report in `{config.default_language}`.
2. **Notion page** in the Reports DB `{config.notion.reports_db}`, properties:
    - `Report Name = Deploy Analysis - {config.project_name} - DD.MM.YYYY`
    - `Type = Deploy Analysis`, `Skill = deploy-analysis`, `Visibility = Internal`
    - `Project` and `Workspace` relations from the config.

## Data sources

- **Local git repos** under `{config.local_paths.repos_root}`, one folder per row of the
  config's `## Deploy Config` table. The skill reads whatever `origin/*` refs exist on
  disk.
- **Tracker** (optional enrichment): ticket summaries for the keys found in commit
  messages, through the Jira MCP server from `{config.jira.mcp_read}` (default `jira`,
  `get_issue`), only when `{config.task_tracker.api_access}` is `true`. Otherwise keys
  are shown without summaries and the header says `Jira SKIPPED`.
- **Notion Reports DB**: destination for the generated report.

No git-hosting API calls and no outbound git traffic. The user controls freshness by
pulling the repos manually; the skill reports the local ref age in a banner so the
reader always knows how recent the view is.

## Onboarding a project

The skill reads the branch map from `../projects/{slug}.md`. To enable it for a project:

1. Set `repos_root` under `## Local Paths`.
2. Fill the `## Deploy Config` table: repo, local path, prod branch, pending (stage)
   branch, in default scope or not. Add `deploy_windows`, `promotion_rule` and
   `hotfix_policy` as free text.
3. If a repo's prod branch depends on its CI definition (for example a pipeline where a
   branch named `demo` deploys to production), say so in `promotion_rule` and name the
   CI file the skill should read locally to resolve it.
4. Mark client-owned or frozen repositories as such in the "Scope of Responsibility"
   table under `## Engagement Status`; they are excluded from the default scope.
5. Run the skill once by hand; it should pick up the project without any change here.

## Workflow

### 1. Resolve the project

Step 0 of `SKILL.md`: the project is named in the request or the scheduled prompt, never
defaulted. Load `../projects/{project_slug}.md`. Extract `project_name`, `repos_root`,
`reports_root`, the Deploy Config table, the Scope of Responsibility table,
`notion.reports_db`, `project_page_id`, `workspace_page_id`, `default_language`.

### 2. Read local refs (no network)

**Never run `git fetch`, `git pull`, or `git remote update`.** The skill runs on whatever
`origin/*` refs exist on disk at the moment of invocation. Two reasons:

1. An agent session usually cannot reach the git host (corporate proxy, no credentials
   in the sandbox), so a fetch fails on every run.
2. Even where it would succeed, it is wasted tokens and wall-clock time. The skill is
   designed to be cheap and re-runnable.

For each repo, read the local state:

```bash
cd "{repos_root}/{repo}"
prod_ref=$(git rev-parse --verify "origin/{prod}" 2>/dev/null || echo "MISSING")
stage_ref=$(git rev-parse --verify "origin/{stage}" 2>/dev/null || echo "MISSING")
prod_meta=$(git log -1 --format='%h|%ai|%s' "origin/{prod}" 2>/dev/null)
stage_meta=$(git log -1 --format='%h|%ai|%s' "origin/{stage}" 2>/dev/null)
```

If `origin/{prod}` or `origin/{stage}` is missing locally (the user has not checked that
branch out yet), skip the repo gracefully and mention it in the staleness banner.

**Staleness banner.** Compute `age_hours = now - max(prod_commit_time, stage_commit_time)`
per repo. In the report header put:

```
**Local refs freshness:**
- {repo-a}: prod {sha} ({n} days old), stage {sha} ({n} days old)
- {repo-b}: prod {sha} ({n} days old), stage {sha} ({n} days old)
```

If any repo has `age_hours > 24`, append a warning line: "⚠️ Деякі рефи старші за 24
години. Щоб освіжити: `cd {repos_root} && for d in */; do (cd "$d" && git fetch --all --prune); done`".
Do **not** run that command from the skill; the user runs it in their own terminal where
proxy and credentials are configured.

### 3. Build the commit universe

For each repo, define the **period window**:

- Manual run with an explicit period: use what the user said.
- Scheduled run: `since = the previous run's target date`, `until = now` (the prompt may
  fix it to 24 hours for a daily run).
- No period specified: `since = now - 7d`, `until = now`.

Collect three lists per repo (all with `--no-merges`):

- `prod_new`: commits on `origin/{prod}` with `--since={since} --until={until}`.
- `stage_new`: commits on `origin/{stage}` with `--since={since} --until={until}`.
- `stage_only_now`: commits on `origin/{stage}` not in `origin/{prod}` at HEAD
  (`git log origin/{prod}..origin/{stage} --no-merges`).

### 4. Expand submodule pointer changes (local only)

If a repo uses git submodules (for example a shared migrations repository), for each
commit in `prod_new` or `stage_new` that touches the submodule path run (still local-only):

```bash
git show {hash} -- {submodule_path}
```

Extract `prev_sha → new_sha`. Then in the **local clone** of the submodule repository:

```bash
cd "{repos_root}/{submodule_repo}"
# Check first that both shas are present locally. If either is missing,
# skip this expansion and note it in the report - do NOT fetch.
git cat-file -e {prev_sha}^{commit} 2>/dev/null && \
git cat-file -e {new_sha}^{commit} 2>/dev/null && \
git log {prev_sha}..{new_sha} --no-merges --pretty=format:"%h|%ai|%an|%s" \
  || echo "⚠️ submodule sha range {prev_sha}..{new_sha} not fully present locally - pull needed"
```

Each of those commits becomes an entry in the parent repo's release notes, tagged
`[via submodule]`. If the range is unresolvable because of missing SHAs locally, add a
line to the report explaining that the user needs to pull the submodule to get the full
detail, but do not block the rest of the analysis.

### 5. Classify each commit

For each commit, extract:

- **Ticket key**: regex for `{config.task_tracker.project_key}-\d+` in the commit
  subject. If absent, classify as `no-ticket`.
- **Surface**: guess from the changed files. Typical patterns (adapt to the stack):
    - `**/migrations/**` → DB migration
    - `**/templates/**` → email or web template
    - `**/api/**`, `**/controllers/**`, `**/viewsets.py` → API endpoint change
    - `**/services/**` → service-layer logic
    - `infrastructure/**`, CI files (`Jenkinsfile*`, `.github/workflows/**`,
      `.gitlab-ci.yml`), `*.tfvars`, secrets integration, env settings → infra / deploy
      pipeline
    - `assets/**` → binary or content asset
- **Kind**, heuristic:
    - All diff lines are whitespace or line-wrap only → `format-only` (goes to the appendix).
    - Touches only infra or pipeline files → `infra`.
    - Touches business source files → `feature/fix`.

### 6. Compute the stage-vs-prod delta

For each repo, run both:

```bash
git diff origin/{prod}..origin/{stage} --stat
git diff origin/{prod}..origin/{stage} --stat -- '{business source globs}' ':(exclude){settings globs}' ':(exclude){secrets globs}'
```

The first gives the full delta (including infra). The second gives the business-code-only
delta. For each file with a non-trivial diff (more than 5 lines, more than line-wrap
changes), do a focused `git diff` read and summarize the semantic change in one or two
sentences.

Always use **two-dot** diffs for environment comparison. Three-dot diffs walk through the
common ancestor and can surface phantom reversions that do not reflect the actual current
state of either branch.

### 7. Compose the report

The skeleton below is the built-in default for the template key `deploy-analysis`. A house
or project template (see "Document templates" in `projects/SKILL.md`) replaces it.

Template (body in `{config.default_language}`, ticket keys and technical terms as they are):

```markdown
Джерела: git (local refs) OK, freshest ref {n} днів · Jira {OK | SKIPPED (api_access: false)}
# Deploy Analysis - {project} - DD.MM.YYYY

**Period:** {since} → {until}
**Prod branches checked:** {list}
**Fetch status:** {OK | ⚠️ {repo}: stale, last local commit {timestamp}}

---

## 1. Реліз ноутси стейджа

### {Repo name}
Ticket-grouped bullets. Each ticket gets: commit hash(es), author, timestamp, 1-3 line "що зроблено" (what the code actually does), affected files or surfaces.

---

## 2. Що перейшло в прод, а що залишилось на стейджі

| Ticket | Компонент | Landed on stage | Promoted to prod | Status |
|---|---|---|---|---|
| {KEY}-xxxx | {repo} | YYYY-MM-DD HH:MM | YYYY-MM-DD HH:MM | 🟢 on prod |
| {KEY}-yyyy | {repo} | YYYY-MM-DD HH:MM | - | 🟡 on stage only |

Group by status under the table, with a 2-3 line note on each stage-only ticket explaining what it is and why it is pending (if determinable from ticket metadata).

---

## 3. Поточна різниця між стейджем і продом

### 3.1 Інфраструктура / деплой пайплайн
Infra and pipeline changes in one grouped section, one line each; link the related tracker initiatives if any.

### 3.2 Бізнес-код
Per-repo table of business-code differences (exclude infra, settings, secrets). For each, a short semantic summary and a pointer to the actual diff.

### 3.3 Appendix: форматування і noise
Commits that were pure line-wrap or whitespace, grouped.

---

## 4. Ризики і observations
Short bullet list of what is worth flagging: hot-fix iteration counts, long-lived stage-only work, semantic changes behind otherwise cosmetic diffs, and so on.
```

### 8. Write to Notion

Use `notion-create-pages` with parent `{ data_source_id: "{config.notion.reports_db}" }`.
Convert the Markdown body using Notion-flavoured markdown (tables, `##` headers, code
blocks). For `Project` and `Workspace` relations, use the full URL inside a JSON array
string: `["https://app.notion.com/p/{config.notion.project_page_id}"]` (ID without dashes).

If the `Type` select option `Deploy Analysis` or the `Skill` option `deploy-analysis`
does not exist yet, Notion creates it on first write.

### 9. Save the local copy

```bash
mkdir -p "{config.local_paths.reports_root}"
```

Write the full Markdown to `{reports_root}/deploy-analysis-{project_slug}-{YYYY-MM-DD}.md`.
If a file with that name already exists (same-day re-run), append `-{HHMM}` to the
filename before writing.

### 10. Chat summary

Reply in chat with a compact summary that opens with the same Data Completeness header:

```
Джерела: git (local refs) OK · Jira SKIPPED (api_access: false)
✅ Deploy Analysis - {project} - DD.MM.YYYY
• Period: {since} → {until}
• Prod deploys: {n} commits across {m} repos
• Stage-only pending: {k} tickets ({KEY}-xxxx, {KEY}-yyyy)
• Env delta: {infra-heavy | business-heavy | both}, {n} business-code diffs
• Notion: {link}
• Local file: {path}
```

No emojis in the Notion body; the chat summary can use a single ✅ for quick scanning.

## Trigger phrases

`deploy analysis`, `аналіз деплоя`, `реліз ноутси стейджа`, `stage release notes`,
`порівняння стейджа і прода`, `stage vs prod`, `що залишилось на стейджі`,
`what's pending on stage`, `різниця між прод і стейдж`, `prod stage diff`

## Schedule

There is no default schedule and no default project. For a recurring run, create a
Cowork scheduled task whose prompt names the project, the in-scope repos and the period;
a good moment is after the morning deploy window and before the client sync, so the PM
has the delta fresh for that conversation. The task runs without interactive prompts.

## Known quirks

- **Never fetch.** The skill reads local refs only. Do not be tempted to "just try"
  `git fetch` inside the skill. If refs are stale, say so in a banner and stop.
- **Prod branch by CI, not by name.** Some pipelines deploy a branch with an unexpected
  name to production. If `main` on a repo has not moved in months, do not report "no
  deploys": read the CI file the config names (locally) and resolve the actual prod branch.
- **Submodule noise.** A shared submodule repository often carries a lot of legacy
  stage-only commits. Filter to `--since` within the reporting window or to commits whose
  subject matches the ticket key pattern to keep the signal clean.
- **Three-dot diffs lie**: when comparing stage vs prod environment state, always use
  `git diff prod..stage`, never `git diff prod...stage`. The three-dot version walks
  through the merge-base and can show reverted code as if it were a delta.
- **One change, two hashes.** Cherry-picks between integration and stage branches make the
  same logical change appear twice. Deduplicate by ticket key + commit message when
  building the release-notes table.
- **Submodule SHA missing locally.** If a parent repo's submodule pointer references a
  commit that is not in the local submodule clone (the user pulled the parent but not the
  submodule), do not fetch the submodule; flag the gap in the report and expand whatever
  you do have locally.
