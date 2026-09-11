---
name: mac-mail-collector
description: "Scans ~~home-folder/work/Mail/ for emails exported from Mac Mail.app via AppleScript, routes them to projects using the Email Routing block of each active project config, and writes relevant threads to the Notion Threads DB. Use whenever the user mentions \"пошта\", \"mail\", \"імейли\", \"check mail\", \"mac mail\", \"перевір пошту\", \"обробити пошту\", \"process mail\", \"нові листи\", \"new emails from mail\", \"apple mail\", \"що прийшло на пошту\", \"scan mail buffer\", or any request involving emails from Mac Mail.app. When triggered, execute immediately - do not ask for confirmation. The only exception: if the project is ambiguous, ask."
---

# Mac Mail Buffer Processor

## Architecture

```
Mail.app --[AppleScript, every 15min]--> ~~home-folder/work/Mail/{account}/incoming/
                                                    |
                                          [This Cowork skill]
                                                    |
                                     +------+-------+-------+
                                     |              |       |
                                  Notion         Summary   processed/
                               Threads DB        to user
                        (props + FULL bodies
                         in the PAGE BODY)
```

The AppleScript half lives in `~~home-folder/work/Mail/scripts/`
(`mail_export.applescript`, `mail_collector.sh`, `com.our-company.mail-collector.plist`,
`mail_backfill.sh`). It exports EVERY new message per account and does no project
routing. All routing happens in this skill.

## Step 0 - Build the routing registry from project configs

**Always run first. This skill no longer carries an inline email registry.**

1. Locate the registry: `../projects/` relative to this skill's folder
   (fallback: Glob `**/projects/*.md` under the skills directory).
2. Read EVERY config except `_template.md`. Skip any with `status: archived`.
3. From each active config take:
   - `notion.project_page_id`, `notion.workspace_page_id`, `notion.threads_db`
   - the `email_routing` block: `mac_mail_accounts`, `client_emails`,
     `unique_emails`, `unique_domains`, `team_emails`, `knowledge_base`
   - the exact Notion relation property names from the config's "Notion relation
     property names" table (Threads uses `Projects` and `Workspace`). Do not
     guess: a wrong property name silently fails to write the relation.
4. Derive shared addresses: an address present in `client_emails` of TWO OR MORE
   active configs is shared. Never maintain a shared list by hand.
5. If the user named a project, process only its mail. Otherwise process all
   projects (the normal scheduled behavior).

Rule Zero: the config wins. If anything in this skill contradicts a config, the
config is right and this text is stale - say so to the user.

Historical note: until 2026-09-07 the registry was duplicated in three places
(config, `gmail-collector`, this skill). `gmail-collector` was deleted because
project mail now arrives through Mail.app, and the registry lives only in configs.

---

## Buffer Folder Structure

```
~~home-folder/work/Mail/
  .last_scan_timestamps.json     -- AppleScript per-mailbox last scan tracker
  .last_cowork_scan              -- touch file, Cowork last processing time
  .collector.log                 -- AppleScript run log
  scripts/                       -- AppleScript + shell wrapper + LaunchAgent

  {Account_Name}/                -- one folder per Mail.app account
    incoming/                    -- new emails (JSON), ready for processing
      {message_id}.json
    incoming-eml/                -- raw EML originals
      {message_id}.eml
    processed/                   -- JSON moved here after Cowork processes
      {message_id}.json
    processed-eml/               -- EML moved here after processing
      {message_id}.eml
```

---

## JSON Email Format

```json
{
  "id": "message-id@domain.com",
  "subject": "Re: KYB flow updates",
  "from": "client.pm@example-client.com",
  "to": "you@our-company.com, teammate@our-company.com",
  "cc": "client.ops@example-client.com",
  "date": "2026-04-10T14:30:00Z",
  "body": "Full email body text...",
  "read": true,
  "account": "our company",
  "mailbox": "INBOX"
}
```

> The `body` field is the canonical content. It MUST be written into the Notion
> page body (see Step 4b). The Description property is only a short preview.

---

## Email Routing Rules

An email belongs to a project if ANY participant (from, to, cc):

