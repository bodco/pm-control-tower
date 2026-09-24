# 10a. Setup: збір пошти з Mail.app (AppleScript + LaunchAgent)

Покроковий рецепт для `mac-mail-collector`. Потрібен, коли корпоративна пошта не в Gmail і офіційний конектор її не бачить: Mail.app на Маку стає джерелом, а на диску зʼявляється буфер JSON + EML, який далі читають скіли.

Це та частина, яку не можна "просто увімкнути": вона складається з кількох скриптів, LaunchAgent і одного дозволу в macOS.

## Архітектура

```
Mail.app (INBOX і Sent кожного акаунта)
   │  LaunchAgent раз на 15 хв, лише коли Mail.app запущений
   ▼
mail_collector.sh
   ├─ mail_export.applescript       ← INBOX: нові листи за таймстемпом скриньки
   ├─ mail_export_sent.applescript  ← Sent: вікно 5 днів, дедуп за фактом файлу
   └─ fix_recipients.py             ← дописує to/cc і date_utc із заголовків EML
   ▼
~/work/Mail/<Акаунт>/incoming/*.json     (from, to, cc, subject, date, date_utc, body, mailbox, direction)
~/work/Mail/<Акаунт>/incoming-eml/*.eml  (оригінал листа)
   │
   ▼
скіл mac-mail-collector → маршрутизація за email_routing з конфігів → Notion Threads DB
```

Файли живуть у `~/work/Mail/scripts/`:

| Файл | Роль |
|---|---|
| `mail_export.applescript` | INBOX: обхід акаунтів, вибірка нових листів, запис JSON/EML, оновлення таймстемпів |
| `mail_export_sent.applescript` | Sent: відправлені листи кожного акаунта за останні N днів (за замовчуванням 5), той самий формат JSON/EML з `"mailbox": "Sent"` і `"direction": "outgoing"` |
| `fix_recipients.py` | дописує порожні `to`/`cc` і `date_utc` у JSON із заголовків EML-оригіналу |
| `mail_collector.sh` | обгортка: перевіряє, що Mail.app запущений, по черзі викликає INBOX, Sent і `fix_recipients.py`, ретраїть, пише лог |
| `com.<org>.mail-collector.plist` | LaunchAgent: запускає обгортку кожні 15 хвилин |

## Крок 1. Папка і структура

```bash
mkdir -p ~/work/Mail/scripts
```

Буфер сам створюється скриптом: під кожен акаунт Mail.app зʼявиться `~/work/Mail/<Акаунт>/incoming/` і `incoming-eml/`.

## Крок 2. AppleScript

Ключові рішення, які варто зберегти при переписуванні під себе:

- **Обходити тільки `INBOX`.** Інакше архіви й спам зіллються в буфер тисячами файлів.
- **Таймстемп на кожну поштову скриньку** у `~/work/Mail/.last_scan_timestamps.json`.
- **Таймстемп зсувається тільки якщо ВСІ листи скриньки оброблені без помилок.** Це головна ідея: при частковому збої наступний прогін перечитає той самий діапазон, а вже збережені файли пропустить за фактом існування файлу. Так не буває дірок у зібраному.
- **Ретрай на кожен лист** до 3 разів, і лише потім лічильник помилок.
- **Санітизація назви акаунта** для імені папки (пробіли, кирилиця, слеші).
- **Перевірка "файл уже є" дивиться в `incoming/`, `processed/` і `backlog/`**, а не лише в `incoming/`. Тоді скіл може спокійно переносити файли між папками, а експорт їх не дублює.

## Крок 2b. Відправлені листи (Sent)

Навіщо: відправлений лист у Threads DB - це запис, що звіт, інвойс, пакет документів чи ескалація справді пішли клієнту (іконка 📤, поки немає відповіді), а тред бачить обидві сторони розмови.

- **Окремий скрипт `mail_export_sent.applescript`**, щоб збій у Sent ніколи не блокував збір INBOX.
- **Sent-скриньку шукати за назвою** на верхньому рівні акаунта і на один рівень глибше: `Sent`, `Sent Messages`, `Sent Mail`, `Sent Items`, `Надіслані`, `Відправлені`, `Enviados` тощо (у кожного провайдера своя).
- **Без файлу таймстемпів.** Кожен прогін дивиться назад на N днів (аргумент скрипта, за замовчуванням 5) і пропускає листи, для яких файл уже є в `incoming/` або `processed/`. Це стійко до днів, коли Mail.app був закритий.
- **Разовий backfill.** `echo 30 > ~/work/Mail/.sent_backfill_days`: наступний прогін обгортки візьме 30 днів і перейменує файл у `.sent_backfill_days.done-<час>`.

## Крок 2c. `fix_recipients.py`

AppleScript Mail.app часто повертає `to` і `cc` порожніми, а `date` пише локальним часом Мака з оманливим суфіксом `Z`. Без виправлення маршрутизація бачить лише відправника (вихідні листи взагалі не маршрутизуються), а дати в Notion зсунуті на часовий пояс. Невеликий скрипт після експорту читає заголовки `To`, `Cc`, `Date` з EML-оригіналу і дописує `to`, `cc`, `date_utc` у JSON. Ідемпотентний: чіпає лише файли з порожнім `to` або без `date_utc`.

