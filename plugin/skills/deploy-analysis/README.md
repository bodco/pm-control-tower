> **SCOPE UPDATE 2026-08-17:** default scope is `transactionalautorizer` (+admin) only;
> other repos are client-owned frozen snapshots (2026-07-31). The daily 15:30 scheduled
> task described below no longer exists server-side. `<acme-mount-session>` below means:
> resolve the acme mount at run time, never hardcode a session name.

# deploy-analysis

Code-based deploy analysis skill. Compares what's on stage vs production across all project repos, emits release notes, and writes the result to the Notion Reports DB.

> **Local-only, no network.** This skill works exclusively against the locally checked-out clones under `{repos_root}`. It **never** runs `git fetch`, `git pull`, `git remote update`, or any other outbound git operation. If the refs on disk are stale, the skill says so in a banner and asks the user to pull manually; it does not try to refresh them itself. This is deliberate - it keeps runs cheap on tokens and avoids the known proxy/cred failures on this machine.

## What it does

Every run produces three artefacts inside a single report:

1. **Stage release notes** - a per-repo, per-ticket breakdown of code shipped to the stage branches in the requested period, based on the actual diff (not ticket titles).
2. **Stage → Prod promotion matrix** - for every ticket touched on stage, a row showing when it landed on stage and when (if at all) it was promoted to production. Tickets still on stage are flagged.
3. **Current stage-vs-prod environment delta** - a two-dot diff between the prod branch head and the stage branch head, grouped into infrastructure/deploy-pipeline changes and business-code changes. This is the "what is different between the two environments right now" view.

## Outputs

1. **Local Markdown file** - `<acme-mount-session>/mnt/acme/deploy-analysis/deploy-analysis-{project}-YYYY-MM-DD.md` with the full Ukrainian report.
2. **Notion page** - created in the Reports DB under Acme/Control Tower, properties:
    - `Report Name = Deploy Analysis - {project} - DD.MM.YYYY`
    - `Type = Deploy Analysis`
    - `Skill = deploy-analysis`
    - `Visibility = Internal`
    - `Project` and `Workspace` relations wired per project config.

## Data sources

- **Local git repos** under `{config.local_paths.repos_root}` (for Acme: `<acme-mount-session>/mnt/acme/repos/`). The skill reads whatever `origin/*` refs exist on disk and **never runs `git fetch` / `git pull` / `git remote update`**.
- **Jira (jira-cosmix / jira-rixbeck)** - optional enrichment to resolve ticket summaries and link PROJ-xxxx references to the board.
- **Notion Reports DB** - destination for the generated report.

No direct Bitbucket / GitHub API calls and no outbound git traffic. The user controls freshness by pulling the repos manually when they want fresh data; the skill reports the local ref age in a banner so the reader always knows how recent the view is.

## Projects supported

Today: **Acme** only (default).

The skill reads the branch map from the project config file at `/mnt/.claude/skills/projects/{project_slug}.md`. To onboard a new project:

1. Add `repos_root` under `## Local Paths` in the project config.
2. Add a `## Deploy Branches` table listing prod and stage branch names per repo.
3. Add a `## Deploy Pipeline` note describing which repos use Jenkinsfile-old vs Jenkinsfile_ecs (so the skill can determine the correct prod branch from CI config).
4. Run the skill; it should pick up the new project without code changes here.

## Workflow

### 1. Resolve project

Default `project_slug = acme`. Load `/mnt/.claude/skills/projects/{project_slug}.md`. Extract:

- `project_name`, `repos_root`
- Per-repo prod/stage branch mapping (fallback to the table in `SKILL.md` for Acme).
- `notion.reports_db`, `project_page_id`, `workspace_page_id`.

### 2. Read local refs (no network)

**Never run `git fetch`, `git pull`, or `git remote update`.** This skill runs on whatever `origin/*` refs exist on disk at the moment of invocation. Two reasons:

1. Corp proxy reliably blocks outbound git for Bitbucket-hosted repos (Authorizer) and there are no GitHub creds in the sandbox - so fetch would fail on every run.
2. Even on the repos where it would succeed, it's wasted tokens and wall-clock time. The skill is designed to be cheap and re-runnable.

For each repo, read the local state:

```bash
cd "{repos_root}/{repo}"
prod_ref=$(git rev-parse --verify "origin/{prod}" 2>/dev/null || echo "MISSING")
stage_ref=$(git rev-parse --verify "origin/{stage}" 2>/dev/null || echo "MISSING")
prod_meta=$(git log -1 --format='%h|%ai|%s' "origin/{prod}" 2>/dev/null)
stage_meta=$(git log -1 --format='%h|%ai|%s' "origin/{stage}" 2>/dev/null)
```

