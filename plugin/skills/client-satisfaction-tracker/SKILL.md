---
name: "client-satisfaction-tracker"
description: "Analyzes client tone and sentiment across Slack, Notion Threads DB (Email-type entries, collected on its own schedule by mac-mail-collector) and Notion meeting transcripts for a project to detect satisfaction shifts, frustration signals, appreciation moments, and early disengagement warnings. Produces a sentiment trend report with actionable insights. Use whenever the user mentions client satisfaction, client sentiment, задоволеність клієнта, настрій клієнта, як там клієнт, is the client happy, client mood, client health, check client tone, тон клієнта, атмосфера з клієнтом, сигнали незадоволення, early warning, or any request to assess how the client feels about the project. When triggered, execute immediately. Default period: last 30 days. Never default the project silently - ask if not named (Default Project Rule)."
---

# Client Satisfaction Tracker

Analyzes client communication across Slack, email, and meeting transcripts to detect satisfaction trends, frustration signals, and early warnings before they become escalations. The goal is to make client mood **visible and trendable**, not just anecdotal.

## CRITICAL: Execution Rules

**DO NOT ask for confirmation. DO NOT generate prompts for user to copy. Start executing immediately.**

The ONLY questions allowed:
- If the project is not explicitly named - ask which project (never default silently; Default Project Rule in projects/SKILL.md)
- If period is ambiguous - ask (default: last 30 days)

---

## Project Config

**Step 0 - always run first:**

1. Determine the project from the user's request. If the project is NOT explicitly named, do not guess and do not default: ask the user which project (list the configs in `projects/`). See the Default Project Rule in projects/SKILL.md.
2. Read the project config `../projects/{project_slug}.md` relative to this skill's folder; if that fails, Glob `**/projects/{project_slug}.md` under the skills directory.
3. All supplementary context (Notion DB IDs, team roster, transcript aliases, email routing, Cultural Profile) lives in the same `projects/{project_slug}.md`. Also read `projects/SKILL.md` for the cross-cutting rules. Writes allowed without asking (the 5-minute rule): the report page only. This report is `Visibility: Internal` and is never shown to the client.
4. Curly-brace tokens like `{config.notion.meetings_db}` below name a real config value (a YAML key or a clearly labeled field). Where the config carries the same information as a markdown table instead of a scalar value (client roster, transcript aliases), this skill says so explicitly and reads the table - it does not invent a fake key for it.

From the config, extract specifically:
- **Client team roster** - the "Team - Client" table in the project config (Name / Role / Notes columns). Match Slack/email/transcript authors against the Name column.
- `{config.slack.slack_access}` (`mcp | mcp_local | chrome | none`; `none` = skip Slack with one header line) and `{config.slack.channels_all}` - channels to scan, resolved to IDs through `{config.slack.channel_ids}` (channels may be private: resolve by ID, not by name search)
- `{config.notion.threads_db}` - Threads DB ID. This is the source for BOTH Slack-collected and email-collected client communication (see "Email" below).
- `{config.notion.meetings_db}` - Meetings DB ID. See "Notion" in the project config.
- **Transcript Alias Map** - the "Transcript Alias Map" table in the project config, not a scalar key
- **Cultural Profile** - `{config.cultural_profile.client_country}`, the scales table and the "Downgrader multipliers" table. A multiplier > 1 for a person means they soften bad news: scale the seriousness of their indirect wording by it. When the section is `unknown`, use no multipliers and say `Cultural Profile: SKIPPED` in the header; never hardcode a country or a person here.

If config missing in both paths, or the "Team - Client" table is empty: tell user and stop.

---

## Data Collection

### 1. Slack - Client Messages

