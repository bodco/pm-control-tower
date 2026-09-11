---
name: change-request
description: "Scope-change engine for any registered project: sorts every client ask into bucket A (trivial, log only), B (real, hours) or C (looks small but touches data, money, security or public contracts), keeps a per-project Extras Log including free work, drafts a client-facing Change Request in English, records the client's decision in the Decisions DB, and watches the goodwill budget. Follows projects/_standards.md and the PM Profile. Never defaults to a project, never sends anything. Use when the user mentions \"change request\", \"CR\", \"зміна скоупу\", \"scope change\", \"клієнт просить додати\", \"хотєлка\", \"дрібна доробка\", \"extras log\", \"що ми зробили понад скоуп\", \"goodwill\", \"CR approved\", \"клієнт погодив CR\", or when inbox-responder or a scheduled run hands over threads with Category Scope Change."
---

# Change Request

Small asks are the currency of the relationship; the danger is doing them invisibly and
without limit (Toolkit: "Scope creep & гра в маленькі хотєлки"). This skill makes every
ask visible, sized by risk rather than by how small it looks, and turns the ones that
need it into a Change Request the PM can send.

## Execution rules

- Allowed questions: which project (Default Project Rule); which request if several are
  in scope; the bucket when the evidence is truly split between A and B.
- **Estimates come from the assignee** (`_standards.md` section 10). The skill never
  proposes hours or money. Missing estimate = "TBD: estimate pending from {role}" and a
  task for the PM to get it.
- **No prices without a rate.** The config has no rates; budget impact is hours unless the
  PM gives a figure.
- **Nothing is sent to the client**, and nothing is committed on the team's behalf.
- Internal notes Ukrainian; the CR itself in `{config.client_language}` (English).

## Step 0 - Project, config, standards, sources

1. Project from the request, the thread's `Project` relation, or a ticket key. Not clear →
   ask (list the configs in `projects/`).
2. Read `../projects/{project_slug}.md` (fallback Glob `**/projects/{project_slug}.md`),
   `../projects/_standards.md` and `../projects/SKILL.md`.
3. From the config: `pm_profile.contract` (type, `hours_cap_month`), `pm_profile.decision_rights`
   (`scope_priorities`, `estimates`, `budget_margin`), Assignment Rules, Team - Client,
   Engagement Status / Scope of Responsibility, `pm_profile.documents.extras_log_page_id`
   and `pm_profile.goodwill_budget_pct` if present.
4. Goodwill budget: `pm_profile.goodwill_budget_pct` if present, else **10% of
   `hours_cap_month`** (калібрувати; Toolkit orientir 10-15% of capacity). No cap →
   count items and hours only, no percentage, and say so.
5. Open every report with the Data Completeness header.

## Step 1 - Collect the asks

Inputs, any of:
- a Threads DB page (the usual path: `inbox-responder` sets Category `Scope Change`);
- a meeting page (Meetings DB) or a quote pasted by the PM;
- **batch mode** ("пройдись по scope change за тиждень"): Threads for the project in the
  period with Category `Scope Change`, plus meeting pages in the period searched for
  "can we add", "what if", "would it be possible", "а якщо", "додати", "ще одне". Skip
  asks already present in the Extras Log (match by source link, then by meaning).

Out-of-scope components (Scope of Responsibility marks them client-owned) are not CRs
for us: log them as "not ours" and draft a polite pointer for the PM.

## Step 2 - Bucket (size by risk, not by look)

| Bucket | Rule | Action |
|---|---|---|
| **C** | touches the data model or DB schema, money or transaction consistency, auth / roles / multitenancy, security or compliance, a public API contract, a vendor or external dependency, or anything on the one-way list in `_standards.md` section 9 | full CR, always, whatever the size; Decision later with `Door = One-way` |
| **B** | real work (hours per the assignee), none of the C triggers | log; propose "slot into planned work" or a small CR (PM chooses) |
| **A** | trivial inline change (< 30 min per the assignee), none of the C triggers | log only, even if free |

No estimate yet and no C trigger → provisional B with "estimate pending". Explain the
bucket in one line of evidence (the quote and what it touches).

## Step 3 - Extras Log (per project, includes free work)