- exactly matches an entry in that project's `unique_emails`, OR
- has a domain (substring after `@`) matching an entry in `unique_domains`.

Domain matching is for projects where the entire client organization shares one
corporate domain (e.g. `other-client.com` for Beta). Address matching is for
projects where only certain people on a shared domain count.

**Shared-address rule:** a thread belongs to a project ONLY if at least one
`unique_emails` entry or `unique_domains` suffix matches. If only shared addresses
appear (present in two or more configs), skip rather than guess.

**Account fallback:** the Mac Mail account folder name is a strong secondary
signal. If no address or domain matches but the folder is listed in a project's
`mac_mail_accounts`, tag the email with that project (after noise and calendar
filtering). Client mail can land in an unexpected account folder, so route by
participant address first and by folder name only as a fallback.

If nothing matches: classify as `unmatched`.

### Calendar invite filter

Skip emails with subject starting with (case-insensitive):
`Invitation:`, `Updated invitation:`, `Accepted:`, `Declined:`,
`Tentatively accepted:`, `Canceled event:`, `Cancelled event:`,
`Canceled:`, `Cancelled:` (Microsoft Teams meeting cancellations),
`Notes:` (Gemini meeting note auto-emails),
`Pre-Read for your upcoming meeting:` (Read AI),
`Recap:` (Read AI),
`⏪ Pre-Read`, `⏩ Recap` (Read AI with emoji prefixes)

Also skip emails whose subject contains `meeting.ics` attachment hints
or starts with calendar provider tags like `[Calendar]`, `[ICS]`.

Also skip emails whose body is purely a meeting invitation (Microsoft Teams /
Google Meet join block: "Join the meeting now", "Meeting ID", "Passcode",
no human message), even if the subject has no calendar prefix.

### Noise filter

Skip emails where from address matches any of these patterns:
- `noreply@`, `no-reply@`, `notifications@`, `mailer-daemon@`, `donotreply@`, `do-not-reply@`
- `calendar-notification@google.com`
- `@github.com` (notifications)
- `@atlassian.com`, `@jira.`, `@confluence.`
- `jira@` followed by anything ending in `.atlassian.net` (e.g. `jira@other-client.atlassian.net`)
- `MicrosoftExchange` prefix (Outlook bounce / NDR / auto-replies, e.g. `MicrosoftExchange329e...@other-client.onmicrosoft.com`)
- `executiveassistant@e.read.ai`, `@read.ai`, `gemini-notes@google.com` (AI meeting summarizers)
- `<your HR system>` (HR system notifications)
- `@stripe.com` payment notifications when subject starts with `Payment of`
- `accounts@<your-company>` payslip auto-emails
- `news@`, `newsletter@`, `updates@`, `info@` (newsletters, marketing)
- social networks, marketplaces, banks, hobby sites and any other personal newsletters: add the domains you actually get

These are informational - the user can still review them in Mail.app,
but they don't need to be processed into Notion.

> **Rule:** Apply Noise filter BEFORE Project matching. A noisy email that
> happens to be on a project domain (e.g. `jira@other-client.atlassian.net`)
> must still be skipped.

---

## Execution Steps

### Step 1 - Discover mailboxes and count

```bash
for dir in ~~home-folder/work/Mail/*/incoming/; do
  MAILBOX=$(basename "$(dirname "$dir")")
  COUNT=$(find "$dir" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  echo "$MAILBOX: $COUNT"
done
```

If the buffer holds a large historical backlog, scope a routine run to files
newer than the `.last_cowork_scan` marker:

```bash
find ~~home-folder/work/Mail/*/incoming/ -name "*.json" \
  -newer ~~home-folder/work/Mail/.last_cowork_scan
```

Report to user: "Found X new emails across Y mailboxes."

### Step 2 - Read and classify each email

For each JSON file in each `incoming/` folder:

1. Read the JSON (keep the full `body` - you will need it in Step 4b)
2. Extract all participants: `from` + `to` + `cc` (split by `, `)
3. Check against Calendar invite filter (skip if match)
4. Check against Noise filter (skip if match)
5. **Project matching** per the Email Routing Rules above, using the registry
   built in Step 0 from the project configs

