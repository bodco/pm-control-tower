---
name: mac-mail-collector
description: "Scans ~~home-folder/work/Mail/ for emails exported from Mac Mail.app via AppleScript (INBOX and Sent), routes them to projects using the Email Routing block of each active project config, and writes relevant threads to the Notion Threads DB. Use whenever the user mentions \"пошта\", \"mail\", \"імейли\", \"check mail\", \"mac mail\", \"перевір пошту\", \"обробити пошту\", \"process mail\", \"нові листи\", \"new emails from mail\", \"apple mail\", \"що прийшло на пошту\", \"scan mail buffer\", \"sent mail\", \"відправлені листи\", or any request involving emails from Mac Mail.app. When triggered, execute immediately - do not ask for confirmation. The only exception: if the project is ambiguous, ask."
---

# Mac Mail Buffer Processor

## Architecture

```
Mail.app --[LaunchAgent every 15 min, only while Mail.app is running]
   |-- mail_export.applescript       INBOX of every account
   |-- mail_export_sent.applescript  Sent of every account (lookback 5 days)
   |-- fix_recipients.py             fills to/cc + date_utc from EML headers
   v
~~home-folder/work/Mail/{account}/incoming/
                     |
            [This Cowork skill]
                     |
     +---------------+---------------+
     |               |               |
  Notion          Summary        processed/
Threads DB        to user
(props + FULL
 bodies in the
 PAGE BODY)
```

The shell/AppleScript half lives in `~~home-folder/work/Mail/scripts/`
(`mail_collector.sh`, `mail_export.applescript`, `mail_export_sent.applescript`,
`fix_recipients.py`, `com.~~org.mail-collector.plist`, `mail_backfill.sh`; setup in
document `10a` of the Control Tower docs). It exports EVERY new message per account,
incoming and outgoing, and does no project routing. All routing happens in this skill.

One-time Sent backfill: write a number of days into
`~~home-folder/work/Mail/.sent_backfill_days`. The next collector run uses it and
renames the file to `.sent_backfill_days.done-<timestamp>`.

## Step 0 - Build the routing registry from project configs

**Always run first. This skill no longer carries an inline email registry.**

1. Locate the registry: `../projects/` relative to this skill's folder
   (fallback: Glob `**/projects/*.md` under the skills directory).
2. Read EVERY config except `_template.md`. Skip any with `status: archived`.
3. From each active config take:
   - `notion.project_page_id`, `notion.workspace_page_id`, `notion.threads_db`
   - the `email_routing` block: `mac_mail_accounts`, `client_emails`,
     `unique_emails`, `unique_domains`, `team_emails`, `knowledge_base`
   - the Notion relation property names: `Project` and `Workspace` (singular, no
     emoji) per the config's "Notion relation property names" paragraph. Before the
     first write of a run, fetch the Threads data source (`notion-fetch` on
     `notion.threads_db`) and confirm the names it reports; a wrong property name
     silently fails to write the relation. If the live schema differs, use the real
     names and report the discrepancy.
4. Derive shared addresses: an address present in `client_emails` of TWO OR MORE
   ACTIVE configs is shared. Archived configs do not count. Never maintain a shared
   list by hand.
5. If the user named a project, process only its mail. Otherwise process all
   projects (the normal scheduled behavior). This is the documented exception to
   the Default Project Rule in `projects/SKILL.md`: the collector routes mail to
   projects by the configs, so it reads all of them. Read `projects/SKILL.md` for
   the other cross-cutting rules.
6. Writes allowed without asking (the 5-minute rule): new or updated Threads DB
   pages and moving processed files inside the mail buffer. Nothing is ever sent.

Rule Zero: the config wins. If anything in this skill contradicts a config, the
config is right and this text is stale - say so to the user. The routing registry
lives ONLY in the configs; no collector keeps its own address table.

---

## Buffer Folder Structure

```
~~home-folder/work/Mail/
  .last_scan_timestamps.json     -- AppleScript per-mailbox INBOX scan tracker
  .last_cowork_scan              -- touch file, informational only (NOT a filter)
  .sent_backfill_days            -- optional, one-time Sent backfill request
  .collector.log                 -- collector run log (INBOX, SENT, fix_recipients)
  scripts/                       -- AppleScript + shell wrapper + LaunchAgent

  {Account_Name}/                -- one folder per Mail.app account
    incoming/                    -- NOT YET PROCESSED emails (JSON). Everything here gets processed.
      {message_id}.json
    incoming-eml/                -- raw EML originals
      {message_id}.eml
    processed/                   -- JSON moved here after Cowork processes it
      {message_id}.json
    processed-eml/               -- EML moved here after processing
      {message_id}.eml
    backlog/, backlog-eml/       -- optional: an archived historical buffer (e.g. mail from
                                    before the framework was set up). Never processed
                                    automatically; only on explicit request.
```

