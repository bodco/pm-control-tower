# 10a. Setup: collecting mail from Mail.app (AppleScript + LaunchAgent)

A step-by-step recipe for `mac-mail-collector`. You need it when corporate mail is not in Gmail and the official connector cannot see it: Mail.app on the Mac becomes the source, and a JSON + EML buffer appears on disk, which the skills then read.

This is the part you cannot "just switch on": it consists of a few scripts, a LaunchAgent and one macOS permission.

## Architecture

```
Mail.app (INBOX and Sent of every account)
   │  LaunchAgent every 15 minutes, only while Mail.app is running
   ▼
mail_collector.sh
   ├─ mail_export.applescript       ← INBOX: new mail by per-mailbox timestamp
   ├─ mail_export_sent.applescript  ← Sent: 5-day window, dedup by file existence
   └─ fix_recipients.py             ← fills to/cc and date_utc from the EML headers
   ▼
~/work/Mail/<Account>/incoming/*.json     (from, to, cc, subject, date, date_utc, body, mailbox, direction)
~/work/Mail/<Account>/incoming-eml/*.eml  (the original message)
   │
   ▼
mac-mail-collector skill → routing by email_routing from the configs → Notion Threads DB
```

The files live in `~/work/Mail/scripts/`:

| File | Role |
|---|---|
| `mail_export.applescript` | INBOX: walking accounts, selecting new messages, writing JSON/EML, updating timestamps |
| `mail_export_sent.applescript` | Sent: each account's sent mail for the last N days (default 5), the same JSON/EML format with `"mailbox": "Sent"` and `"direction": "outgoing"` |
| `fix_recipients.py` | fills empty `to`/`cc` and `date_utc` in the JSON from the headers of the EML original |
| `mail_collector.sh` | wrapper: checks that Mail.app is running, calls INBOX, Sent and `fix_recipients.py` in turn, retries, writes the log |
| `com.<org>.mail-collector.plist` | LaunchAgent: runs the wrapper every 15 minutes |

## Step 1. Folder and structure

```bash
mkdir -p ~/work/Mail/scripts
```

The buffer creates itself from the script: for every Mail.app account a `~/work/Mail/<Account>/incoming/` and `incoming-eml/` will appear.

## Step 2. AppleScript

Key decisions worth keeping when you rewrite it for yourself:

- **Walk only `INBOX`.** Otherwise archives and spam pour into the buffer by the thousands of files.
- **A timestamp per mailbox** in `~/work/Mail/.last_scan_timestamps.json`.
- **The timestamp moves forward only if ALL messages in the mailbox were processed without errors.** This is the core idea: on a partial failure the next run re-reads the same range and skips the already saved files based on the file existing. That way there are no holes in what was collected.
- **A retry per message** up to 3 times, and only then the error counter.
- **Sanitizing the account name** for the folder name (spaces, Cyrillic, slashes).
- **The "file already exists" check looks in `incoming/`, `processed/` and `backlog/`**, not only in `incoming/`. Then the skill can move files between folders freely and the export never duplicates them.

## Step 2b. Sent mail

Why: a sent message in the Threads DB is the record that a report, an invoice, a documentation package or an escalation really went to the client (the 📤 icon until there is a reply), and the thread shows both sides of the conversation.

- **A separate script, `mail_export_sent.applescript`**, so that a failure in Sent never blocks INBOX collection.
- **Find the Sent mailbox by name** at the top level of the account and one level down: `Sent`, `Sent Messages`, `Sent Mail`, `Sent Items`, `Надіслані`, `Відправлені`, `Enviados` and so on (every provider names it differently).
- **No timestamp file.** Every run looks back N days (the script argument, default 5) and skips messages that already have a file in `incoming/` or `processed/`. This survives days when Mail.app was closed.
- **One-time backfill.** `echo 30 > ~/work/Mail/.sent_backfill_days`: the next wrapper run takes 30 days and renames the file to `.sent_backfill_days.done-<time>`.

## Step 2c. `fix_recipients.py`

