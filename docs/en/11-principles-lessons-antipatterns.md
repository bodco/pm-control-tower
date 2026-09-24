# 11. Lessons, antipatterns, security

## Lessons from a year (what I would tell myself in summer 2025)

1. **Start small, iterate.** One skill (daily prep), then the next one once the first delivered value. Trying to automate everything at once gives you ten reports nobody trusts.
2. **Global memory + configs = superpower.** CLAUDE.md / global instructions for "who I am and how to work", the `projects/` registry for "what is true about the project right now". Skills are reusable across projects only thanks to that split.
3. **Natural language ≫ commands.** "Prep me for the daily" works, `/daily-prep --project acme` never catches on.
4. **Keep the context alive.** Project state changes every week; a config that was not updated the same day makes every report untrue a month later. Hence the Changelog, "as of" dates, the Decisions DB and the monthly Automation Health Check.
5. **Separate the engines from the project facts.** This is the lesson of August 2026: when the team shrank from 9 to 3 and half the repos went to the client, we had to rewrite dozens of skills that "knew" the old reality. Once the facts moved into the config, a change of state = one file.
6. **A skill is born out of routine, not out of documentation.** Catch the "I am asking the same thing again" moment, capture it, debug it in chat, document it as you go.
7. **Tokens are money and time.** Expensive tasks must have a cheap entry point: a light scan, exit if there is no trigger. Incremental tasks do not rescan history. The autopilot does not run `git fetch` where the proxy blocks it.
8. **Verification matters more than generation.** The five laws of `acme-env-audit` grew out of real mistakes: exact ref matching, content instead of SHA, both directions before saying "X == Y", inspecting the matched files, attribution only from `git log`. Every autopilot report is a draft with sources.
9. **The Notion API has traps.** 2000 characters per block, exact property names (once even with emoji), no SQL without Enterprise, data source ID instead of database ID. Each one cost hours.
10. **One linking key.** The Jira key in file names, in risks, in reports, in `.ai/`. A date in the file name creates collisions and adds nothing.
11. **One writer per file.** Once a second agent appeared, race conditions became real. Signal through the appearance of a file, not through a shared status.
12. **Client culture is data.** A client from a high-context culture says "yes" and feels something else. Without cultural calibration, sentiment analysis is meaningless. The Culture Map in the config turned guesses into rules.
13. **Read between the lines, but write down literally.** A topic the client stopped mentioning after two attempts is more serious than any direct complaint. But only what was actually said goes into the Decisions DB, with an author and a date.
14. **Not everything needs to be unified.** The 80% core (Notion CT, Tasks Tracker, mail, rhythm, configs, engines) transfers as is; the 20% on each project are adapters for the client's stack, and that is fine. Trying to abstract every tracker in the world is doomed.
15. **The client may not give you an API, and that is not the end.** The client's infosec (SSO, Okta, MDM) often forbids tokens for agents. The config records `api_access: false` and a fallback; the engines degrade with dignity: manual export, action items from meetings, mail. The Mail.app pipeline exists precisely because mail is the one channel that is always there.
16. **Tasks Tracker is for the PM's capacity, not for the team.** One database for all projects and life lets you see the total time limit; scattering tasks across client trackers = the illusion of free time.
17. **Degradation has to be visible.** Frozen components: in the skills with a HISTORICAL marker, in the config with dates, in the reports with annotations about non-comparability. Otherwise the chart reads like the team collapsing.
18. **Completeness of context is not traded for convenience.** The most expensive mistake when choosing a collector is ranking the options by implementation cost. The right first criterion: does the mode preserve **everything**. Partial collection is worse than none, because the system looks full while the reports are built on a leaky sample, and nobody sees it. Email notifications and "we will read the last messages in the browser" are not a compromise, they are outside the set of acceptable solutions. Slow and fragile is acceptable, selective is not.
19. **Degradation is allowed for derived data, not for primary data.** A ticket status, a metric, a prep can be computed from a manual export or skipped with a line saying "source unavailable": the data has not gone anywhere, it can be recomputed tomorrow. Messages and meetings do not work that way: what was not recorded today is gone forever. That is why the engines have a fallback and the collectors do not.
20. **Documentation is not proof.** A rule that the docs describe as active may be missing from the live skill (the card did not save, or it was overwritten). The state of a skill is verified by grepping the synced copy after every save.
21. **A library with no wiring is dead.** The PM Toolkit sat in Notion next to the system for a year and influenced not a single report. The value appeared once the standard got one machine-readable home (`_standards.md`) and a rule that the engines read it at Step 0 (`14`).
22. **General work stays general.** While building the framework, do not sort out project-specific discrepancies along the way (contracts, people's hours): they go into their own project context, otherwise the general work dissolves.
23. **A time marker is not a filter.** The mail collector took only files newer than `.last_cowork_scan` and silently lost messages exported later (Mail.app had been closed, a slow sync): their files turned out older than the marker. On a real project three client threads went missing this way. The queue is defined by location (`incoming/` = unprocessed), not by time; the marker is informational only. The same goes for the prep window: a stale previous report is not an anchor, the window comes from the calendar.

## Antipatterns (what breaks the system most often)

| Antipattern | Why it is bad | What to do instead |
|---|---|---|
| A project fact in the body of a skill | desync when the state changes, you edit N skills | config + `{config.xxx}` |
| A skill silently picks a default project | mixing projects, the worst kind of failure | Default Project Rule: ask |
| An engine dies with "Jira MCP unavailable" on a project with no API | the PM decides the framework is "not for his project" | `task_tracker.api_access` in the config + fallback + export date in the report |
| Trying to build an engine from the very first adapter | an abstraction built for one case, which breaks on the second | the adapter lives with the project prefix until the scenario repeats on a second project |
| The PM's tasks scattered across client trackers | the total load is invisible, overload | everything in Tasks Tracker, in Jira only a reference via `Jira Issue Key` |
| A report not saved to the Reports DB | the result gets lost in chat | the Report Storage section is mandatory |
| A scheduled task prompt that retells the skill | two sources of truth, drift | the prompt references the skill and sets only project, period, mode |
| Switching on the autopilot before a manual run | distrust in the system from day one | three manual runs, then the schedule |
| Automatic sending to the client | reputational risk, cultural mistakes | draft → human |
| Removing an "old" person from the config | history becomes unreadable, past reports break | Former Members with a date |
| `git fetch` in a cloud session | hangs behind the proxy, burned tokens | local refs, fetch manually |
| `.md` in the project root | clutter, "what here is current?" | `.ai/investigations/`, `.ai/reports/` or nowhere |
| Claude edits `current.md` | race condition, loss of state | a report; the status is set by Gemini |
| A brief that retells the architecture | duplicating the KB, burned tokens | `sources` + constraints, Claude takes the rest from the KB |
| A constraint with no attribution | impossible to judge how current it is | `[source, date, who said it]` |
| A QA fail over a technical doubt | outside the reviewer's competence | the question goes into the QA note, the verdict does not change |
| More than 2 QA rounds | ping-pong with no arbiter | `escalated`, three sentences to a human |
| A skill description over 1024 characters | sync rejects it | make it shorter, move the triggers into the body |
| A date-stamped fact not checked for 90+ days | silent staleness | Automation Health Check, re-verification |
| A chart across the team-change date with no annotation | reads like a collapse | Metric Continuity warning in the config |
| A collector filtering by a time marker (`-newer`) | late-exported data is lost for good, silently | the queue is the `incoming/` folder, the marker is informational; an old buffer goes to `backlog/` |

## Security and privacy

**What never goes into skills, `.ai/`, repositories:** credentials, tokens, `.env`, dumps with personal data. The violation that the review marked P0 (a Sentry token in the `acme.md` config, which is synced to the cloud) has been **fixed**: the token moved to `~/work/Secrets/secrets.env` (chmod 600, outside the skill sync), the config keeps only `token_env` and the path to the file, and the skills that need Sentry (`sentry-assistant`, `stability-scan`, `daily-team-prep`, `client-report`, `weekly-overview`) read the value at runtime via `grep`+`cut` and never print it. The same pattern covers all local MCP servers (the plugin's `.mcp.json` launches them via `sh -c` with no value in the JSON) and git credentials (the `store` credential helper with a file under `Secrets/`, a remote URL without a token; `13` #43, #47). When the framework is handed over to a colleague, the `Secrets/` folder is not handed over: the colleague creates their own from `plugin/templates/secrets.env.example`. A token that once sat in a synced config should be reissued: that is the PM's call.

**Sentiment reports about the client:** `client-satisfaction-tracker` builds psychological profiles of the client's people. `Visibility: Internal` in the Reports DB does not protect against human error (sharing the parent page, guest access). The options (the PM decides): a separate closed database with its own access rights, or storing them only locally on the PM's disk with a link in Reports.

**Client context:** transcripts, quotes, names, sentiment reports are internal only. `client-satisfaction-tracker` is never shown to the client. `.ai/tasks/`, `investigations/`, `current.md` go into `.gitignore`. External reports are sanitized (no Notion/Slack links, no internal names, roles instead of people).

**Agent permissions:** writing to external systems is limited and explicit: Jira tickets from stability-scan, Notion pages, a comment in a Slack thread only as a reply to an explicit `REVIEW:`. No messages to the client, no changes in production systems without a human. The boundary is formalized by the **5-minute rule** (`projects/SKILL.md`): without confirmation the agent writes only where the consequence can be undone within 5 minutes (a Notion page or row, a draft, a comment in its own thread, a ticket in its own Jira project); anything that cannot be undone within 5 minutes (a message to the client, a change on the client's board, production, deletion) waits for the human.

**Cloud sessions:** they see the Mac only through the bridge and only the connected folders. Tasks that need the disk must be local.

**Corporate changes:** the corporate domain migration (the wiki and mail moved to a new domain) showed that URLs and addresses must live in one place (the config, the Internal Infrastructure section) with the rule "read old links as historical, do not rewrite local paths".

## Economics

- The claim "80% of routine PM work is automated" (workshop, April 2026) applies to domains 3-9, 11-13 from the `06` matrix. In time: roughly a full working day per week.
- Cost: Claude Max, Notion, the time for the config (a day) and calibration (15 min/day for a month). Tokens: the most expensive are stability-scan with logs, KB-driven code review, the one-off history migration. The cheapest are the prep skills.
- Cost risk: a badly written scheduled task can burn tokens every day for nothing (hence the cheap-entry rule).

## What I would change if I started over

1. A config registry from day one, not a year later.
2. The Decisions DB from the first meeting, not after the history became impossible to re-read.
3. The `.ai/` structure (or at least a ban on `.md` in the root) before the first generated file.
4. Hire a second agent only after the Decision Log, not before.
5. Email registries in the config right away, not in two collectors.