The exporters check `incoming/`, `processed/` and `backlog/` before writing a file,
so moving files between these folders never causes re-exports.

---

## JSON Email Format

```json
{
  "id": "message-id@domain.com",
  "subject": "Re: Invoice flow update",
  "from": "client.pm@example-client.com",
  "to": "you@our-company.com, teammate@our-company.com",
  "cc": "client.ops@example-client.com",
  "date": "2026-04-10T14:30:00Z",
  "date_utc": "2026-04-10T11:30:00Z",
  "body": "Full email body text...",
  "read": true,
  "account": "our company",
  "mailbox": "INBOX",
  "direction": "outgoing"
}
```

- `mailbox` is `INBOX` or `Sent`. `direction: "outgoing"` is present on Sent exports.
- `date` is the Mac's LOCAL time with a misleading `Z` suffix. Always use
  `date_utc` for Notion dates. If `date_utc` is missing, take the `Date:` header
  from the matching EML (`incoming-eml/<same name>.eml`) and convert to UTC.
- `to` / `cc` come from `fix_recipients.py` (AppleScript returns them empty). If
  they are still empty, parse the `To:` / `Cc:` headers of the matching EML
  before routing. Never route on `from` alone when the EML is available.
- `body` is the canonical content. It MUST be written into the Notion page body
  (see Step 4b). The Description property is only a short preview.

---

## Email Routing Rules

An email belongs to a project if ANY participant (from, to, cc):

- exactly matches an entry in that project's `unique_emails`, OR
- has a domain (substring after `@`) matching an entry in `unique_domains`.

Domain matching is for projects where the entire client organization shares one
corporate domain (e.g. `client.com`). Address matching is for
projects where only certain people on a shared domain count.

**Shared-address rule:** a thread belongs to a project ONLY if at least one
`unique_emails` entry or `unique_domains` suffix matches. If only shared addresses
appear (present in two or more ACTIVE configs), skip rather than guess. An address
that is in `client_emails` of exactly one active config is not shared and counts
as a match for that project.

**Account fallback (INBOX only):** the Mac Mail account folder name is a secondary
signal. If no address or domain matches but the folder is listed in a project's
`mac_mail_accounts`, tag the email with that project (after noise and calendar
filtering). Client mail can land in an unexpected account folder, so route by
participant address first and by folder name only as a fallback.

**Outgoing mail (`mailbox: Sent`):** NEVER use the account fallback. An outgoing
message belongs to a project only when a recipient (to/cc) matches that project's
`unique_emails`, `unique_domains` or non-shared `client_emails`. Outgoing mail to
team members only, or to unrelated people, is `unmatched`.

If nothing matches: classify as `unmatched`.

### Calendar invite filter

Skip emails with subject starting with (case-insensitive):
`Invitation:`, `Updated invitation:`, `Accepted:`, `Declined:`,
`Tentatively accepted:`, `Canceled event:`, `Cancelled event:`,
`Canceled:`, `Cancelled:` (Microsoft Teams meeting cancellations),
`New Time Proposed:`, `Aceptado:`, `Rechazado:` (calendar replies, incl. Spanish locale),
`Notes:` (Gemini meeting note auto-emails),
`Pre-Read for your upcoming meeting:` (Read AI),
`Recap:` (Read AI),
`⏪ Pre-Read`, `⏩ Recap`, `🗓` (Read AI with emoji prefixes)

Also skip emails whose subject contains `meeting.ics` attachment hints
or starts with calendar provider tags like `[Calendar]`, `[ICS]`.

Also skip emails whose body is purely a meeting invitation (Microsoft Teams /
Google Meet join block: "Join the meeting now", "Meeting ID", "Passcode",
no human message), even if the subject has no calendar prefix. This applies to
outgoing invites too.

### Noise filter

Skip emails where from address matches any of these patterns:
- `noreply@`, `no-reply@`, `notifications@`, `mailer-daemon@`, `donotreply@`, `do-not-reply@`
- `calendar-notification@google.com`
- `@github.com` (notifications)
- `@atlassian.com`, `@jira.`, `@confluence.`
- `jira@` followed by anything ending in `.atlassian.net` (e.g. `jira@client.atlassian.net`)
- `MicrosoftExchange` prefix (Outlook bounce / NDR / auto-replies, e.g. `MicrosoftExchange329e...@client.onmicrosoft.com`)
- `executiveassistant@e.read.ai`, `@read.ai`, `gemini-notes@google.com` (AI meeting summarizers)
- `<your HR system>` (HR system notifications)
- `@stripe.com` payment notifications when subject starts with `Payment of`
- `accounts@<your-company>` payslip auto-emails
- `news@`, `newsletter@`, `updates@`, `info@` (newsletters, marketing)
- social networks, marketplaces, banks, hobby sites and any other personal newsletters: add the domains you actually get

