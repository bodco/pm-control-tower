// Automation: Cowork scheduled tasks, skills and their runs. Read-only.
//
// The dashboard never starts, stops or edits anything here. It reads two
// Notion databases that a sync task keeps current (see DEVELOPMENT.md,
// "Automation bridge"):
//   automation_db  one row per scheduled task or skill
//   runs_db        one row per run
// Both are optional. Without them /api/automation answers { configured: false }.
//
// AutomationSource is the interface the API uses:
//   async list() -> { items: AutomationItem[], runs: AutomationRun[] }
// AutomationItem: { id, url, kind: 'task'|'skill', name, summary, schedule,
//   project (slug|null), state, source, lastRun, lastResult, nextRun }
// AutomationRun: { id, url, name, automationId, project, started, finished,
//   trigger, result, summary, link }

import { prop } from './notion.js';

export const AUTOMATION_SCHEMA = {
  items: {
    title: 'Name', kind: 'Kind', summary: 'Summary', schedule: 'Schedule', project: 'Project',
    state: 'State', lastRun: 'Last run', lastResult: 'Last result', nextRun: 'Next run', source: 'Source',
    skillValue: 'Skill',
  },
  runs: {
    title: 'Name', automation: 'Automation', started: 'Started', finished: 'Finished', trigger: 'Trigger',
    result: 'Result', summary: 'Summary', link: 'Link', project: 'Project',
  },
};

export function notionAutomationSource({ notion, itemsDb, runsDb, slugOf, schema = AUTOMATION_SCHEMA, runDays = 21 }) {
  const A = schema.items;
  const R = schema.runs;
  const mapItem = (pg) => ({
    id: pg.id, url: pg.url,
    kind: prop(pg, A.kind) === A.skillValue ? 'skill' : 'task',
    name: prop(pg, A.title) || '(untitled)',
    summary: prop(pg, A.summary) || '',
    schedule: prop(pg, A.schedule) || '',
    project: slugOf(pg, A.project),
    projectSet: (prop(pg, A.project) || []).length > 0,
    state: prop(pg, A.state) || 'Active',
    source: prop(pg, A.source) || null,
    lastRun: prop(pg, A.lastRun), lastResult: prop(pg, A.lastResult), nextRun: prop(pg, A.nextRun),
  });
  const mapRun = (pg) => ({
    id: pg.id, url: pg.url,
    name: prop(pg, R.title) || '(untitled)',
    automationId: (prop(pg, R.automation) || [])[0] || null,
    project: slugOf(pg, R.project),
    started: prop(pg, R.started), finished: prop(pg, R.finished),
    trigger: prop(pg, R.trigger) || 'Schedule',
    result: prop(pg, R.result) || 'Done',
    summary: prop(pg, R.summary) || '',
    link: prop(pg, R.link) || null,
  });
  return {
    async list() {
      const since = new Date(Date.now() - runDays * 86400000).toISOString().slice(0, 10);
      const [items, runs] = await Promise.all([
        notion.query(itemsDb, { maxPages: 3 }),
        runsDb ? notion.query(runsDb, {
          filter: { property: R.started, date: { on_or_after: since } },
          sorts: [{ property: R.started, direction: 'descending' }],
          pageSize: 100, maxPages: 1,
        }) : [],
      ]);
      // Rows tied only to projects outside this deployment are not shown.
      return {
        items: items.map(mapItem).filter((x) => x.project || !x.projectSet).map(({ projectSet, ...x }) => x),
        runs: runs.map(mapRun),
      };
    },
  };
}

// Invented data for the demo and tests (names follow the docs' neutral examples).
export function fixtureAutomationSource(slugs = []) {
  const [p1, p2] = slugs;
  const now = Date.now();
  const iso = (h) => new Date(now + h * 3600000).toISOString();
  const items = [
    { id: 'a1', kind: 'task', name: 'Morning routine', summary: 'Picks at most 5 small items for today.', schedule: 'Weekdays 09:00', project: p1 || null, state: 'Active', source: 'Cloud', lastRun: iso(-3), lastResult: 'Done', nextRun: iso(21) },
    { id: 'a2', kind: 'task', name: 'Slack collector', summary: 'Pulls new Slack messages into Threads.', schedule: 'Daily 07:05', project: p1 || null, state: 'Active', source: 'Cloud', lastRun: iso(-5), lastResult: 'Failed', nextRun: iso(19) },
    { id: 'a3', kind: 'task', name: 'Weekly overview', summary: 'Monday card per project with my next moves.', schedule: 'Mondays 08:50', project: null, state: 'Active', source: 'Cloud', lastRun: iso(-60), lastResult: 'Done', nextRun: iso(70) },
    { id: 'a4', kind: 'task', name: 'Backfill (manual)', summary: 'Loads older history a few sources per run.', schedule: 'Manual', project: p2 || null, state: 'Manual', source: 'Cloud', lastRun: null, lastResult: null, nextRun: null },
    { id: 's1', kind: 'skill', name: 'client-report', summary: 'Weekly or monthly report for the client, in English.', schedule: 'On request', project: null, state: 'Active', source: 'Skill' },
    { id: 's2', kind: 'skill', name: 'risk-register', summary: 'Keeps the RAID register current.', schedule: 'On request', project: null, state: 'Active', source: 'Skill' },
    { id: 's3', kind: 'skill', name: 'release-notes', summary: 'Stage vs production notes from code.', schedule: 'On request', project: p1 || null, state: 'Active', source: 'Skill' },
  ].map((x) => ({ url: '#', ...x }));
  const runs = [
    { id: 'r1', name: 'Morning routine', automationId: 'a1', project: p1 || null, started: iso(-3), finished: iso(-2.9), trigger: 'Schedule', result: 'Done', summary: '4 items picked, 1 carried over.' },
    { id: 'r2', name: 'Slack collector', automationId: 'a2', project: p1 || null, started: iso(-5), finished: iso(-4.95), trigger: 'Schedule', result: 'Failed', summary: 'Slack connector was not available.' },
    { id: 'r3', name: 'Weekly overview', automationId: 'a3', project: null, started: iso(-60), finished: iso(-59.9), trigger: 'Schedule', result: 'Done', summary: '2 projects, 3 moves for me.' },
    { id: 'r4', name: 'Backfill (manual)', automationId: 'a4', project: p2 || null, started: iso(-0.2), finished: null, trigger: 'Manual', result: 'Running', summary: '' },
  ].map((x) => ({ url: '#', link: null, ...x }));
  return { async list() { return { items, runs }; } };
}