Mail.app's AppleScript often returns `to` and `cc` empty, and writes `date` in the Mac's local time with a misleading `Z` suffix. Without a fix, routing sees only the sender (outgoing mail is not routed at all) and the dates in Notion are shifted by the time zone. A small script run after the export reads the `To`, `Cc` and `Date` headers from the EML original and fills `to`, `cc` and `date_utc` in the JSON. It is idempotent: it touches only files with an empty `to` or no `date_utc`.

```python
#!/usr/bin/env python3
"""Fills to/cc and date_utc in the buffer JSON from the EML headers. Idempotent."""
import glob, json, os, sys
from email.parser import BytesHeaderParser
from email.utils import getaddresses, parsedate_to_datetime
from datetime import timezone

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/work/Mail")
fixed = 0
for jp in glob.glob(os.path.join(ROOT, "*", "incoming", "*.json")):
    try:
        d = json.load(open(jp, encoding="utf-8"))
    except Exception:
        continue
    if d.get("to") and d.get("date_utc"):
        continue
    acc_dir = os.path.dirname(os.path.dirname(jp))
    ep = os.path.join(acc_dir, "incoming-eml", os.path.basename(jp)[:-5] + ".eml")
    if not os.path.exists(ep):
        continue
    h = BytesHeaderParser().parse(open(ep, "rb"))
    changed = False
    for key, hdr in (("to", "To"), ("cc", "Cc")):
        if not d.get(key):
            addrs = [a for _, a in getaddresses(h.get_all(hdr, [])) if a]
            if addrs:
                d[key] = ", ".join(addrs)
                changed = True
    if not d.get("date_utc") and h.get("Date"):
        try:
            d["date_utc"] = parsedate_to_datetime(h["Date"]).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            changed = True
        except Exception:
            pass
    if changed:
        json.dump(d, open(jp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        fixed += 1
print(f"fix_recipients: {fixed} files updated")
```

## Step 3. The `mail_collector.sh` wrapper

```bash
#!/bin/bash
BUFFER_ROOT="$HOME/work/Mail"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$BUFFER_ROOT/.collector.log"
mkdir -p "$BUFFER_ROOT"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

# Mail.app must be running: AppleScript does not launch it on its own
if ! pgrep -x "Mail" > /dev/null 2>&1; then
    log "SKIP: Mail.app is not running"; exit 0
fi

ATTEMPT=0; SUCCESS=false
while [ $ATTEMPT -lt 2 ] && [ "$SUCCESS" = "false" ]; do
    ATTEMPT=$((ATTEMPT + 1))
    RESULT=$(osascript "$SCRIPT_DIR/mail_export.applescript" 2>&1)
    if [ $? -eq 0 ]; then log "SUCCESS (attempt $ATTEMPT): $RESULT"; SUCCESS=true
    else log "ERROR (attempt $ATTEMPT): $RESULT"; sleep 10; fi
done
[ "$SUCCESS" = "false" ] && log "FAILED. Timestamp NOT advanced - retry next scan."
```

```bash
chmod +x ~/work/Mail/scripts/mail_collector.sh
```

After the INBOX block the wrapper runs Sent and `fix_recipients.py`:

```bash
# --- Sent: a separate script, its failure never blocks INBOX ---
SENT_DAYS=5
BACKFILL_FLAG="$BUFFER_ROOT/.sent_backfill_days"
if [ -f "$BACKFILL_FLAG" ]; then
    SENT_DAYS=$(tr -dc '0-9' < "$BACKFILL_FLAG"); [ -z "$SENT_DAYS" ] && SENT_DAYS=5
    log "Sent backfill requested: $SENT_DAYS days"
fi
if SENT_RESULT=$(osascript "$SCRIPT_DIR/mail_export_sent.applescript" "$SENT_DAYS" 2>&1); then
    log "SENT OK: $SENT_RESULT"
    [ -f "$BACKFILL_FLAG" ] && mv "$BACKFILL_FLAG" "$BACKFILL_FLAG.done-$(date '+%Y%m%d%H%M')"
else
    log "SENT ERROR: $SENT_RESULT"
fi

# --- to/cc and date_utc from the EML headers ---
log "$(python3 "$SCRIPT_DIR/fix_recipients.py" "$BUFFER_ROOT" 2>&1)"
```

Three things matter here: **skipping when Mail.app is not running** (otherwise the AppleScript fails and litters the log), **a retry at the script level**, separate from the retry at the message level, and **Sent independent of INBOX**: an error in sent mail is logged as `SENT ERROR` but does not stop the rest.