These are informational - the user can still review them in Mail.app,
but they don't need to be processed into Notion.

> **Rule:** Apply Noise filter BEFORE Project matching. A noisy email that
> happens to be on a project domain (e.g. `jira@client.atlassian.net`)
> must still be skipped.

---

## Execution Steps

### Step 1 - Collector health + discover mailboxes

1. Collector health (report problems in the final summary, do not stop):
   ```bash
   tail -n 400 ~~home-folder/work/Mail/.collector.log | grep -E "Scan complete|Sent scan complete|SENT|SKIP: Mail.app|FAILED|ERROR|fix_recipients" | tail -n 15
   ```
   - Many consecutive `SKIP: Mail.app is not running` lines = nothing was
     collected in that window. Say how long Mail.app has been closed.
   - `SENT ERROR` = outgoing mail is not being collected. Say so.
2. Count ALL files in every `incoming/` folder. **Process every file in
   `incoming/`, regardless of file modification time.** Do NOT filter with
   `-newer .last_cowork_scan`: files exported late (Mail.app closed, slow sync,
   Sent backfill) end up older than the marker and would be skipped forever.
   Anything still in `incoming/` is by definition unprocessed.
   ```bash
   for dir in ~~home-folder/work/Mail/*/incoming/; do
     MAILBOX=$(basename "$(dirname "$dir")")
     COUNT=$(find "$dir" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
     echo "$MAILBOX: $COUNT"
   done
   ```
3. Never touch `backlog/` unless the user explicitly asks for it. A large historical
   buffer belongs in `backlog/`, not in a date filter.

Report to user: "Found X unprocessed emails across Y mailboxes (Z outgoing)."

Classification (Step 2) is cheap: do it for all files with one local python
script on the user's machine (the device shell), not by reading files one by one
into context. Read full bodies only for the files that matched a project.

### Step 2 - Read and classify each email

For each JSON file in each `incoming/` folder:

1. Read the JSON (keep the full `body` - you will need it in Step 4b)
2. Extract all participants: `from` + `to` + `cc` (split by `, `); fall back to
   the EML headers if `to` is empty
3. Check against Calendar invite filter (skip if match)
4. Check against Noise filter (skip if match)
5. **Project matching** per the Email Routing Rules above, using the registry
   built in Step 0 from the project configs (outgoing mail: no account fallback)
6. Flag messages whose `date_utc` is older than 14 days as `late arrival` in the
   summary. They are still processed normally (dedup in 4c).

### Step 3 - Present summary

```
## Mail Buffer Report

### {Project} - N emails (M outgoing)
1. **{subject}** from {from} ({date_utc}) [OUT] [late]
   Preview: {first 100 chars}...

### Unmatched - K emails
(emails not matching any project registry)
1. ...

### Skipped - S emails
(calendar invites, noise)
```

### Step 4 - Process matched emails (write BOTH properties AND page body)

**Thread grouping:** Group emails by subject line (strip Re:/RE:/Fwd:/FW:/RV:
prefixes). If multiple emails share the same normalized subject, treat as one thread
(one Notion page, multiple message blocks in the body). Incoming and outgoing
messages with the same normalized subject are ONE thread, interleaved
chronologically.

#### 4a. Properties (metadata / index only)

- DB: Threads DB (`{config.notion.threads_db}`)
- `Thread Name` = normalized subject
- `Email Link` = `message://<id>` of the LATEST message in the thread
- `Type` = `["Email"]`
- `Reported at` = `date_utc` of the FIRST message; `Last Reply Date` = `date_utc`
  of the LATEST message (set `:is_datetime` = 1)
- `Project` = `["https://app.notion.com/p/<project_page_id-without-dashes>"]`
- `Workspace` = `["https://app.notion.com/p/<workspace_page_id-without-dashes>"]`
  (names confirmed against the live schema in Step 0)
- `Status` = `"AI Review"` (created by an automation; the PM confirms)
- `Knowledge Base` = KB relation (optional, the page named in `{config.email_routing.knowledge_base}`, or none)
- Icon:
  - 🔴 if the last author is NOT in that project's `team_emails`
  - 📤 if EVERY message in the thread is outgoing (we sent it, no reply yet).
    This is the record that the email was actually sent (reports, invoices,
    documentation packages, escalations).
  - otherwise none
- `Description` = SHORT preview ONLY, e.g.
  `\[N msgs\] from <latest sender>: <first ~200 chars of latest body>`.
  For outgoing-only threads prefix with `\[Sent, no reply yet\]`.
  This is a one-line index hint. It is NOT the archive and must never be the
  only place the message text lives.

