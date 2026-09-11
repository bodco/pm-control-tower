# 10a. Setup: збір пошти з Mail.app (AppleScript + LaunchAgent)

Покроковий рецепт для `mac-mail-collector`. Потрібен, коли корпоративна пошта не в Gmail і офіційний конектор її не бачить: Mail.app на Маку стає джерелом, а на диску зʼявляється буфер JSON + EML, який далі читають скіли.

Це та частина, яку не можна "просто увімкнути": вона складається з трьох файлів і одного дозволу в macOS.

## Архітектура

```
Mail.app (INBOX кожного акаунта)
   │  osascript раз на 15 хв
   ▼
mail_export.applescript   ← читає нові листи, пише файли
   │
   ▼
~/work/Mail/<Акаунт>/incoming/*.json     (структуровано: from, to, subject, date, body)
~/work/Mail/<Акаунт>/incoming-eml/*.eml  (оригінал листа)
   │
   ▼
скіл mac-mail-collector → маршрутизація за email_routing з конфігів → Notion Threads DB
```

Три файли живуть у `~/work/Mail/scripts/`:

| Файл | Роль |
|---|---|
| `mail_export.applescript` | вся логіка: обхід акаунтів, вибірка нових листів, запис JSON/EML, оновлення таймстемпів |
| `mail_collector.sh` | обгортка: перевіряє, що Mail.app запущений, викликає AppleScript, ретраїть, пише лог |
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

Дві речі, які тут важливі: **пропуск, коли Mail.app не запущений** (інакше AppleScript впаде і засмітить лог), і **ретрай на рівні скрипта**, окремо від ретраю на рівні листа.

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

У логу мають бути рядки `SUCCESS`, у папках - JSON-файли. Якщо `SKIP: Mail.app is not running` - запустити Mail.app і не закривати.

## Крок 7. Підключення до фреймворку

Маршрутизація листів по проєктах живе **не тут**, а в конфігах проєктів, у секції `email_routing` (`03-project-config.md`). Скіл `mac-mail-collector` читає конфіги всіх активних проєктів, будує реєстр адрес у памʼяті і розкладає листи з буфера по проєктах. Тому додати новий проєкт до збору пошти = дописати `email_routing` у його конфіг, а не правити AppleScript.

## Типові помилки

1. **Відносні шляхи у plist.** `~` не працює, тільки `/Users/<user>/...`.
2. **Агент завантажено, але Mail.app закритий.** Збір мовчки пропускається щоразу; у логу буде `SKIP`.
3. **Дозвіл Automation не виданий.** Скрипт падає без видимої причини, лог порожній.
4. **Зсув таймстемпа при частковому збої.** Якщо переписуєте AppleScript, збережіть правило "зсувати тільки при повному успіху", інакше зʼявляться тихі дірки в зібраній пошті.
5. **Обхід усіх скриньок замість INBOX.** Буфер розростається на десятки тисяч файлів за одну ніч.