If `origin/{prod}` or `origin/{stage}` is missing locally (the user hasn't checked that branch out yet), skip the repo gracefully and mention it in the staleness banner.

**Staleness banner.** Compute `age_hours = now - max(prod_commit_time, stage_commit_time)` per repo. In the report header put:

```
**Local refs freshness:**
- ClientPortalAPI: prod 0a98f22 (2 days old), stage f8cf5b7 (2 days old)
- MiddleOfficeAPI: prod bddb8e2 (2 days old), stage 9abc3e2 (2 days old)
- ...
```

If any repo has `age_hours > 24`, append a yellow warning line: "⚠️ Деякі рефи старші за 24 години. Щоб освіжити: `cd {repos_root} && for d in */; do (cd "$d" && git fetch --all --prune); done`". Do **not** run that command from the skill - the user runs it in their own terminal where proxy/creds are configured.

### 3. Build the commit universe

For each repo, define the **period window**:

- Manual run with explicit period: use what the user said.
- Scheduled daily run: `since = now - 24h`, `until = now`.
- No period specified: `since = now - 7d`, `until = now`.

Collect three lists per repo (all with `--no-merges`):

- `prod_new`: commits on `origin/{prod}` with `--since={since} --until={until}`.
- `stage_new`: commits on `origin/{stage}` with `--since={since} --until={until}`.
- `stage_only_now`: commits on `origin/{stage}` not in `origin/{prod}` at HEAD (use `git log origin/{prod}..origin/{stage} --no-merges`).

### 4. Expand submodule pointer changes (local only)

Python backends use `_submodules/paymentapp_migrations`. For each commit in `prod_new` or `stage_new` that touches this path, run (still local-only):

```bash
git show {hash} -- _submodules/paymentapp_migrations
```

Extract `prev_sha → new_sha`. Then in the **local clone** of the migrations repo:

```bash
cd "{repos_root}/paymentapp_migrations"
# Check first that both shas are present locally. If either is missing,
# skip this expansion and note it in the report - do NOT fetch.
git cat-file -e {prev_sha}^{commit} 2>/dev/null && \
git cat-file -e {new_sha}^{commit} 2>/dev/null && \
git log {prev_sha}..{new_sha} --no-merges --pretty=format:"%h|%ai|%an|%s" \
  || echo "⚠️ submodule sha range {prev_sha}..{new_sha} not fully present in local paymentapp_migrations - pull needed"
```

Each of those migration commits becomes an entry in the parent repo's release notes, tagged `[via submodule]`. If the range is unresolvable because of missing SHAs locally, add a yellow line to the report explaining that the user needs to pull `paymentapp_migrations` to get the full migration detail - but don't block the rest of the analysis.

### 5. Classify each commit

For each commit, extract:

- **Ticket key** - regex for `PROJ-\d+` in commit subject. If absent, classify as `no-ticket`.
- **Surface** - guess from changed files:
    - `base_service/**/migrations/**` → DB migration
    - `base_service/**/templates/**` → email/web template
    - `base_service/**/api/**` or `**/viewsets.py` → API endpoint change
    - `base_service/**/services/**` → service-layer logic
    - `infrastructure/**`, `Jenkinsfile*`, `*.tfvars`, `settings/vault.py` → infra / deploy pipeline
    - `assets/**` → binary/content asset
- **Kind** - heuristic:
    - All diff lines are whitespace/line-wrap only → `format-only` (goes to appendix).
    - Touches only infra/pipeline files → `infra`.
    - Touches `.py` or `.html` business files → `feature/fix`.

### 6. Compute stage-vs-prod delta

For each repo, run both:

```bash
git diff origin/{prod}..origin/{stage} --stat
git diff origin/{prod}..origin/{stage} --stat -- 'base_service/**/*.py' ':(exclude)base_service/**/settings/*' ':(exclude)base_service/**/vault.py'
```

The first gives the full delta (including infra). The second gives the business-code-only delta. For each file with a non-trivial diff (more than 5 lines, more than line-wrap changes), do a focused `git diff` read and summarize the semantic change in one or two sentences.

Always use **two-dot** diffs for environment comparison. Three-dot diffs walk through the common ancestor and can surface phantom reversions that don't reflect the actual current state of either branch.

### 7. Compose the report

Use this template (Ukrainian body, EN for ticket keys and technical terms):

```markdown
# Deploy Analysis - {project} - DD.MM.YYYY

**Period:** {since} → {until}
**Prod branches checked:** {list}
**Fetch status:** {OK | ⚠️ {repo}: stale, last fetch {timestamp}}

---

## 1. Реліз ноутси стейджа

### {Repo name}
Ticket-grouped bullets. Each ticket gets: commit hash(es), author, timestamp, 1-3 line "що зроблено" (what the code actually does), affected files/surfaces.

### ...

---

## 2. Що перейшло в прод, а що залишилось на стейджі

| Ticket | Компонент | Landed on stage | Promoted to prod | Status |
|---|---|---|---|---|
| PROJ-xxxx | MOAPI | 2026-04-21 17:55 | 2026-04-21 20:05 | 🟢 on prod |
| PROJ-yyyy | CPAPI | 2026-04-22 12:10 | - | 🟡 on stage only |

Group by status under the table, with a 2-3 line note on each stage-only ticket explaining what it is and why it's pending (if determinable from ticket metadata).

---

## 3. Поточна різниця між стейджем і продом

### 3.1 Інфраструктура / деплой пайплайн
One section describing the infra/pipeline migration (typically a one-time major delta - ECS + Vault migration in Acme's case). Link to relevant Jira initiatives if any.

### 3.2 Бізнес-код

Per-repo table of business-code differences (exclude infra, settings, vault). For each, a short semantic summary and a pointer to the actual diff.

### 3.3 Appendix: форматування і noise

Commits that were pure line-wrap/whitespace, grouped.

---

## 4. Ризики і observations

Short bullet list of what's worth flagging: hot-fix iteration counts, long-lived stage-only work, semantic changes behind otherwise-cosmetic diffs, etc.
```

### 8. Write to Notion

Use `notion-create-pages` with parent `{ data_source_id: "~~notion-reports-db" }`. Convert the Markdown body using Notion flavoured markdown (tables, `##` headers, code blocks). For `Project` and `Workspace` relations, use the full `https://www.notion.so/{id_no_dashes}` URL inside a JSON array string (e.g. `["https://www.notion.so/~~notion-project-page-id"]`).

If the `Type` select option `Deploy Analysis` or `Skill` option `deploy-analysis` doesn't exist yet, Notion auto-creates them on first write.

### 9. Save local copy

```bash
mkdir -p <acme-mount-session>/mnt/acme/deploy-analysis
```

Write the full Markdown to `<acme-mount-session>/mnt/acme/deploy-analysis/deploy-analysis-{project}-{YYYY-MM-DD}.md`. If a file with that name already exists (same-day re-run), append `-{HHMM}` to the filename before writing.

### 10. Chat summary

Reply in chat with a compact summary:

```
✅ Deploy Analysis - Acme - 23.04.2026
• Period: 2026-04-21 14:00 → 2026-04-23 18:00
• Prod deploys: 12 commits across 3 repos
• Stage-only pending: 2 tickets (PROJ-xxxx, PROJ-yyyy)
• Env delta: infra-heavy (ECS/Vault migration), 3 minor business-code diffs
• Notion: {link}
• Local file: {path}
```

No emojis in the Notion body; the chat summary can use a single ✅ for quick scanning.

## Trigger phrases

`deploy analysis`, `аналіз деплоя`, `реліз ноутси стейджа`, `stage release notes`, `порівняння стейджа і прода`, `stage vs prod`, `що залишилось на стейджі`, `what's pending on stage`, `різниця між прод і стейдж`, `prod stage diff`

## Schedule

**Daily at 15:30 local time** under scheduled task id `deploy-analysis-daily`.

The task runs without interactive prompts. It uses `project_slug = acme` (hard-coded for now - when additional projects are added, duplicate the task with a different `project_slug` parameter or iterate over a project list inside the task prompt). Period: `since = yesterday 15:30` → `until = today 15:30`. 15:30 was chosen because:

- All morning prod deploys are typically merged by then.
- The noon daily team meeting is over.
- It's before the 16:00/17:00 client syncs, so PM has the delta fresh for that conversation.

Notification on completion is enabled (see task config).

## Known quirks

- **Never fetch.** The skill reads local refs only. Do not be tempted to "just try" `git fetch` inside the skill - corp proxy blocks Bitbucket and there are no GitHub creds in the sandbox, so it's guaranteed tokens-wasted. If refs are stale, say so in a banner and stop.
- **FE repos** (ClientPortalWeb, MiddleOfficeWeb) use the ECS Jenkinsfile where `demo` = prod. If `main` on these repos hasn't moved in months, do not report it as "no FE deploys" - read `Jenkinsfile_ecs.build` locally and check the `getDeployEnv()` function to find the actual prod branch.
- **paymentapp_migrations** submodule: the migrations repo has a huge amount of legacy stage-only noise (May 2025 "Refresh token" / "Vault" commits). Filter to `--since` within the reporting window or to tickets matching `PROJ-\d+` to keep signal clean.
- **Three-dot diffs lie**: when comparing stage vs prod environment state, always use `git diff prod..stage`, never `git diff prod...stage`. The three-dot version walks through the merge-base and can show reverted code as if it were a delta.
- **One commit often appears with two different hashes** on stage because of how `ecs_deploy → stage` merges cherry-pick the same logical change. Deduplicate by ticket key + commit message when building the release-notes table.
- **Submodule SHA missing locally** - if a parent repo's submodule pointer references a commit SHA that isn't in the local `paymentapp_migrations` clone (user pulled the parent but not the submodule), don't fetch the submodule - just flag the gap in the report and expand whatever migrations you do have locally.

## Changelog

- **2026-04-23** - v1: Initial version. Acme project only. Stage-release-notes, promotion matrix, environment delta, scheduled daily at 15:30.
