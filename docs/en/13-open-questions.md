# 13. Open Questions

**There are no open questions**. This is the first day the list is empty.

The history of all decisions is in the Changelog in `README.md`. Work that Claude does on its own and that does not require an owner decision is in the "Claude Technical Backlog" section in the same place. Numbers of closed questions are not reassigned, so that links from other documents stay valid.

**Closed questions:**

- **#11** - the global Cowork instructions have been trimmed down to the role model and meta-rules. Project facts (labels, transition IDs, team roster, versions, alias map) have been removed from the instructions: they live in `projects/<slug>.md` and are current there, while in the instructions they were stale (the old company name, people who have not been on the project since July, the closed external-dev flow, a dead Confluence domain).
- **#43** - `notion` started working after a restart of Claude Desktop. The cause: `secrets.env` is read once when the server starts, so the updated token was not picked up. All four local MCP servers work and hold no secret in JSON.

## What to do when we come back to the second agent (not now, status: beta)

The reverse step of the `.ai/` protocol (Gemini reviews a decision that Claude made from its brief) is described and should be moved into `09-gemini-optional-layer.md` when the topic becomes active again.
