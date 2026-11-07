# Design brief: PM Control Tower dashboard

A brief for a UI/UX designer (or Claude Design) to redesign the dashboard. The current UI works and is tested; this brief asks for a better experience, not new data. Screenshots of the current version: `img/dashboard-overview.png`; a live demo runs with `npm run demo`.

## The product in one paragraph

A project manager runs several client projects at once. AI skills collect their Slack and email threads, write meeting preps and reports, keep a risk register and a decision log, and put follow-ups into a personal task list, all in Notion. The dashboard is the one screen that shows what happened and what waits for the PM across every project, and lets them act on it in one tap. It is a web app installed like a native app on a phone and a laptop.

## Who and when

| Moment | Device | What the PM needs in under 10 seconds |
|---|---|---|
| Morning, first look | laptop | What is overdue, who waits for my reply, which project is on fire |
| Between calls | phone, one hand | Close the task I just finished, mark a thread as answered, jot a thought into the Inbox |
| Before a client meeting | laptop or phone | The project's state: open risks, last decisions, the latest prep report, the Current State page |
| End of day | laptop | Inbox to zero, nothing slipped |

One user, an experienced PM. Dense information is fine; slowness and hunting are not.

## Information architecture

- **Overview** (home): one card per project with its numbers, then cross-project lists.
- **Project**: tabs Today, Tasks, Threads, Meetings, Decisions, Risks, Reports, Current state.
- **Add** (global): Inbox note, Task, Decision.
- Settings are minimal: language (English, Ukrainian), refresh. Light and dark follow the system.

## Data per entity (what a row can show)

| Entity | Fields | Actions |
|---|---|---|
| Task | title, project, status (To Do, In progress, Under Review, Done, On Hold, plus custom), priority (High, Medium, Low), due date, source (manual, inbox or the skill that created it), Jira key | done / reopen, status, priority, due date, open in Notion |
| Thread | title, project, status with icon (🔴 Awaiting Reply = my turn, ⏳ Need Follow-up = their turn, 💬 Replied, 👀 Spectator, 🤖 AI Review, Closed), channel (Email, Slack, ...), category, preview, last reply time, "set by me" mark, "has draft" mark | change status, open in Slack, Mail or Notion |
| Risk | title, project, severity (Critical, High, Medium, Low), likelihood, category, kind (Risk, Issue, Assumption, Dependency), owner, summary, last updated | status, severity, open |
| Decision | one-sentence decision, project, date, area, door (one-way, two-way), stated by, context | new, Superseded or Cancelled, open |
| Meeting | title, project, date and time, type, summary | open |
| Report | title, project, date, type, internal or external, summary | open |
| Inbox note | text, notes, optional project, created | route to Tasks (pick project, due, priority), open |
| Project card | overdue, due today, awaiting my reply, high risks, open tasks, follow-ups, done in 7 days, decisions in 30 days, task status mix, last meeting, last report | open project |

Typical volumes: 3 to 8 projects, 10 to 60 open tasks, 5 to 40 open threads, up to 20 active risks.

## What to improve

1. **Triage first.** The first screen should answer "what needs me now" before "how are my projects". Consider a single prioritized queue (overdue tasks, my-turn threads, critical risks) above or beside the project cards.
2. **Project health at a glance.** A clear, honest signal per project (not a vanity score): which number makes it red, and why.
3. **One-hand phone use.** Thumb-reachable actions, swipe or long-press for status changes, bottom navigation on phone, no tiny dropdowns.
4. **Thread clarity.** Whose turn it is must be obvious without reading the icon legend; the age of the last reply matters.
5. **Fast capture.** Adding an Inbox note must be two taps and typing.
6. **Undo, not confirm.** Every change is reversible from a toast; no confirmation dialogs.
7. **Offline and stale states.** Show when data is cached and how old it is, without alarming.
8. **Empty, loading and error states** for every list.

## Constraints

- Web app (PWA), vanilla HTML, CSS and JS; no heavy framework, no external fonts or scripts at runtime (strict CSP).
- Works from 360 px phone width to a 1600 px laptop; no horizontal scrolling.
- Light and dark themes from design tokens; WCAG AA contrast; keyboard and screen reader friendly.
- Two languages, English and Ukrainian (Ukrainian strings run about 20 percent longer).
- Status and select options come from Notion and can include custom values: designs must not depend on a fixed list.
- No em dashes in any text. Example people in mockups: American names (Mike, Emily, Josh, Sarah). Example projects: "Orbit SaaS Launch", "Internal Delivery Playbook".

## Brand and ecosystem

- Start from the existing Control Tower design system (`Control Tower дизайн-система.zip` in the repository root, private) and the site at tower.bodco.pm.
- The dashboard is one module of a small ecosystem: the Control Tower dashboard (web, any device) and Pacenote (a macOS call co-pilot with its own brand, "Route P" logo). Design a shell that can later host a Pacenote area (upcoming calls, last call summaries, prep status) without looking like a different product: shared tokens, navigation and components, each module with its own accent.

## Deliverables

1. Overview, phone and laptop, light and dark.
2. Project view with the Tasks and Threads tabs, phone and laptop.
3. The Add sheet and the Route-to-Tasks sheet.
4. Row components for every entity with all states (default, hover, focused, changing, error, done).
5. Empty, loading, offline and error states.
6. A token sheet (color, type, spacing, radius, elevation) that maps onto `public/styles.css` custom properties.
7. Short notes on interactions (swipe, long-press, undo toast, pull to refresh).

## Prompt for Claude Design

Attach this brief, `public/styles.css` and two or three screenshots of the current dashboard (light and dark, phone and laptop), then paste:

```
You are redesigning the UI of "PM Control Tower", a web app (PWA) a project
manager opens on a phone and a laptop to see every project at once and act in
one tap. The attached DESIGN-BRIEF.md is the source of truth: who uses it and
when, the data on every row, what to improve, the constraints and the
deliverables. The attached styles.css holds today's design tokens; the
screenshots show the current, working version.

Goal: a calmer, faster triage experience, not new data. Keep every field and
action listed in the brief.

Please produce, in this order:
1. Overview on phone (390 px) and laptop (1440 px), light and dark: a "needs
   me now" queue first (overdue tasks, threads where it is my turn, critical
   risks), then one card per project with an honest health signal.
2. Project view with the Tasks and Threads tabs, phone and laptop.
3. The Add sheet (Inbox note, Task, Decision) and the Route-to-Tasks sheet.
4. Row components for task, thread, risk, decision, meeting, report and
   Inbox note, each with default, hover, focus, saving, error and done states.
5. Empty, loading, offline (cached data with its age) and error states.
6. A token sheet (color, type, spacing, radius, elevation) named so it maps
   onto CSS custom properties.
7. Short interaction notes: swipe and long-press on phone, undo toast instead
   of confirm dialogs, pull to refresh.

Rules: mobile first, thumb-reachable actions, bottom navigation on phone,
WCAG AA contrast, no external fonts or images at runtime, labels in English
and Ukrainian (Ukrainian runs about 20 percent longer, never break a word in
the middle), status options can be custom so never hard-code their colors to
a fixed list. No em dashes in any text. Example people: Mike, Emily, Josh,
Sarah. Example projects: "Orbit SaaS Launch", "Internal Delivery Playbook".
Leave room in the shell for a future "Calls" module from a sibling macOS app
(upcoming calls, prep status, last call summaries) with its own accent color.
```