#### 4b. Page body (REQUIRED - this is the full archive)

The page CONTENT must contain the FULL text of EVERY message in the thread, in
chronological order (oldest first). **Never leave the body empty. Never rely on
the Description property to hold the message.** An empty body = permanent loss
of the context needed to draft replies (inbox-responder reads the body).

Write the page content with this structure:

```
## 📧 Full email thread

### 1 - <subject of message 1>
**From:** <from>
**Date:** <date_utc>
**To:** <to>          (include line only if present)
**Cc:** <cc>          (include line only if present)

> <full body of message 1, verbatim>
> <quote every line; trim only long legal/disclaimer boilerplate and note "(disclaimer trimmed)">

### 2 - <subject of message 2>
**From:** ...
**Date:** ...

> <full body of message 2>
```

Rules for the body:
- One numbered block per message, oldest first.
- If a message embeds an earlier email inline (quoted header + body) and no
  separate JSON exists for it, reconstruct that earlier email as its own
  numbered block using the quoted header (From/To/Cc/Subject/Date). This is how
  our own original is recovered when only the client's reply was exported.
- Preserve sender names and addresses.
- Strip image placeholder glyphs and signatures' tracking pixels; keep the
  human-written text.
- Notion has a ~2000-character block limit: split long bodies across multiple
  blocks/paragraphs.

#### 4c. Check existing (dedup / append)

Query Threads DB, filter by `Thread Name` (normalized subject) AND `Project`.
- Not found -> create the page (4a + 4b).
- Found and every message is already in the body (same From + Date) -> skip.
- Found and a NEW message arrived (reply, or our own outgoing message) -> APPEND
  the new message block(s) to the page body in chronological position, and update
  `Last Reply Date`, `Email Link`, `Description` and the icon. Do not overwrite the
  existing body; do not change `Status` if it is already `Replied`, `Closed`, or
  `Spectator Mode`. A late-arriving older message goes into its chronological
  place and does not move `Last Reply Date` backwards.

### Step 5 - Move to processed

```bash
ACCOUNT="Account_Name"
MSGID="safe_message_id"
mkdir -p "~~home-folder/work/Mail/$ACCOUNT/processed/"
mkdir -p "~~home-folder/work/Mail/$ACCOUNT/processed-eml/"
mv -n "~~home-folder/work/Mail/$ACCOUNT/incoming/$MSGID.json" \
   "~~home-folder/work/Mail/$ACCOUNT/processed/$MSGID.json"
mv -n "~~home-folder/work/Mail/$ACCOUNT/incoming-eml/$MSGID.eml" \
   "~~home-folder/work/Mail/$ACCOUNT/processed-eml/$MSGID.eml"
```

Move unmatched and skipped emails to processed too (they are processed, just not
written to Notion). Do it in one local script, not file by file. Only move a
matched email AFTER its Notion write succeeded; on a Notion error leave it in
`incoming/` so the next run retries it. The `processed/` JSON + `processed-eml/`
EML are the durable source of truth: if a page body is ever lost, it can be
rebuilt from these files (backfill).

### Step 6 - Update scan marker

```bash
touch ~~home-folder/work/Mail/.last_cowork_scan
```

Informational only (when Cowork last ran). It is never used to select files.

### Step 7 - Print summary

```
Джерела: Mail buffer OK ({N} accounts) · Collector OK · Notion OK · configs OK ({M} active)
Done. Processed X emails from Mac Mail buffer:
- {Project}: A (created: B, updated: C, skipped: D; outgoing: E; late: F)
- Unmatched: I (moved to processed)
- Noise/calendar: J (filtered out)
- Errors: K (left in incoming/ for retry)
- Collector health: <OK | Mail.app closed since ... | SENT ERROR ...>
```

`Collector` in the header is `STALE` when Mail.app has been closed for a long stretch
and `FAILED` on `SENT ERROR` or `FAILED` lines in the log.

---

## Keeping Email Lists in Sync

Nothing to sync any more. The routing registry lives ONLY in
`projects/{slug}.md` (the `email_routing` block).

When a client team member joins or leaves:

1. Edit that project's config: `client_emails`, `unique_emails`, `team_emails`
2. Add a Changelog line in the same config
3. Done. This skill picks the change up on its next run

Do not copy addresses into this skill. An inline address list here is a regression.

---

## Safety

- This skill only READS from the buffer folder on disk and moves files between
  its subfolders
- It NEVER interacts with Mail.app directly
- It NEVER sends emails (outgoing mail is only archived, never re-sent)
- It NEVER deletes originals (only moves to processed/)
- EML files are preserved as archive in processed-eml/
- The full message text always lives in the Notion page BODY, never only in a
  property - so thread context is never lost