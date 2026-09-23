# 09. Optional layer: Gemini as a second agent

## Why a second agent if Claude Cowork is already there

Two real problems that showed up after a year of work:

1. **Volume of history.** A year of meetings and transcripts has piled up in Notion. Claude Cowork cannot process that mass in a single request without losing context. Every brief for an engineering task turned into a separate investigation of "what did we agree on", and the result was non-deterministic: two runs produced different constraints.
2. **Project clutter.** The root of `~/work/acme/` had grown dozens of generated `.md` files (29 files plus the investigations and reports folders) with no structure. Nobody knew what was current.

The solution (September 2026): Gemini (Desktop on Mac, Spark mode, with Notion MCP) as the **archivist and strategist** with a huge context window, which pulls dry facts and constraints out of Notion into structured briefs; Claude Cowork as the **local engineer** which executes the brief in the codebase without informational noise. Interaction happens only through files, following a protocol.

This really is an optional layer: the framework is fully workable without it. Its functions are partly covered by the Decisions DB, the Current State pages, the Monthly Memory Digest and Claude's own Notion MCP.

## Role matrix

| Area | Gemini (Spark + Notion MCP) | Claude Cowork |
|---|---|---|
| Memory and source of truth | decision history in Notion, a year of transcripts, Topics | the current codebase, local configs, DB state, branches, envs, logs, Sentry |
| Incoming flow | raw requests and bug reports → determines the topic, updates the Topics DB | a focused 1-2 page brief from the file system |
| Execution | does not write code, does not change project files, does not touch the terminal | writes code, investigates, fixes bugs, produces reports |
| File discipline | sole writer of `.ai/tasks/`, `current.md`, QA notes, `archive/` | sole writer of `.ai/investigations/`, `.ai/reports/<id>.md` |
| QA | checks decisions against the agreements in Notion | challenges outdated agreements via `challenged_constraints` |
| Arbitration | escalates | escalates |
| The PM | priorities, deadlines, the client, arbitration; the only one who edits CONTRACT.md | |

The main ownership boundary rule: **Gemini does not explain to Claude how the system works. Claude does not reconstruct what was agreed.**

## The `.ai/` protocol (CONTRACT v1.0)

`CONTRACT.md` lives in the `.ai/` of each project and is not in this repository: below is an extract of the rules, enough to understand the protocol and reproduce it. The structure in the root of every project:

```
<project-root>/.ai/
  CONTRACT.md          the protocol, written by a human only
  README.md            cheat sheet
  current.md           pointer to the active task, written by Gemini only
  templates/           task / report / qa-note
  tasks/               briefs, written by Gemini only         PROJ-1234-pse-navigation.md
  investigations/      technical analysis, written by Claude  PROJ-1234-auth-trace.md
  reports/             Claude reports + Gemini QA notes       PROJ-1234-pse-navigation.md, .qa-1.md
  archive/YYYY-MM/     finished tasks
  archive/pre-protocol/  everything that predates the protocol, sorted into categories
```

Key rules:
- **One writer per file.** An agent never edits another agent's file, not even to fix a status. A correction = a new file. Claude never updates `current.md`.
- **The signal is the appearance of a file**, not a status change: idempotent, with no race condition (the agents run in different environments, and the shared FS is an exchange of snapshots).
- **Naming** `<JIRA-KEY>-<slug>`, with no date in the name; with no ticket, `NOJIRA-<YYYYMMDD>-<slug>`, renamed later.
- **Lifecycle**: `ready_for_claude → in_progress → awaiting_qa → qa_passed → archived`, with the branches `qa_failed` (max. 2 rounds, then `escalated`) and `blocked`.
- **QA checks** only conformance to agreements, the DoD, Out of scope, and the completeness of the report. **QA has no right** to rule on technical correctness, performance, security or the correctness of a diagnosis: technical doubts go in as questions, not as `failed`.
- **`challenged_constraints`**: Claude is obliged to raise a constraint if the code/DB/envs prove that it is dead, with evidence; Gemini is obliged to answer `upheld` / `obsolete` (updates the Decision Log as superseded) / `escalate`. A QA note without this section is invalid.
- **Decision Log** (Decisions DB in Notion) is a prerequisite: constraints go into the brief from there (a cheap lookup), not from a fresh scan of transcripts; `notion-project-brief` appends new decisions after every processed meeting.
- **Git and privacy**: `tasks/`, `current.md`, `investigations/` are not committed (client context, names); `CONTRACT.md`, `README.md`, `templates/` are committed; `reports/` selectively, after proofreading. No credentials in `.ai/`.
- **Hygiene**: only the artifacts of active tasks live side by side; more than five and the protocol is not working as intended.