```python
#!/usr/bin/env python3
"""Дописує to/cc і date_utc у JSON буфера із заголовків EML. Ідемпотентний."""
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

## Крок 3. Обгортка `mail_collector.sh`

```bash
#!/bin/bash
BUFFER_ROOT="$HOME/work/Mail"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$BUFFER_ROOT/.collector.log"
mkdir -p "$BUFFER_ROOT"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

# Mail.app має бути запущений: AppleScript не піднімає його сам
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

Після блоку INBOX обгортка запускає Sent і `fix_recipients.py`:

```bash
# --- Sent: окремий скрипт, його збій не блокує INBOX ---
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

# --- to/cc і date_utc із заголовків EML ---
log "$(python3 "$SCRIPT_DIR/fix_recipients.py" "$BUFFER_ROOT" 2>&1)"
```

Три речі, які тут важливі: **пропуск, коли Mail.app не запущений** (інакше AppleScript впаде і засмітить лог), **ретрай на рівні скрипта**, окремо від ретраю на рівні листа, і **незалежність Sent від INBOX**: помилка у відправлених пишеться в лог як `SENT ERROR`, але не зупиняє решту.

## Крок 4. LaunchAgent

Файл `~/Library/LaunchAgents/com.<org>.mail-collector.plist`:

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

Шляхи в plist мають бути **абсолютні**, `~` не розкривається. `LimitLoadToSessionType = Aqua` означає "тільки в графічній сесії користувача": без цього агент може стартувати там, де Mail.app недоступний.

Завантажити:

```bash
launchctl load ~/Library/LaunchAgents/com.<org>.mail-collector.plist
launchctl list | grep mail-collector     # перевірка
```

Зупинити або перезавантажити після правок:

```bash
launchctl unload ~/Library/LaunchAgents/com.<org>.mail-collector.plist
launchctl load   ~/Library/LaunchAgents/com.<org>.mail-collector.plist
```

## Крок 5. Дозвіл macOS (найчастіша причина "нічого не працює")

Перший запуск `osascript` попросить дозвіл на керування Mail.app. Якщо агент стартував без графічної сесії, діалог не покажеться і скрипт мовчки падатиме.

Тому перший запуск роблять руками з Terminal:

```bash
osascript ~/work/Mail/scripts/mail_export.applescript
```

і підтверджують діалог. Далі перевірити: **System Settings → Privacy & Security → Automation → Terminal → Mail** увімкнено.

## Крок 6. Перевірка

```bash
tail -20 ~/work/Mail/.collector.log
ls ~/work/Mail/*/incoming/ | head
```

```bash
grep -E "SENT|fix_recipients" ~/work/Mail/.collector.log | tail -5
```

У логу мають бути рядки `SUCCESS`, `SENT OK` і `fix_recipients: N files updated`, у папках - JSON-файли з заповненими `to` і `date_utc`. Якщо `SKIP: Mail.app is not running` - запустити Mail.app і не закривати. Скіл сам показує стан колектора (довгі `SKIP`, `SENT ERROR`) у підсумку кожного прогону.

## Крок 7. Підключення до фреймворку

Маршрутизація листів по проєктах живе **не тут**, а в конфігах проєктів, у секції `email_routing` (`03-project-config.md`). Скіл `mac-mail-collector` читає конфіги всіх активних проєктів, будує реєстр адрес у памʼяті і розкладає листи з буфера по проєктах. Тому додати новий проєкт до збору пошти = дописати `email_routing` у його конфіг, а не правити AppleScript.

Вихідні листи маршрутизуються **лише за отримувачами** (`to`/`cc`): папка акаунта нічого не каже про проєкт відправленого листа, тому запасний варіант `mac_mail_accounts` для них вимкнений.

Скіл обробляє **все, що лежить в `incoming/`**, незалежно від дати файлу; `.last_cowork_scan` лише фіксує, коли скіл запускався. Старий буфер, який не треба заливати в Notion (наприклад, пошта до запуску фреймворку), переносять у `<Акаунт>/backlog/` і `backlog-eml/`: скіл туди не заходить без прямого запиту, а експорт бачить ці файли і не дублює їх.

## Типові помилки

1. **Відносні шляхи у plist.** `~` не працює, тільки `/Users/<user>/...`.
2. **Агент завантажено, але Mail.app закритий.** Збір мовчки пропускається щоразу; у логу буде `SKIP`.
3. **Дозвіл Automation не виданий.** Скрипт падає без видимої причини, лог порожній.
4. **Зсув таймстемпа при частковому збої.** Якщо переписуєте AppleScript, збережіть правило "зсувати тільки при повному успіху", інакше зʼявляться тихі дірки в зібраній пошті.
5. **Обхід усіх скриньок замість INBOX.** Буфер розростається на десятки тисяч файлів за одну ніч. Sent збирається окремим скриптом з обмеженим вікном, а не повним обходом.
6. **Фільтр за маркером часу в скілі.** `find -newer .last_cowork_scan` мовчки губить листи, експортовані пізніше (Mail.app був закритий, повільна синхронізація, backfill Sent): їхні файли старші за маркер і не будуть оброблені ніколи. Обробляти все, що лежить в `incoming/`.
7. **Порожні `to`/`cc` і локальний час у `date`.** Без `fix_recipients.py` маршрутизація спирається лише на відправника, а дати в Notion зсунуті на часовий пояс.
8. **Account fallback для вихідних.** Відправлений лист лежить у папці акаунта, але це не означає, що він стосується проєкту цього акаунта: вихідні маршрутизуються лише за отримувачами.