For each channel ID in `{config.slack.channels_all}`:
- `slack_read_channel` (or the project's configured Slack access method - see `slack-collector`'s access table if the config's `slack_access` is not `mcp`) with time window = requested period
- Filter to messages where author matches any name/handle in the "Team - Client" roster
- Also capture threads where client members replied to team messages
- For each client message, save: timestamp, author, channel, text, thread context (parent message if reply), reactions

### 2. Email - Client Threads (via Notion Threads DB)

`mac-mail-collector` runs on its own daily schedule (independent of this skill) and writes matching email threads from the Mail.app buffer (`~/work/Mail/`) straight into the project's Notion **Threads DB** (`{config.notion.threads_db}`), tagged `Type` = `Email` (as opposed to `Slack`, `Signal`, `Zoom`, `Other`), with a `Project` relation and a `Reported at` date.

**Do NOT invoke or wait on `mac-mail-collector` from this skill.** Take whatever is already sitting in the Threads DB at the moment this skill runs - this skill is a read-only consumer of that inbox, not a trigger for it. If mac-mail-collector hasn't run recently or missed something, that's a gap to note in the report ("email: Threads DB had no newer sync since X"), not something to chase mid-run.

To collect:
1. Query the Threads DB (fetch the data source with `notion-fetch` and filter, or `notion-query-data-sources` when the plan allows) filtered to: `Type` contains `Email`, `Project` relation contains the project's `project_page_id`, and `Reported at` within the requested period.
2. Each result's `Description` property is a short LLM-written summary of the thread (not the raw email body) - it usually names the sender inline (e.g. "from client.pm@example-client.com", "Client Dev (Client Co)", "Client AM (Client Co)"). There is no separate structured "From" field - read the sender out of the `Description` text, and cross-check the name/email against `email_routing.client_emails` (client) vs `email_routing.team_emails` / our company domain (internal) in the project config. Do not score a thread as client sentiment unless the sender is clearly a client roster member.
3. `Thread Name` (title) and `Email Link` (a `message://...` URI, not a web link - do not try to open it, just cite it as a reference) round out what you need per thread.
4. Treat each thread's `Description` as a paraphrased summary, not a verbatim quote - when quoting client tone in the report, only quote text that the Description itself renders as a direct quote (e.g. after "Client Dev:" or similar), and otherwise describe the content in your own words rather than presenting a paraphrase as verbatim.

**If the Threads DB has no email entries for the period:**
- If `{config.gmail.client_search_filter}` is set (not `none`), the PM keeps client mail in Gmail: use `gmail_search_messages` with that filter and the period, `gmail_read_thread` for full content. This is the only case in which the skill touches Gmail.
- Otherwise skip email collection for this run and say so in the header (`Email SKIPPED (no configured source)`) - do not guess a search filter and do not search the Knowledge Base for address lists; the Threads DB is the source of truth for collected email.

For each matching thread: date (`Reported at`), sender (parsed from `Description`), thread title, summarized content, `Email Link` reference.

### 3. Notion Meetings - Client Statements

Search meetings in period:
```
notion-search(query: "{config.project_name}", data_source_url: "{config.notion.meetings_db}")
```

For each meeting in period, `notion-fetch` the content. Scan transcript for quotes from client team members. Use the project config's Transcript Alias Map table to resolve names (e.g. "Client Ops" → "Client Ops").

Extract client statements with: meeting date, speaker, quote, surrounding context.

---

## Sentiment Analysis

For each client message/statement, classify:

### Polarity
- **Positive (+1)**: appreciation, praise, satisfaction, enthusiasm
- **Neutral (0)**: factual, procedural, informational
- **Negative (-1)**: frustration, criticism, concern, impatience
- **Strong Negative (-2)**: anger, disappointment, escalation, trust erosion

### Signal Categories

Tag each non-neutral message with applicable signals:

**Positive signals:**
- `appreciation` - "thank you", "great work", "well done", "дякую"
- `trust` - "we trust your decision", "up to you", "you decide"
- `enthusiasm` - "excited", "love this", "can't wait", "чудово"
- `partnership` - "we", "together", "our team" (inclusive language)

**Warning signals (escalating severity):**
- `impatience` - "still waiting", "when will", "коли ж", "urgency", deadline pressure without cause
- `disappointment` - "expected", "thought it would", "hoped for"
- `confusion` - repeated clarifying questions, "I don't understand", "can you explain again"
- `second-guessing` - "are you sure", "have you verified", increased verification requests
- `frustration` - direct negative language, "this is not working", "unacceptable"
- `distrust` - "prove it", "show me evidence", demanding audits/reviews
- `escalation_language` - CC'ing executives, formal tone shift, "we need to escalate"
- `disengagement` - reduced response frequency, shorter replies, "whatever you think"
- `comparison` - "the other vendor", "previously we had", "I wonder if..."

### Scoring per Client Member

For each client team member in the "Team - Client" roster:

```
period_score = sum(polarity * signal_weight) / message_count
```

Where `signal_weight = 1.0` base, `1.5` for warning signals, `2.0` for strong warnings.

### Trend Comparison

If this is not the first run for the period, compare against the **previous period** (same length):
- Calculate previous period score per client member
- Compute delta (current - previous)
- Flag any client member with delta <= -0.3 as "**cooling**"
- Flag any client member with delta >= +0.3 as "**warming**"

---

## Pattern Detection

Beyond individual messages, look for these patterns across the period:

1. **Silence gaps** - unusually long periods without communication from a client member who normally engages
2. **Topic avoidance** - client stops responding to questions about a specific topic/area
3. **Formal shift** - tone becomes noticeably more formal/distant than baseline
4. **Decision delays** - client takes longer to respond to decision requests vs baseline
5. **Meeting engagement drop** - fewer questions, shorter statements in meetings
6. **Praise/complaint ratio shift** - notable change vs previous period
7. **Loop-in expansion** - client starts adding more of their side to threads (escalation precursor)
8. **Accountability questions** - shift from "what's next" to "who is responsible"

Before flagging a silence gap or disengagement pattern as a warning signal, sanity-check it against anything a human on the project has told you directly about the cause (org changes, scope handoffs, a person's known engagement style) - a structural explanation someone already gave you outranks a fresh inference from message frequency alone.

---

## Output Report

**Template** (`client-satisfaction`): resolve it first per "Document templates" in `projects/SKILL.md` (registry `../projects/_templates.md`). The format below is the built-in default; a house or project template replaces its sections, order and fixed wording, never the invariants listed there.

Write report in Ukrainian (per `{config.default_language}` for internal) or English (if requested for sharing). Match the register of past reports for the same project when you have one to compare against: use status emoji (🟢🟡🔴) on the overall score and per-person scores, write in engaged, concrete prose rather than dry bullet fragments, and let notable findings (a resolved alert, a standout quote, a structural break) carry a sentence or two of narrative color - this is a report a PM will actually enjoy re-reading, not just a data dump. Never invent color that isn't backed by the evidence, and never let liveliness replace precision: every score, quote and claim still needs a source and a date.

Report structure:

```markdown
Джерела: Slack OK · Email (Threads) OK · Meetings OK · Cultural Profile {OK | SKIPPED}
# Client Satisfaction Tracker - {config.project_name} - {period}

## Загальна оцінка: {Green / Yellow / Red / Cooling / Warming}

**Overall sentiment score**: {X.XX} (previous period: {Y.YY}, delta: {+/-}{Z.ZZ})
**Messages analyzed**: {N} Slack, {M} email, {K} meeting quotes
**Client members covered**: {list}

---

## Per-Client-Member Breakdown

### {Client Name 1} ({Role}) - Score: {X.XX} ({trend emoji})
- **Polarity distribution**: {N positive} / {M neutral} / {K negative}
- **Dominant signals**: {top 3 signals from this person}
- **Notable quotes**:
  > "{Direct quote showing sentiment}" ({Source, date})
- **Trend vs previous period**: {warming / cooling / stable} ({delta})

### {Client Name 2} ...

---

## Warning Signals Detected

### 🔴 High priority
- **{Signal type}** from {Name} on {date} ({Source})
  Context: {1-line context}
  Link: {URL}

### 🟡 Medium priority
- {same format}

### 🟢 Positive signals worth amplifying
- {same format}

---

## Patterns

1. **{Pattern name}**: {description and evidence}
2. **{Pattern name}**: {description and evidence}

---

## Topics Causing Friction

| Topic | Sentiment | Evidence | Action |
|---|---|---|---|
| {Topic 1} | 🔴 Negative | {N mentions, top signals} | {Suggested action} |
| {Topic 2} | 🟡 Mixed | {N mentions} | {Suggested action} |

---

## Topics Generating Appreciation

| Topic | Sentiment | Evidence |
|---|---|---|
| {Topic 1} | 🟢 Positive | {N mentions} |

---

## Рекомендації (Recommendations)

### Цього тижня (This week)
1. {Top action - e.g. "Address {Name}'s concern about {topic} directly in Tuesday sync"}
2. {Second action}

### Цього місяця (This month)
1. {Strategic action}
2. {Relationship-building opportunity}

### Моніторити (To monitor)
- {Pattern/person/topic to keep watching}
```

---

## Report Storage

Save to Notion Reports DB (`{config.notion.reports_db}`):

| Property | Value |
|---|---|
| Report Name | `Client Satisfaction - {period}` |
| date:Date:start | Today (YYYY-MM-DD) |
| Type | `Client Satisfaction` |
| Skill | `client-satisfaction-tracker` |
| Summary | Overall sentiment + key warning signals (2-3 sentences) |
| Visibility | `Internal` |
| Workspace | `["https://app.notion.com/p/{config.notion.workspace_page_id}"]` (ID without dashes) |
| Project | `["https://app.notion.com/p/{config.notion.project_page_id}"]` (ID without dashes) |

Body: the full report above.

---

## Alert Thresholds

If the analysis reveals any of these conditions, **surface them prominently** at the top of the report AND flag to user in chat:

- Any single client member drops by >= 0.5 in score
- Overall period score < -0.3
- Any `strong_negative` (-2) message detected
- Any `escalation_language` or `distrust` signal
- Silence gap > 2x baseline for a key client contact

Format: `⚠️ ALERT: {condition} - {evidence} - recommended immediate action: {action}`

Before publishing an alert, actively try to disconfirm it: check whether a structural, non-relationship explanation fits better (org change, handoff, role shift, known communication style) - see "Pattern Detection" above. If the user later tells you the alert's premise was wrong (e.g. "that person's silence is expected, they've handed that off"), resolve the alert in place in the live report rather than leaving a stale warning next to a correction.

---

## Privacy & Ethics Note

This skill processes client messages to detect patterns **for internal PM use only**. The output:
- Is NEVER to be shared with the client directly
- Is NEVER to be used to "prove" the client is being unreasonable
- IS to be used to proactively address concerns before they escalate
- IS to be used to celebrate and reinforce positive interactions
- Quotes in reports stay factual and verbatim; no paraphrasing that distorts meaning. Email summaries pulled from the Threads DB `Description` field are themselves already paraphrased - only present text as a verbatim quote if the Description itself renders it as one.

The sentiment scoring is a **signal, not a verdict**. Always combine with direct conversation and judgment.

---

## Critical Pitfalls

1. **Sarcasm and context** - detected tone can mislead; always read the surrounding thread before scoring
2. **Cultural differences** - what sounds formal or cold in one culture may be neutral in another; calibrate against the config's Cultural Profile and against the baseline for that person
3. **Non-client messages** - NEVER include team internal messages; only quotes from the "Team - Client" roster
4. **Aliases** - resolve all name variants via the config's Transcript Alias Map table before analyzing
5. **Cherry-picking** - include both positive and negative quotes; a report with only negative signals is biased
6. **Seasonal patterns** - deadlines, holidays, and external pressures affect tone; note these in context
7. **Don't over-interpret silence** - 1 week of no messages ≠ dissatisfaction; look for baseline
8. **Thread depth** - a client reply is context-dependent on the team message it answers; always read the parent
9. **No fake config keys** - if a piece of context lives in the config as a markdown table (client roster, transcript aliases) rather than a scalar value, read the table; do not reference a `{config.x.y}` token that was never actually added to any project config
10. **Email source discipline** - email signal comes from the Threads DB (`Type` = `Email`), populated independently by `mac-mail-collector` on its own schedule. Never invoke that collector from this skill, never search a "Client Emails" Knowledge Base label (legacy, unreliable), and never assume "no email found" without actually querying Threads DB by `Type`/`Project`/`Reported at` first - that source has repeatedly turned out to hold real data that an outdated search path missed.
