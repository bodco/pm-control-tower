# 10a. Setup: collecting mail from Mail.app (AppleScript + LaunchAgent)

A step-by-step recipe for `mac-mail-collector`. You need it when corporate mail is not in Gmail and the official connector cannot see it: Mail.app on the Mac becomes the source, and a JSON + EML buffer appears on disk, which the skills then read.

This is the part you cannot "just switch on": it consists of three files and one macOS permission.

## Architecture

```
Mail.app (INBOX of every account)
   │  osascript every 15 minutes
   ▼
mail_export.applescript   ← reads new mail, writes files
   │
   ▼
~/work/Mail/<Account>/incoming/*.json     (structured: from, to, subject, date, body)
~/work/Mail/<Account>/incoming-eml/*.eml  (the original message)
   │
   ▼
mac-mail-collector skill → routing by email_routing from the configs → Notion Threads DB
```

Three files live in `~/work/Mail/scripts/`:

| File | Role |
|---|---|
| `mail_export.applescript` | all the logic: walking accounts, selecting new messages, writing JSON/EML, updating timestamps |
| `mail_collector.sh` | wrapper: checks that Mail.app is running, calls the AppleScript, retries, writes the log |
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

Two things matter here: **skipping when Mail.app is not running** (otherwise the AppleScript fails and litters the log), and **a retry at the script level**, separate from the retry at the message level.

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

The log should contain `SUCCESS` lines, and the folders should contain JSON files. If you see `SKIP: Mail.app is not running`, start Mail.app and leave it open.

## Step 7. Connecting it to the framework

Routing messages across projects lives **not here**, but in the project configs, in the `email_routing` section (`03-project-config.md`). The `mac-mail-collector` skill reads the configs of all active projects, builds an address registry in memory and distributes the messages from the buffer across projects. So adding a new project to mail collection means adding `email_routing` to its config, not editing the AppleScript.

## Common mistakes

1. **Relative paths in the plist.** `~` does not work, only `/Users/<user>/...`.
2. **The agent is loaded, but Mail.app is closed.** Collection is silently skipped every time; the log will show `SKIP`.
3. **The Automation permission was not granted.** The script fails for no visible reason, the log is empty.
4. **Moving the timestamp on a partial failure.** If you rewrite the AppleScript, keep the "move forward only on full success" rule, otherwise silent holes will appear in the collected mail.
5. **Walking all mailboxes instead of INBOX.** The buffer grows to tens of thousands of files in a single night.
