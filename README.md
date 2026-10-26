# PM Control Tower

**An AI framework and personal operating system for a project manager.**

[Українською](README.uk.md) · [Website](https://tower.bodco.pm) · [Notion template](https://bodco.notion.site/pm-control-tower) · [Documentation](docs/en/)

Built over a year on a real fintech delivery project and cleaned up for public use.
Routine work (collecting context, preparing for meetings, writing reports, tracking
risks, keeping the board honest) runs on a schedule in the background. The project
manager spends the day on judgement, not on repackaging information.

Built and tested on macOS. Cowork also runs on Windows: `mac-mail-collector` and
`live-tips` need a Mac, a few skills need your computer on any OS, the rest use cloud
connectors only. Windows itself is not tested yet. The per-skill list is on the
[website](https://tower.bodco.pm/skills/#where) and in the [skills cheatsheet](docs/en/18-skills-cheatsheet.md).

---

## The idea in three sentences

Skills know nothing about your project. Every project fact (team, channels, tracker,
access, meeting cadence) lives in **one config file per project**, which every skill
reads as its first step, every time.

When your team changes or an access disappears, you edit one text file and the whole
library works with the new reality a second later. Nothing is hardcoded anywhere else.

---

## What is here

| Folder | What it is |
|---|---|
| `plugin/` | A Claude plugin: 22 project-agnostic PM skills plus MCP server config. Source files |
| `dist/pm-control-tower.plugin` | The same plugin, packed and ready to install in one click |
| `tools/live-transcriber/` | The local call recorder for `live-tips`: microphone + system audio, Whisper on the Mac, the tips window, a LaunchAgent and an installer (`docs/en/17-live-tips.md`) |
| `tools/live-tips-app/` | Live Tips for macOS (beta): the same tips as a menu bar app with your own Claude API key, no Cowork chat during the call (`tools/live-tips-app/README.md`, `docs/en/17-live-tips.md` section 14) |
| `tools/notion-mirror/` | A read-only Markdown copy of your Control Tower Notion on the Mac, used for facts and local search; set up from the Live Tips app or by hand (`tools/notion-mirror/README.md`) |
| `docs/en/` | Framework documentation in English |
| `docs/uk/` | The same documentation in Ukrainian |
| `templates/` | `secrets.env.example`: variable names, fake values, and where the real file must live (the same copy travels inside the plugin) |
| `templates/documents/` | a sample document template and a README: how to plug in company or personal templates (`docs/en/15-document-templates.md`) |
| `templates/cowork-global-instructions.md` | a Cowork global instructions template (Ukrainian and English) for step 6 of `docs/en/16-runbook.md` |

## The Notion template

The framework stores everything in a Notion hub of eleven connected databases:
Threads, Meetings, Topics, Decisions, Reports, Risks, Tasks Tracker, Inbox,
Knowledge Base, Projects, Workspaces.

A ready-to-duplicate template is published here:

**https://bodco.notion.site/pm-control-tower**

Duplicate it, then point the skills at your own database IDs. The template is fully
usable on its own, with none of the automation in this repository.

---

## Getting started

1. Duplicate the Notion template.
2. Install the plugin: send `dist/pm-control-tower.plugin` to yourself in Claude and press install.
3. Say to Claude: `set up the pm-control-tower plugin for me`. It walks you through
   every `~~` placeholder: your database IDs, your home folder, your tracker.
4. Say to Claude: `set up a new project <Name>, case A`. It builds the config, the Notion pages and the folders itself.
5. Try it: `prepare me for the sync on <your project>`.

Step by step with prompts: `docs/en/16-runbook.md`. Full instructions: `plugin/SETUP.md`. Placeholder reference: `plugin/CONNECTORS.md`.

**Start with four skills.** `projects` (infrastructure, read by everything else),
`daily-team-prep`, `weekly-overview` and one collector (`slack-collector`, or
`mac-mail-collector` if your work lives in mail). The rest connects when you need it.

---

## The skill library

Twenty-two skills in six groups. Which phrase starts each one, how often to run it and what
it needs: [docs/en/18-skills-cheatsheet.md](docs/en/18-skills-cheatsheet.md).

**Foundation:** `projects` (the config registry every other skill reads first),
`project-lifecycle` (kickoff, handover, health check, closure).

**Collect and sort:** `slack-collector`, `mac-mail-collector`, `inbox-responder`,
`thread-ticket-sync`, `topic-manager`.

**Prepare and call:** `daily-team-prep`, `client-meeting-prep`, `live-tips`,
`notion-meeting-topics`.

**Report:** `weekly-overview`, `client-report` (weekly, monthly, steering),
`velocity-report`, `client-satisfaction-tracker`.

**Scope and risk:** `change-request`, `risk-register`.

**Tracker and stability:** `jira-management`, `jira-board-health`, `stability-scan`,
`sentry-assistant`, `deploy-analysis`.

About `live-tips`: local transcription, tips while you talk in a small always-on-top window
under the camera (with a fact search and a field for questions, 🆘 HELP NOW for the next
sentence to say, pause, hidden from screen sharing by default) or in the chat, optional
speaker naming and search by meaning that stay on the Mac, a Meetings DB page
with the transcript after the call; requires a Mac with Apple Silicon, see
`docs/en/17-live-tips.md`. Typical use: in one Cowork session, prep the meeting first
(meeting details, Notion pages or a folder to focus on), then say `live tips <project>` right before
the call; audience and type are detected automatically, presentations and interviews get
their own prep. Model: Sonnet 5.5 for everyday calls, Opus 5.5 for interviews and
high-stakes calls.

**New, beta:** the Live Tips app, a native macOS menu bar app that runs the same tips without a Cowork chat, with your own Claude API key: [download LiveTips-0.5.6-beta.dmg](https://github.com/bodco/pm-control-tower/releases/download/live-tips-app-v0.5.6/LiveTips-0.5.6-beta.dmg) (macOS 14.4+, Apple Silicon, not notarized yet, so open it the first time with right-click > Open; see `tools/live-tips-app/README.md`).

---

## Two rules worth knowing before you start

**Never guess the project.** If a request does not name a project, the skill asks
instead of assuming. Mixing two clients' data is the worst failure mode a system
like this can have.

**The set travels whole or not at all.** If you install the plugin and then upload a
separate skill with the same name, the plugin version shadows it and the skill looks
for configs in the wrong place. This matters most for `projects`: there must be
exactly one in the system.

---

## What is deliberately not here

- **Secrets.** No values, anywhere. Only variable names and the command that reads them.
- **Client-specific adapters.** A different project means a different stack and tracker.
  Those skills are written in place.
- **Third-party MCP server code.** The configuration travels, the Jira and Bitbucket
  servers themselves you clone yourself.

---

## Status and versions

**Status: beta.** The author uses this every day, but the plugin has never been installed on
anyone else's account yet: the first handover pilot with a colleague is still ahead
(`docs/en/13-open-questions.md`, #49). Budget one quiet evening for the basic loop and a few
weeks of calibration for your own project, not an hour.

| Version | Date | What changed |
|---|---|---|
| 1.0.0 | 2026-09-11 | First public package: 21 skills, the Notion template, documentation in two languages |
| 1.1.0 | 2026-09-19 | Plugin aligned with the documentation and the public Notion template (relation names, the `AI Review` / `Progress` statuses, config keys from `_template.md`, `task_tracker.api_access` in 14 engines, the 5-minute rule); anonymization; `.mcp.json` with the `jira` and `confluence` servers; the secrets template inside the plugin |
| 1.2.0 | 2026-09-23 | Custom document templates: a template key for every document, the house registry `projects/_templates.md`, the `pm_profile.templates` block in the config, the "Document templates" rule in `projects/SKILL.md`, a **Template** line in 18 skills, the `template-check` mode of `project-lifecycle`, document `15` with the document catalog; step-by-step document `16` (setup from scratch and a new project through kickoff) and a global instructions template |
| 1.3.0 | 2026-09-24 | Mail and sync prep from live use: `mac-mail-collector` collects Sent mail (a separate AppleScript, outgoing threads with the 📤 icon, routing by recipients only), fills `to`/`cc` and `date_utc` from the EML (`fix_recipients.py`), processes everything in `incoming/` instead of filtering by a time marker, keeps an optional `backlog/`, reports collector health, moves a file only after a successful Notion write; routing counts non-shared `client_emails`. `daily-team-prep`: sync time from the PM, then the calendar, then the config; window from the calendar when the previous prep is older than 7 days; Sentry `statsPeriod` 24h/14d with new vs recurring issues; idle assignees rule; "points for discussion" section; Reports rows created with a data source parent and verified after saving (now a rule in `projects/SKILL.md`). Document `10a` updated for Sent and `fix_recipients.py`, lesson 23 in `11` |
| 1.4.0 | 2026-10-02 | Threads DB status and icon rules from live use: one canonical table in `projects/_standards.md` section 11, every skill and document points there. Collectors recompute `Status` and the icon on every pass, not only when `Last Reply Date` moved (rows used to sit on an open status for months after the work shipped and the client confirmed). The `slack-collector` review pass (new Step 3B) covers every non-Closed Slack thread of the project with no date window: filtering by `Last Reply Date` was circular, a row with unrecorded replies excluded itself. The icon follows the status, not the last author (closed threads no longer carry 🔴, the flagged count is honest); Email keeps the 📤 override. No immutable statuses; only collectors write `Status` and the icon, `inbox-responder` reads them and queues `Need Follow-up`, `Awaiting Reply` and `AI Review` rows without a draft. This release swapped the meanings of `Awaiting Reply` and `Need Follow-up` by mistake, fixed in 1.5.1 |
| 1.5.0 | 2026-10-03 | Optional `bitbucket` MCP server for a self-hosted Bitbucket Server / Data Center: a block in `.mcp.json` (placeholders `~~bitbucket-base-url`, `~~bitbucket-mcp-path`), `BITBUCKET_TOKEN` in the secrets template, a section in `CONNECTORS.md` (clone and build `n11techhub/mcp-bitbucket`, token only, read-only rights recommended; no skill of the plugin uses it yet), rows in documents `01`, `05`, `10` and `16`. Skills are unchanged |
| 1.5.1 | 2026-10-05 | Fix to 1.4.0: the meanings of `Awaiting Reply` and `Need Follow-up` were swapped by mistake and are restored. `Awaiting Reply` (🔴) = a reply or action is owed by us; `Need Follow-up` (⏳) = we asked, the ball is on their side and we have to nudge them with a follow-up. Corrected in `projects/_standards.md` section 11, `slack-collector`, `project-lifecycle`, the glossary and the public Notion template |
| 1.5.2 | 2026-10-10 | Focus desk documented (the inline dashboard at the top of the public Notion template: My day with Do next, Reply & follow up, Risks needing attention, Recent reports; Overdue), Meeting type options `Client Sync` and `Retro`, a note on relation names without emoji in document `02`. `Restricted internal sources`: a generalized rule in `projects/SKILL.md` and a `restricted_sources` block in `_template.md` (candid internal channels are context only and never reach the client, not even by paraphrase), optional config keys `scope_jql` and `instructions_doc`, documents `03` and `11` (lesson 24). Hygiene: stale notes about `_projects/`, CLAUDE.md, the retired Gmail collector and the author's local linter removed; `plugin/README.md` status refreshed; `Notion/` added to `.gitignore`. Skills logic unchanged |
| 1.6.0 | 2026-10-11 | Live tips: a co-pilot on the call. New skill `live-tips` (local transcription of the call, Live Brief of the project, tips in the chat on triggers: CR-like asks, promised dates and estimates, contradictions with decisions, the PM's own inaccurate or incomplete answers, side talk in another language; three ways to end the meeting; after the stop a page in the project's Meetings DB with a generated name and a date mention in the title, `Date`, `Project`, `Workspace`, the transcript in an AI Meeting Notes block and a wrap-up). New folder `tools/live-transcriber/`: the local recorder (Swift `audiocap` for microphone and system audio via a Core Audio process tap, Whisper large-v3-turbo on MLX, VAD, echo and hallucination filters, a LaunchAgent, `install.sh`), LaunchAgent name configurable via `launchd_label`. Document `17` in two languages: architecture, install from scratch, running a call, ending it, the Notion API limit on meeting-notes transcripts, troubleshooting, a checklist for a colleague. Same release, later additions: tips built for a small window under the camera (a bold gist in your language first, then a ready phrase in the language of the call, simple English sentences, no abbreviations); the Live Brief starts from what was prepared earlier in the session (meeting prep, named Notion pages or a folder) without losing the rest of the project context; an interview mode that tracks planned questions and suggests follow-ups; an opening line when you start the meeting and an instant "your turn" tip with your update when someone calls you by name (`settings.user.name_aliases`); switching language mid-call (your mic recognised only among your own languages, tips follow the language you are asked to speak); model guidance (Sonnet 5.5 for everyday calls, Opus 5.5 for interviews and high-stakes calls); the recorder reports the Mac time zone itself and stops cleanly when its Terminal window is closed; `plugin/SETUP.md` step 7 and runbook step 8 on how to make the skill work |
| 1.6.1 | 2026-10-11 | Notion template and docs aligned: relation names, Decisions Historical, AI Review Queue in Topics/Risks, Follow-Up Check fix, risk-register Source as array, sync runbook |
| 1.6.2 | 2026-10-11 | Live tips, second round. An always-on-top tips window under the camera (`tools/live-transcriber`: `bin/prompter` built from `src/prompter.swift` and `src/prompter.html`): movable, resizable, minimisable and closable, remembers its position, has a field for questions that the skill answers in the same window, reopens on request ("відкрий суфлер" in the chat) with every tip so far if closed by accident, and asks macOS to stay out of screen capture (verified: Google Meet in Chrome, entire screen, macOS 26). `read_delta.py` writes tips for the window and returns typed questions; `tips.output` (`window` / `chat` / `both`) in the skill settings. Also in this round: tips built for a small window (a bold gist in your language, then a ready phrase in the language of the call, simple English, no abbreviations), prep in the same session and an interview mode, an opening line and an instant "your turn" update when someone calls you by name (`name_aliases`), switching language mid-call (`me_langs`), model guidance, the recorder reports the Mac time zone and stops cleanly when its Terminal window is closed; `plugin/SETUP.md` step 7 |
| 1.7.0 | 2026-10-14 | Live tips, a faster and more useful prompter. **Instant cards**: the prep writes trigger phrases with ready tips (`<transcript>.cards.json`), the recorder shows a card within 1-2 s of the phrase, before Claude thinks. Tips window: a gear row (meeting type, interview role, language and microphone, switched on the fly without losing the transcript), an agenda strip with ✓ / ○, quick asks (Suggest reply, Catch me up, Decided so far, What to ask now), ✓ / ✕ ratings on every tip, the delay of each tip and a talk meter, a help panel (ⓘ), a refresh button (🔄), the status line at the bottom, English UI; `bin/demo_prompter.py` plays a scripted call. **Fast start** (`start.mode: window`): the recording starts at once, settings are corrected in the window. Meeting types: Internal standup (report or lead), Client meeting, Working session, Job interview with three roles (observer, candidate, interviewer) and a post-interview analysis. Prep ahead and a context refresh mid-call, run in a subagent to keep the session context small. The loop must not fall silent: `read_delta` keeps the call state and a heartbeat, the window shows a red warning after 75 s without a poll, and the optional `tools/live-tips-keepalive` plugin blocks the end of the turn while a call is recorded. After the call: the wrap-up goes into the meeting's existing Notion page (for example the Notion AI Meeting Notes one) instead of a duplicate, and the PM's notes become project lessons (`live/lessons.md`) and proposed skill changes. Transcript: prompt echoes and sound descriptions ("music playing") are dropped. |
| 1.6.3 | 2026-10-12 | Live tips, transcript quality. `audiocap` no longer loops mic restarts (a restart caused the next one, several a second, so the mic lost about a quarter of its audio and the "me" lines were garbled and late); re-run `install.sh` to rebuild it. Timestamps follow the clock when a source loses audio (`gap_resync`, `audio_lost_s` in `status.json`). Whisper artefacts are dropped: subtitle credit lines the model learned from internet videos, repetition loops, lines that only repeat the `prompt` names. The first language in `langs` is the main one (`lang_bias`); Russian removed from the default sets. New comment moments: when others finish a thought and a reaction is expected, the skill suggests what to add without waiting for a direct question (`tips.comment_prompts`, `tips.comment_rate_seconds`). Tips window: a `🎙` mute button (the mic is not transcribed while you are muted in the meeting, the transcript marks it) and a `💬` button for how often comment hints come (45 s, 20 s, off, 90 s, read by the skill as `@@SET`). Choice of microphone: `audio.mic: default | mac_mic` (or "mac mic" when starting) records the Mac's own microphone whatever headset is connected (`audiocap --device builtin`). |
| 1.8.0 | 2026-10-21 | Live tips, rebuilt for long calls. **Skill split**: the 97 KB SKILL.md became a small core (invariants, priority order, a start checklist with "done when", a per-poll checklist, an `@@` line table) plus 13 modules in `references/` read on demand (start, speech, sweep, window, checks, proactive, culture, research, presentation, hiring, wrapup, start-chat, fallback-notion). **`bin/lt`** does the mechanical steps (`start`, `status`, `stop`, `prep-check [--adopt-prep] [--fix]`, `state`, `wrapup-data`, `speakers`, `index`, `search`) with Mac path mapping (`--mac-root`); `read_delta.py` takes the offset from the state file (`auto`), merges the skill's state lines from the heredoc, adapts the settle to questions and prints `@@SOS`, `@@MODE`, `@@SPEAKERS`, `@@DUE` reminders (prep, state, ack, wrapup) and a stale status. **Meeting concept**: audience `auto` / `team` / `client` / `boss`, type `auto` / `presentation` / `interview` (with a role), a live mode (presenting or discussion); "working session" removed; proactive tips (comment moments, initiative) off by default; a culture lens for client calls from the config's Cultural Profile; the answer check only on client and boss calls. **Tips window redesign**: a top bar (recording dot, title, timer, talk share, mic mute, ⚙), one ⚙ menu (Call, Display, Context, Diagnostics, Help), one alert slot with action buttons (Use Mac mic, Back to headset), a dock (agenda line, Now/Next, pinned cards including the speech; an unpinned card returns to its place), one input that searches facts locally and sends questions, ⏸ / ▶ pause tips and 🆘 HELP NOW (local instant facts, then Claude's next sentence), a ❓ question marker, the interface in English (default) or Ukrainian (tip gists in Ukrainian when the interface or the call is), a stealth switch (on by default, hidden from screen sharing and screenshots; needs a rebuild via `install.sh`), a text size slider and Cmd+ / Cmd-. **Speaker identification** (optional, local: sherpa-onnx with a WeSpeaker model, `bin/install-voices.sh`): voices clustered as Speaker 1..N, a "Who is speaking?" card after ~8 s with suggestions from a local voice library and the project people, never auto-assigned, a "now speaking" line to rename, fix a line or merge, names applied to the whole call and `<title>.named.md`, never delaying a line or a tip; voice prints only in local `voices/`. **Mic reliability**: a watchdog for a frozen mic stream (restart, kill, backoff, never gives up, automatic switch to the Mac mic after 2 failures, digital silence counts), an `audiocap` start-up watchdog and permission timeout, one transcript marker per stall plus a recovery marker. **Local semantic layer** (optional: Ollama with `bge-m3`): facts and cards by meaning, the live topic for HELP NOW, a per-project index of text files including the local Notion mirror (`lt index`, `lt search`, `.livetips-index/`, secrets excluded), per-call logs and a wrap-up line to judge usefulness, a "Local AI (Ollama)" switch. **Prep and wrap-up**: the sweep is done only when `cards.json` and `facts.json` exist (`lt prep-check`), state is saved by the tool, wrap-up numbers come from `lt wrapup-data`, the wrap-up item in the window is mandatory. Document `17` and the tools README in both languages: architecture, install (voices, Ollama, pre-index), the window, settings, troubleshooting, privacy of voice prints, the colleague checklist |
| 1.8.1 | 2026-10-23 | Live tips: voices remembered by scope (your team for every project, clients per project, nothing on a public call: `people_team`, `voices_remember`), the tips window with pause in the top bar, a red HELP button and global shortcuts Control-Option-H / Control-Option-P, the Who is speaking card folds after 20 s; the recorder can run next to the Live Tips app on the same call (`stem_suffix`). New `tools/notion-mirror/` (the Notion -> Markdown mirror, `--discover`) and the Live Tips app 0.5.0 beta (hedged requests, interview roles, tip model per call, Notion mirror setup) |
| 1.8.2 | 2026-10-23 | Live tips, from a review of 41 recorded calls: the skill drops a tip whose question is already answered ("Still open?"), a name in the third person is not an address, a volume cap on team calls, faster polling; prep takes the last calls as a source, writes facts of three kinds (number, position, meaning), never states unverified facts, keeps cards to the other side with two-word triggers; presentation: quiet local layer, one time line, numbers per slide on the Now card. Recorder: segments close at 9 s (12 before), keyword facts need 3 matching words, cards ignore one short word. App 0.5.1 beta with the same rules in code (stale check, number validation, streamed first line, parallel classify) |
| 1.8.3 | 2026-10-23 | Live tips: `lt digest` (the last calls of the project: questions to the PM with answers, promises, typed lines, action items) feeds the prep and the app; plan-aware presentation tracker, `qa` per slide answered locally, an entry card before the PM's slide, one time line; the wrap-up can add a blind judge line; app 0.5.2 beta with meeting types in code and a judge after every call |
| 1.8.4 | 2026-10-23 | Live tips: a question to anyone on the call (not only to the PM) gets a fact tip when the brief, the cards or Current State answer it; "Your turn" only when the PM is addressed, never predicted from the order of a round; tips window opacity fades the cards, the title bar stays solid. App 0.5.4 beta: a running picture of the call (status line, "On me" panel, speech points struck through, a call summary card), red tips only for the PM, "Prepare now" with Claude Code and a progress bar, project folder search, a transcript pane with speaker fixes, speakers as first name + initial remembered per meeting series, the speech as the first card, workspace calls with the member projects' Current State, a visible "Call ended" |
| 1.8.5 | 2026-10-27 | Live tips (skill): the call picture in the skill window too (topic, whose it is, "Your turn", speech points struck through once said); red only when the PM is addressed, the same answer at most once in 10 min, tips in the call's language. App 0.5.5 beta: a welcome tour (permissions, work folder, active projects, Claude, Notion, install), projects from plain folders without Notion, Notion meeting pages in any database (pick one or create "Meetings"), recording consent (off by default), the Notion title date from Start call, the last call's cost in the menu, one look for Start call, Settings, Setup and the tips window, "Add folder" in Start call |

Open questions and the technical backlog: `docs/en/13-open-questions.md`.

---

## Licence

MIT. Use it, change it, ship it.

Made by a project manager with 6+ years in software delivery, used daily on real
client projects.