Claude's order of actions at the start: read CONTRACT → `current.md` → (if `qa_failed`) the latest QA note → the brief → the specific `sources` needed → work → report. Do not start if the status is not `ready_for_claude` or `qa_failed`.

## Gemini skills

### `notion-project-brief` (Context Archaeologist & Task Architect, CONTRACT v1.1)
1. Find or create a topic in the Topics DB (no topic → `confidence: low` + a mandatory open question about verifying the state).
2. Pull context from transcripts and documents strictly within the project. A Jira key only if it is present verbatim in the source, never interpolate neighbouring keys. One brief = one result for one ticket.
3. Write the brief to a strict template: frontmatter (id, jira, project, type, expected_mode, deadline, env, repos, branch, suggested_skill from an allowed list, sources with exact URLs, confidence), sections Task / Context (quotes with dates and speakers) / Constraints and precedents (each with a source) / Already tried and rejected / DoD / Out of scope / Open questions.
4. Update `current.md` (single-writer).
Hard prohibition: do not state the status of work as fact; statements from transcripts are quoted as the opinions of speakers `[Speaker, Date]`.

Launch in Gemini Spark: "Prepare a brief for project acme on the payment provider migration topic" or "acme: the client writes that webhooks on staging are dropping with a timeout. Make a brief."

### `project-decision-qa` (Constraint Validator)
Reads Claude's report, processes `challenged_constraints`, checks it against Notion, writes `.qa-N.md`, sets `qa_passed` + archives, or `qa_failed` with a list of fixes. Launch: "Do QA on PROJ-2362 in project acme".

## What it looks like for the PM

1. A request comes in (client, meeting, own idea). The PM tells Gemini one sentence.
2. Gemini puts the brief in `.ai/tasks/` and updates `current.md`. If they want, the PM reads the brief (2 pages) and edits it by hand only through Gemini.
3. The PM tells Claude "take the current task from .ai" (or Claude reads `current.md` itself at the start of the session). Claude executes and writes a report.
4. The PM tells Gemini "do QA". The verdict goes into `.ai/reports/`. If `qa_failed`, Claude does round 2. After 2 rounds, three sentences for the PM: what Gemini demands, what Claude did, and where the conflict is.
5. Archiving. The Decisions DB is topped up along the way.

## When NOT to turn this layer on

- The project is young and its history fits into Current State and Decisions: Claude will read Notion itself through its own MCP.
- There are no regular engineering tasks with briefs: the protocol has nothing to serve.
- There is no Decision Log discipline: without it every brief is expensive and non-deterministic, and the protocol just moves the chaos into files.
- The PM is not ready to be the arbiter: two agents without an arbiter go in circles.

## Current state

Status of the layer: beta, frozen until a successful pilot. The protocol is rolled out in three projects (`acme`, `Delta`, `Gamma`). The root of `acme` has been cleaned up: the old files are in `.ai/archive/pre-protocol/` by category (code-reviews, investigations, specs, qa, deploys, docs, reports) with an INDEX.md. The first real tasks through the protocol are still ahead; the rule "make the first task a small one" stands.

A review called the protocol "paper" and that is a fair assessment. The criterion for a successful pilot (accepted): **3 consecutive engineering tasks of different types** (1 bugfix, 1 refactoring, 1 new feature) pass the full cycle of a Gemini brief → Claude execution → Gemini QA → `qa_passed` without manual fixing of the protocol syntax. Until the pilot closes, this layer is not offered to colleagues.

What has to be closed before the pilot:
- The Decisions DB schema is aligned with section 9 of CONTRACT with two deliberate deviations (`Rationale` was not added, `Context` plays its role; there is no `Disputed` status, a disagreement is recorded as a comment): it has `Alternatives rejected`, `Stated by`, the `Superseded By` / `Supersedes` relation, `Trade-off`, `Review trigger`, `Door` (`02`). What remains is to update CONTRACT for these two deviations and check that `notion-project-brief` writes into exactly these fields.
- The one-off migration of a year of decision history has not been done. The review's recommendation: have Gemini do it in a single batch run (the context window), with the result as a structured list to be loaded into Decisions through the Notion API; Claude would lose coherence at that volume.

An extension that the review supported: `notion-project-brief` for non-engineering tasks (SOW negotiations, escalation letters) via the subtype `type: negotiation_brief | commercial_brief`.

## What you can take without Gemini

The `.ai/` protocol itself is useful even with a single agent: no `.md` files in the project root, `investigations/` and `reports/` as the only places for generated material, naming by Jira key, `archive/` by month. That removes the clutter even without a second agent. The role of "strategist" is then played by the PM through the Decisions DB and Current State.