A page "Scope & Extras Log - {project_name}" under the project page. Find it by
`pm_profile.documents.extras_log_page_id`, else by title under the project page; if it
does not exist, create it with this table and output the config patch line for its ID:

| Date | Request | Source | Bucket | ~Hours (by whom) | Billed | CR | Status |
|---|---|---|---|---|---|---|---|

Status: `logged`, `in CR`, `approved`, `rejected`, `done`, `not ours`. `Billed`:
`free`, `billable`, `TBD`. Append one row per ask; never delete rows.

## Step 4 - Change Request draft (B on request, C always)

Client-facing, English, from the Toolkit CR template:

```
# Change Request CR-{nn}: {short title}
Project: {project_name} · Date: {date} · Prepared by: {PM name from the config}

## Requested change
{what exactly is asked, in the client's words where possible}

## Reason / context
{why it is needed, as the client stated it}

## Impact
| Scope | Time | Budget | Risks |
|---|---|---|---|
| {what changes or is displaced} | {+days per the assignee, or "TBD - estimate pending"} | {hours; money only if the PM provided a figure} | {C triggers, dependencies} |

## Options
1. Accept as a change: {impact above}
2. Alternative: {smaller or phased version, if one exists}
3. Defer: {to when, and what happens meanwhile}

## Our recommendation
{accept / alternative / defer, with one reason}

## Decision needed from you
{who (from decision_rights / Team - Client), by when, what happens if no decision}
```

Numbering `CR-{nn}`: next number from the Extras Log. Contract lens for the internal note:
fixed-price → CR protects margin, no work before approval; T&M or capped T&M → CR is a
priority trade-off and makes hours visible against the cap.

Internal note for the PM (Ukrainian, chat + the Extras Log row): bucket rationale,
contract lens, goodwill budget state, precedent warning if the same kind of ask was done
free before ("керуй прецедентом").

Storage: Reports DB, Type `Change Request` (create option if missing), Skill
`change-request` (create option if missing), Visibility `External`, Summary = one line.
Body = the client-facing CR only. Tasks Tracker: "Надіслати CR-{nn} клієнту"
(Source `change-request`, due in 2 working days) and, if needed, "Отримати оцінку
CR-{nn} від {assignee}".

## Step 5 - Client decision

When the PM reports the outcome ("CR-03 approved by Client PM"):
- Decisions DB row: Decision "CR-{nn} {approved/rejected}: {title}", Area `Scope`,
  Stated by = the client person, Source = the email / meeting / thread link, Context,
  Alternatives rejected (from Options), Trade-off (what is displaced), Review trigger if
  any, `Door = One-way` for bucket C.
- Extras Log row status; the CR page in Reports gets a line "Decision: ... on {date}".
- If milestones or the cap change → config patch for `pm_profile.milestones` /
  `pm_profile.contract` (the PM uploads it; never claim it is applied).

## Step 6 - Goodwill monitor (batch and monthly)

For the month: free hours from the Extras Log vs the goodwill budget, count of A/B/C,
share of B/C done without a CR. Overflow signals (`_standards.md` + Toolkit): free extras
above budget; planned work slipping while extras grow; the team working evenings for
extras; the client treating small = free and instant; an "A" that turned out to be C.
- Above budget or any overflow signal → propose a Risks DB entry (Category `Scope`,
  `Kind = Risk`, Visibility `Internal`); create it with Status `Claude` only if the user
  agrees or this is the scheduled run.
- Client transparency block (English) for the monthly client report, optional for the PM:
  "For transparency: delivered beyond the agreed scope this month" with the free items in
  client language. `client-report` may include it; the PM decides.

## Chat output

Ukrainian: completeness header, table of asks with bucket and next action, CR drafts
created (links), goodwill state, config patches, tasks created.

## Critical pitfalls

1. Size by risk, not by look: one C trigger makes it C.
2. Never invent hours, days or money.
3. Log free work too; invisible generosity is the problem this skill exists for.
4. Never promise delivery or dates in the PM's name; the CR offers options.
5. Client-owned components are not our CRs.
6. Relations are `Project` and `Workspace`; never write one project's asks into another's log.