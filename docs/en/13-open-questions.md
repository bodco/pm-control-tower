# 13. Open Questions and Technical Backlog

Question numbers are never reassigned, so that links from other documents stay valid. The package version history is in the versions table of the root `README.md`; project decisions live in the Decisions DB, not here.

## Open questions (need an owner decision)

- **#42. Cron in the cloud is counted in UTC.** "07:05 Kyiv time" is `5 4 * * *` in summer and `5 5 * * *` in winter; without a manual fix twice a year every cloud routine shifts by an hour (`05`). Options: a) fix the cron twice a year from a reminder in the Tasks Tracker; b) schedule cloud tasks at times where an hour of drift does not matter (the audits on the 1st); c) keep every time-sensitive task local. No decision yet.
- **#48. A `data_policy` section in the config.** `03` describes it as a plan (`allow_llm_code_inspection`, `allow_llm_slack_reading`, `anonymize_pii`), `_template.md` does not have it and no skill reads it. The question is wider than the keys: whether the config should record the client's and the company's consent to processing work data through Claude, and what to do on a project without such consent (switch off the collectors or the whole autopilot). Until decided, the framework assumes consent exists.
- **#49. The handover pilot.** Plugin v1.1 has never been installed on anyone else's account. Closing criterion: a colleague on a clean account walks through `plugin/SETUP.md` up to the first `weekly-overview` without the author's help, and the defects found land in the backlog below. Until then the documentation and the deck call the package a beta.
- **#50. Custom document templates (v1.2.0).** The mechanism is built (`15`) but has not been run against a real company template set. Open: a) closing criterion: at least two house templates (`client-report.monthly`, `change-request.cr`) pass `template-check` with no `missing` and produce a report the PM sends without reworking the structure by hand; b) whether automatic export to a branded `.docx` / `.pptx` from a corporate file is needed, or manual export is enough; c) where to keep `_templates.md` so a plugin reinstall does not lose it (today it lives inside the plugin, like the configs).

## Closed questions

- **#11** - the global Cowork instructions have been trimmed down to the role model and meta-rules. Project facts (labels, transition IDs, team roster, versions, alias map) have been removed from the instructions: they live in `projects/<slug>.md` and are current there, while in the instructions they were stale (the old company name, people no longer on the project, the closed external-dev flow, a dead Confluence domain).
- **#43** - `notion` started working after a restart of Claude Desktop. The cause: `secrets.env` is read once when the server starts, so the updated token was not picked up. All local MCP servers work and hold no secret in JSON; the plugin's `.mcp.json` uses the same pattern.
- **#47** - the git credentials of the framework repository were removed from the remote URL: the token lives under `Secrets/` through the `store` credential helper, and the token that once sat in the URL should be reissued (a review recommendation, the PM's call). The rule "no secret outside `Secrets/`" now covers git too.

## Technical backlog (Claude's work, no owner decision needed)

Prioritized during the optimization pass (`07`). An item that has sat through two passes in a row without movement either gets a date or is deleted.

| # | Item | State |
|---|---|---|
| T1 | Port the plugin v1.1 fixes into the author's live engines (relation names in `topic-manager` and `mac-mail-collector`, the `api_access` check in `jira-management`, the Data Completeness header where it was missing) through cards, without touching the project adapters | pending |
| T2 | Run the `task_tracker.api_access: false` branch on a real project without an API (case C from `08`) and record what exactly degrades | pending |
| T3 | Confluence skills (meeting-notes-to-confluence, weekly-status-to-confluence, decision-log-to-confluence) on top of the local `confluence` MCP | pending, the connector works |
| T4 | `methodology`: sprint length and capacity source in `pm_profile`, `sprint-planning-prep` for Scrum projects (`03`) | pending |
| T5 | Track calibration hours against hours saved for at least a month, so that the "a full working day per week" from `11` has the other half of the balance | pending |
| T6 | An anonymization map (real name → pseudonym) as a private file outside the repository, so that anonymizing documents is not done from memory | pending |
| T7 | A PM voice profile for `inbox-responder` and `client-report` drafts (tone, length, signature) as a PM Profile section | pending |
| T8 | Setting fixVersion `vYYYY-MM` on Done tickets automatically on the 1st (manual today, `06` domain 3) | pending |
| T9 | A regression checklist skill for a project without QA (`06` domain 7) | pending |
| T10 | A risk → task link into the Tasks Tracker from `risk-register` (`06` domain 6) | pending |

## What to do when we come back to the second agent (not now, status: beta, frozen)

The reverse step of the `.ai/` protocol (Gemini reviews a decision that Claude made from its brief) is described and should be moved into `09-gemini-optional-layer.md` when the topic becomes active again.