### Step 3 - Present summary

```
## Mail Buffer Report

### {Project} - N emails
1. **{subject}** from {from} ({date})
   Preview: {first 100 chars}...

### Unmatched - K emails
(emails not matching any project registry)
1. ...

### Skipped - S emails
(calendar invites, noise)
```

### Step 4 - Process matched emails (write BOTH properties AND page body)

**Thread grouping:** Group emails by subject line (strip Re:/Fwd: prefixes).
If multiple emails share the same normalized subject, treat as one thread
(one Notion page, multiple message blocks in the body).

#### 4a. Properties (metadata / index only)

- DB: Threads DB (`{config.notion.threads_db}`)
- `Thread Name` = normalized subject
- `Email Link` = `message://<id>` of the LATEST message in the thread
- `Type` = `["Email"]`
- `Reported at` = date of the FIRST message; `Last Reply Date` = date of the
  LATEST message (set `:is_datetime` = 1)
- `Projects` = `["https://app.notion.com/p/<project_page_id-without-dashes>"]`
- `Workspace` = `["https://app.notion.com/p/<workspace_page_id-without-dashes>"]`
  (property names come from the config's relation table, not from memory)
- `Status` = `"Claude"`
- `📚 Knowledge Base` = KB relation (optional, name from `{config.email_routing.knowledge_base}`)
- Icon = 🔴 if the last author is NOT in that project's `team_emails`, otherwise none
- `Description` = SHORT preview ONLY, e.g.
  `\[N msgs\] from <latest sender>: <first ~200 chars of latest body>`.
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
**Date:** <date>
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
- If a forwarded message embeds an earlier email inline (quoted header + body)
  and no separate JSON exists for it, reconstruct that earlier email as its own
  numbered block using the quoted header (From/To/Cc/Subject/Date).
- Preserve sender names and addresses.
- Strip image placeholder glyphs and signatures' tracking pixels; keep the
  human-written text.
- Notion has a ~2000-character block limit: split long bodies across multiple
  blocks/paragraphs.

#### 4c. Check existing (dedup / append)

Query Threads DB, filter by `Thread Name` (normalized subject).
- Not found -> create the page (4a + 4b).
- Found and `Last Reply Date` unchanged -> skip.
- Found and a NEW reply arrived -> APPEND the new message block(s) to the page
  body, and update `Last Reply Date`, `Email Link`, and `Description`. Do not
  overwrite the existing body; do not change `Status` if it is already
  `Replied`, `Closed`, or `Spectator Mode`.

### Step 5 - Move to processed

```bash
ACCOUNT="Account_Name"
MSGID="safe_message_id"
mkdir -p "~~home-folder/work/Mail/$ACCOUNT/processed/"
mkdir -p "~~home-folder/work/Mail/$ACCOUNT/processed-eml/"
mv "~~home-folder/work/Mail/$ACCOUNT/incoming/$MSGID.json" \
   "~~home-folder/work/Mail/$ACCOUNT/processed/$MSGID.json"
mv "~~home-folder/work/Mail/$ACCOUNT/incoming-eml/$MSGID.eml" \
   "~~home-folder/work/Mail/$ACCOUNT/processed-eml/$MSGID.eml"
```

Also move unmatched and skipped emails to processed (they are processed,
just not written to Notion). The `processed/` JSON + `processed-eml/` EML are
the durable source of truth: if a page body is ever lost, it can be rebuilt
from these files (backfill).

### Step 6 - Update scan marker

```bash
touch ~~home-folder/work/Mail/.last_cowork_scan
```

### Step 7 - Print summary

```
Done. Processed X emails from Mac Mail buffer:
- {Project}: A (created: B, updated: C, skipped: D)
- Unmatched: I (moved to processed)
- Noise/calendar: J (filtered out)
- Errors: K
```

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

- This skill only READS from the buffer folder on disk
- It NEVER interacts with Mail.app directly
- It NEVER sends emails
- It NEVER deletes originals (only moves to processed/)
- EML files are preserved as archive in processed-eml/
- The full message text always lives in the Notion page BODY, never only in a
  property - so thread context is never lost