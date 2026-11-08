// Unit checks of the client rules (public/js/logic.js, dates.js, i18n.js):
// one definition per metric, stale never counted, the date rule, no ISO in
// titles, health, freshness, the queue, the next call, and the strings.
//   node test/logic.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as L from '../public/js/logic.js';
import { setDateContext, fmtDue, fmtAge, fmtIn, fmtWhen, cleanTitle, hasIso } from '../public/js/dates.js';
import { I18N, setLang, tn } from '../public/js/i18n.js';
import { packFor, relatedFor } from '../public/js/askclaude.js';

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`ok   ${name}`); } catch (e) { console.error(`FAIL ${name}\n     ${e.message}`); process.exitCode = 1; }
}

// A fixed "now": Thursday 2026-11-05 10:00 in Kyiv.
const NOW = new Date('2026-11-05T08:00:00Z');
setDateContext({ tz: 'Europe/Kyiv', now: () => NOW });
const day = (n) => { const d = new Date('2026-11-05T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ts = (n, h = 10) => `${day(n)}T${String(h - 2).padStart(2, '0')}:00:00.000Z`;

const cfg = {
  timezone: 'Europe/Kyiv',
  turn: { mine: ['Awaiting Reply'], theirs: ['Need Follow-up'], ai: ['AI Review'] },
  freshness: { quiet_days: 14, stale_days: 30, nudge_days: 5, turn_sla_workdays: 2, stale_bulk_days: 90 },
  riskFields: { trigger: true, reviewed: true },
  projects: [{ slug: 'orbit', name: 'Orbit SaaS Launch' }, { slug: 'playbook', name: 'Internal Delivery Playbook' }],
};
const ov = {
  tasks: [
    { id: 't1', project: 'orbit', title: 'Send weekly status report', status: 'To Do', due: day(-2) },
    { id: 't2', project: 'orbit', title: 'Confirm launch checklist', status: 'In progress', priority: 'High', due: day(0) },
    { id: 't3', project: 'orbit', title: 'Renew access', status: 'On Hold', due: day(-9) },
    { id: 't4', project: 'playbook', title: 'Update onboarding', status: 'To Do', priority: 'High', due: day(-1) },
  ],
  threads: [
    { id: 'h1', project: 'orbit', title: 'Export ETA', status: 'Awaiting Reply', lastReply: ts(-3) },
    { id: 'h2', project: 'orbit', title: 'Invoice', status: 'Awaiting Reply', lastReply: ts(-1) },
    { id: 'h3', project: 'orbit', title: 'Analytics access', status: 'Awaiting Reply', lastReply: ts(-41) },
    { id: 'h4', project: 'orbit', title: 'Stale but touched', status: 'Awaiting Reply', lastReply: ts(-60), manualAt: ts(-2) },
    { id: 'h5', project: 'orbit', title: 'QA sign-off', status: 'Need Follow-up', lastReply: ts(-6) },
    { id: 'h6', project: 'orbit', title: 'Credentials', status: 'Need Follow-up', lastReply: ts(-4) },
    { id: 'h7', project: 'orbit', title: 'Old NDA', status: 'Need Follow-up', lastReply: ts(-120) },
    { id: 'h8', project: 'playbook', title: 'Second reviewer', status: 'Awaiting Reply', lastReply: ts(-18) },
    { id: 'h9', project: 'orbit', title: 'Context only', status: 'Spectator Mode', lastReply: ts(-200) },
  ],
  risks: [
    { id: 'r1', project: 'playbook', title: 'Single reviewer', severity: 'Critical', triggerDate: day(9), lastReviewed: day(-15) },
    { id: 'r2', project: 'orbit', title: 'Credentials delay', severity: 'High', triggerDate: day(2), lastReviewed: day(-2) },
    { id: 'r3', project: 'orbit', title: 'Scope creep', severity: 'Medium', triggerDate: day(20) },
  ],
  meetings: [
    { id: 'm1', project: 'orbit', title: 'Orbit weekly 2026-11-05', date: ts(0, 15) },
    { id: 'm2', project: 'orbit', title: 'Earlier today', date: ts(0, 8) },
    { id: 'm3', project: 'playbook', title: 'Planning', date: ts(1, 10) },
  ],
};
const ctx = { cfg, ov, hidden: [], swapTurn: false };
const all = ['orbit', 'playbook'];

test('stale threads are in no metric, no queue, no your-turn list', () => {
  const ids = new Set(L.METRIC_KEYS.flatMap((k) => L.METRICS[k].items(ctx, all).map((i) => i.x.id)));
  assert.ok(!ids.has('h3') && !ids.has('h7'), 'stale ids leaked into a metric');
  assert.deepEqual(L.staleThreads(ctx, all).map((x) => x.id), ['h7', 'h3']);
  assert.ok(!L.toNudge(ctx, all).some((x) => x.id === 'h7'));
});
test('"Still relevant" (manual mark) restarts the 30-day clock', () => {
  assert.equal(L.isStale(ctx, ov.threads.find((x) => x.id === 'h4')), false);
  assert.ok(L.yourTurn(ctx, all).some((x) => x.id === 'h4'));
});
test('Spectator threads are never stale and never in the queue', () => {
  assert.ok(!L.staleThreads(ctx, all).some((x) => x.id === 'h9'));
  assert.ok(!L.queue(ctx, all).some((i) => i.x.id === 'h9'));
});
test('each number is the length of the list it opens', () => {
  const counts = L.metricCounts(ctx, all);
  for (const k of L.METRIC_KEYS) assert.equal(counts[k], L.METRICS[k].items(ctx, all).length, k);
  assert.deepEqual(counts, { needs: 9, overdue: 2, turn: 4, critical: 1, today: 1 });
});
test('the queue: overdue and critical first, then your turn by age, then today', () => {
  const q = L.queue(ctx, all).map((i) => i.x.id);
  assert.deepEqual(q, ['r1', 't1', 't4', 'h8', 'h1', 'h4', 'h2', 't2', 'r2'].filter((id) => q.includes(id)));
  assert.equal(q[0], 'r1');
  assert.ok(!q.includes('t3'), 'On Hold is not overdue');
  assert.ok(!q.includes('r3'), 'a Medium risk 20 days out is not in the queue');
});
test('to nudge: their turn after 5 days only', () => {
  assert.deepEqual(L.toNudge(ctx, all).map((x) => x.id), ['h5']);
});
test('quiet: 14 to 30 days', () => {
  assert.equal(L.isQuiet(ctx, ov.threads.find((x) => x.id === 'h8')), true);
  assert.equal(L.isQuiet(ctx, ov.threads.find((x) => x.id === 'h1')), false);
});
test('health is a rule: critical risk or old your-turn is red, any overdue is amber', () => {
  assert.equal(L.health(ctx, 'playbook').level, 'red');
  assert.equal(L.health(ctx, 'orbit').level, 'red', 'h1 waits 3 working days > SLA 2');
  const calm = { ...ctx, ov: { ...ov, tasks: [], threads: [], risks: [] } };
  assert.equal(L.health(calm, 'orbit').level, 'green');
  const amber = { ...ctx, ov: { ...ov, tasks: [ov.tasks[0]], threads: [], risks: [] } };
  assert.equal(L.health(amber, 'orbit').level, 'amber');
});
test('thresholds come from the config, per project', () => {
  const c2 = { ...ctx, cfg: { ...cfg, projects: [{ slug: 'orbit', freshness: { stale_days: 3 } }, cfg.projects[1]] } };
  assert.ok(L.isStale(c2, ov.threads.find((x) => x.id === 'h1')));
});
test('risks: trigger within 14 days to watch, not reviewed after 14 days', () => {
  assert.deepEqual(L.risksToWatch(ctx, ['orbit']).map((r) => r.id), ['r2']);
  assert.equal(L.notReviewedDays(ctx, ov.risks[0]), 15);
  assert.equal(L.notReviewedDays(ctx, ov.risks[1]), null);
  const noFields = { ...ctx, cfg: { ...cfg, riskFields: { trigger: false, reviewed: false } } };
  assert.equal(L.triggerIn(noFields, ov.risks[1]), null);
  assert.deepEqual(L.risksToWatch(noFields, ['orbit']).map((r) => r.id), ['r2'], 'without the field: Critical and High');
});
test('next call: the next meeting that has not started, today or tomorrow', () => {
  const nc = L.nextCall(ctx, all);
  assert.equal(nc.meeting.id, 'm1');
  assert.ok(nc.raise.length >= 1 && nc.raise.length <= 3);
  assert.equal(L.nextCall({ ...ctx, ov: { ...ov, meetings: [] } }, all), null);
});
test('hidden projects are left out', () => {
  const c2 = { ...ctx, hidden: ['playbook'] };
  assert.deepEqual(L.visibleSlugs(c2), ['orbit']);
  assert.equal(L.metricCounts(c2, L.visibleSlugs(c2)).critical, 0);
});
test('dates, one rule', () => {
  setLang('en');
  assert.equal(fmtDue(day(-2)).text, '2d late'); assert.equal(fmtDue(day(-2)).late, true);
  assert.equal(fmtDue(day(0)).text, 'today');
  assert.equal(fmtDue(day(1)).text, 'tomorrow');
  assert.equal(fmtDue(day(4)).text, 'Mon');
  assert.equal(fmtDue(day(10)).text, '15 Nov');
  assert.equal(fmtAge(ts(-3)), '3d');
  assert.equal(fmtAge(ts(-30)), '6 Oct');
  assert.equal(fmtAge(day(-400)), '1 Oct 2025');
  assert.equal(fmtIn(day(2)).text, 'in 2d');
  assert.equal(fmtWhen(ts(0, 15)), 'today 15:00');
  assert.equal(fmtWhen(ts(1, 10)), 'tomorrow 10:00');
  for (const s of [fmtDue(day(-2)).text, fmtAge(ts(-3)), fmtWhen(ts(0, 15)), fmtIn(day(2)).text]) assert.ok(!/ago/.test(s) && !hasIso(s));
});
test('ISO dates are cut from titles', () => {
  assert.equal(cleanTitle('Orbit weekly 2026-11-05'), 'Orbit weekly');
  assert.equal(cleanTitle('Planning 2026-11-06T08:00'), 'Planning');
  assert.equal(cleanTitle('Sync (2026-11-04 10:00:00Z) notes'), 'Sync notes');
  assert.equal(cleanTitle('Retro - 2026-11-01'), 'Retro');
  assert.equal(cleanTitle('2026-11-01'), '2026-11-01', 'a title that is only a date is kept');
});
test('Ask Claude pack: fixed project, related candidates, nothing from other projects', () => {
  const thread = { id: 'th1', url: 'https://notion.example/th1', project: 'orbit', title: 'Export flag for free card issue ORB-12', status: 'Need Follow-up', lastReply: ts(-5), reportedAt: ts(-6), description: 'Estimate for the export flag requested', slackLink: 'https://slack.example/p1', jiraKey: 'ORB-12' };
  const octx = { cfg, hidden: [], ov: {
    threads: [thread, { id: 'th2', project: 'orbit', title: 'Unrelated invoice question', status: 'Awaiting Reply', lastReply: ts(-2) }],
    tasks: [{ id: 'tk1', url: 'https://notion.example/tk1', project: 'orbit', title: 'Estimate export flag', status: 'To Do', due: day(3), jira: 'ORB-12' },
      { id: 'tk2', url: 'https://notion.example/tk2', project: 'playbook', title: 'Export flag estimate', status: 'To Do' }],
    meetings: [
      { id: 'm1', url: 'https://notion.example/m1', project: 'orbit', title: 'Orbit Client Sync', date: ts(-4) },
      { id: 'm2', url: 'https://notion.example/m2', project: 'orbit', title: 'Old sync', date: ts(-60) },
      { id: 'm3', url: 'https://notion.example/m3', project: 'playbook', title: 'Playbook sync', date: ts(-4) }],
    decisions: [{ id: 'd1', url: 'https://notion.example/d1', project: 'orbit', title: 'Export flag scope agreed', date: day(-20), context: 'export flag for free card issue' }],
  } };
  const rel = relatedFor(octx, 'thread', thread);
  assert.deepEqual(rel.meetings.map((m) => m.id), ['m1'], 'only the same project, inside 21 days');
  assert.deepEqual(rel.tasks.map((x) => x.id), ['tk1']);
  assert.deepEqual(rel.decisions.map((x) => x.id), ['d1']);
  assert.deepEqual(rel.threads.map((x) => x.id), [], 'unrelated thread is not a candidate');
  const text = packFor(octx, { kind: 'thread', x: thread });
  assert.ok(text.startsWith('[CT-RESOLVE v1]'));
  assert.match(text, /Project: Orbit SaaS Launch \(slug: orbit\)/);
  assert.match(text, /Notion page id: th1/);
  assert.match(text, /Jira key: ORB-12/);
  assert.match(text, /meeting \| Orbit Client Sync/);
  assert.ok(!text.includes('Playbook') && !text.includes('Old sync'), 'no other project, no old meeting');
  assert.ok(text.trimEnd().endsWith('My decision:'));
  assert.ok(!text.includes('\u2014'), 'em dash found');
});
test('Ask Claude pack: a task and a risk, and an empty candidate list', () => {
  const octx = { cfg, hidden: [], ov: { threads: [], tasks: [], meetings: [], decisions: [] } };
  const task = { id: 'tk9', url: 'https://notion.example/tk9', project: 'orbit', title: 'Confirm launch checklist', status: 'To Do', priority: 'High', due: day(1) };
  const text = packFor(octx, { kind: 'task', x: task });
  assert.match(text, /Item: task/);
  assert.match(text, new RegExp(`Due: ${day(1)}`));
  assert.match(text, /- none found/);
  const risk = { id: 'r9', url: 'https://notion.example/r9', project: 'orbit', title: 'Vendor delay', status: 'Open', severity: 'High', owner: 'PM', summary: 'Vendor may slip' };
  assert.match(packFor(octx, { kind: 'risk', x: risk }), /severity: High/);
});
test('Ukrainian plurals', () => {
  setLang('uk');
  assert.equal(tn('pReplies', 1), '1 відповідь');
  assert.equal(tn('pReplies', 3), '3 відповіді');
  assert.equal(tn('pReplies', 5), '5 відповідей');
  assert.equal(tn('pTasks', 21), '21 задача');
  setLang('en');
  assert.equal(tn('pReplies', 1), '1 reply');
});
test('every string key used in the code exists in English and Ukrainian, no em dash', () => {
  const dir = new URL('../public/js/', import.meta.url);
  const src = readdirSync(dir).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
  const keys = new Set([...src.matchAll(/\bt(?:n)?\('([A-Za-z_]+)'/g)].map((m) => m[1]));
  for (const k of ['tab_overview', 'tab_work', 'tab_log', 'tab_risks', 'tab_state', 'kTask', 'kThread', 'kRisk', 'mNeeds', 'mOverdue', 'mTurn', 'mCritical', 'mToday', 'fNeeds', 'fOverdue', 'fTurn', 'fCritical', 'fToday', 'rTurnWaits', 'rTurn', 'rCrit', 'rOverdue', 'rToday', 'rHigh', 'pReplies', 'pTasks', 'pRisks']) keys.add(k);
  const missing = [...keys].filter((k) => !(k in I18N.en) || !(k in I18N.uk));
  assert.deepEqual(missing, []);
  const enKeys = Object.keys(I18N.en).filter((k) => !(k in I18N.uk));
  assert.deepEqual(enKeys, [], 'Ukrainian is missing keys');
  const text = JSON.stringify(I18N) + src;
  assert.ok(!text.includes('\u2014'), 'em dash found');
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