## Step 4. LaunchAgent

The file `~/Library/LaunchAgents/com.<org>.mail-collector.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.example.mail-collector</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/USERNAME/work/Mail/scripts/mail_collector.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>900</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/USERNAME/work/Mail/.launchagent-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/USERNAME/work/Mail/.launchagent-stderr.log</string>
    <key>LimitLoadToSessionType</key>
    <string>Aqua</string>
</dict>
</plist>
```

Paths in the plist must be **absolute**, `~` is not expanded. `LimitLoadToSessionType = Aqua` means "only in the user's graphical session": without it the agent can start somewhere Mail.app is not available.

To load it:

```bash
launchctl load ~/Library/LaunchAgents/com.<org>.mail-collector.plist
launchctl list | grep mail-collector     # check
```

To stop or reload after edits:

```bash
launchctl unload ~/Library/LaunchAgents/com.<org>.mail-collector.plist
launchctl load   ~/Library/LaunchAgents/com.<org>.mail-collector.plist
```

## Step 5. The macOS permission (the most common reason for "nothing works")

The first `osascript` run will ask for permission to control Mail.app. If the agent started without a graphical session, the dialog will not appear and the script will fail silently.

That is why the first run is done by hand from Terminal:

```bash
osascript ~/work/Mail/scripts/mail_export.applescript
```

and you confirm the dialog. Then check: **System Settings → Privacy & Security → Automation → Terminal → Mail** is enabled.

## Step 6. Verification

```bash
tail -20 ~/work/Mail/.collector.log
ls ~/work/Mail/*/incoming/ | head
```

```bash
grep -E "SENT|fix_recipients" ~/work/Mail/.collector.log | tail -5
```

The log should contain `SUCCESS`, `SENT OK` and `fix_recipients: N files updated` lines, and the folders should contain JSON files with `to` and `date_utc` filled. If you see `SKIP: Mail.app is not running`, start Mail.app and leave it open. The skill itself reports the collector state (long runs of `SKIP`, `SENT ERROR`) in the summary of every run.

## Step 7. Connecting it to the framework

Routing messages across projects lives **not here**, but in the project configs, in the `email_routing` section (`03-project-config.md`). The `mac-mail-collector` skill reads the configs of all active projects, builds an address registry in memory and distributes the messages from the buffer across projects. So adding a new project to mail collection means adding `email_routing` to its config, not editing the AppleScript.

Outgoing mail is routed **by recipients only** (`to`/`cc`): the account folder says nothing about the project of a sent message, so the `mac_mail_accounts` fallback is off for it.

The skill processes **everything that sits in `incoming/`**, whatever the file date; `.last_cowork_scan` only records when the skill last ran. An old buffer you do not want in Notion (for example, mail from before the framework was set up) goes into `<Account>/backlog/` and `backlog-eml/`: the skill never enters them without an explicit request, and the export sees those files and does not duplicate them.

## Common mistakes

1. **Relative paths in the plist.** `~` does not work, only `/Users/<user>/...`.
2. **The agent is loaded, but Mail.app is closed.** Collection is silently skipped every time; the log will show `SKIP`.
3. **The Automation permission was not granted.** The script fails for no visible reason, the log is empty.
4. **Moving the timestamp on a partial failure.** If you rewrite the AppleScript, keep the "move forward only on full success" rule, otherwise silent holes will appear in the collected mail.
5. **Walking all mailboxes instead of INBOX.** The buffer grows to tens of thousands of files in a single night. Sent is collected by a separate script with a bounded window, not by a full walk.
6. **A time-marker filter in the skill.** `find -newer .last_cowork_scan` silently loses mail exported late (Mail.app was closed, slow sync, a Sent backfill): those files are older than the marker and will never be processed. Process everything that sits in `incoming/`.
7. **Empty `to`/`cc` and local time in `date`.** Without `fix_recipients.py` routing relies on the sender alone, and the dates in Notion are shifted by the time zone.
8. **The account fallback for outgoing mail.** A sent message sits in an account folder, but that does not mean it belongs to that account's project: outgoing mail is routed by recipients only.
