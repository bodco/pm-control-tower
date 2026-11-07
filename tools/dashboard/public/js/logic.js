// Every rule of the dashboard in one place: whose turn, freshness, the
// metrics, the "Needs you" queue, health, risks to watch and the next call.
// Home, the project page, the sidebar and the tests all call these functions,
// so each number has exactly one definition, and a click on a number opens
// the same list the number was counted from.
// Pure functions over plain data: no DOM, no network.

import { today, dayOf, diffDays, ageDays, workdaysSince, nowMs, hasTime, addDays } from './dates.js';

export const CLOSED_TASK = ['Done', "Won't Do"];
export const HOLD = 'On Hold';
export const SPECTATOR = 'Spectator Mode';
export const CLOSED_THREAD = 'Closed';
export const FRESH_DEFAULTS = { quiet_days: 14, stale_days: 30, nudge_days: 5, turn_sla_workdays: 2, stale_bulk_days: 90 };

// ctx = { cfg, ov, hidden: [slugs], swapTurn: bool }
export const projectOf = (ctx, slug) => (ctx.cfg?.projects || []).find((p) => p.slug === slug) || null;
export const visibleSlugs = (ctx) => (ctx.cfg?.projects || []).map((p) => p.slug).filter((s) => !(ctx.hidden || []).includes(s));
export function freshness(ctx, slug) {
  return { ...FRESH_DEFAULTS, ...(ctx.cfg?.freshness || {}), ...(projectOf(ctx, slug)?.freshness || {}) };
}
const inScope = (slugs) => {
  const set = new Set(slugs);
  return (x) => set.has(x.project);
};

// ---------- threads ----------
export function turnOf(ctx, th) {
  const p = projectOf(ctx, th.project);
  const map = p?.turn || ctx.cfg?.turn || { mine: ['Awaiting Reply'], theirs: ['Need Follow-up'], ai: ['AI Review'] };
  let mine = map.mine || [];
  let theirs = map.theirs || [];
  if (ctx.swapTurn) [mine, theirs] = [theirs, mine];
  if (mine.includes(th.status)) return 'mine';
  if (theirs.includes(th.status)) return 'theirs';
  if ((map.ai || []).includes(th.status)) return 'ai';
  return 'none';
}
// Last activity: the last message on either side, or the manual mark
// ("Still relevant", a status set by hand), whichever is later.
export function lastActivity(th) {
  const dates = [th.lastReply || th.reportedAt || th.edited, th.manualAt].filter(Boolean);
  return dates.sort((a, b) => Date.parse(b.length > 10 ? b : b + 'T12:00:00Z') - Date.parse(a.length > 10 ? a : a + 'T12:00:00Z'))[0] || null;
}
export function threadAge(th) { return ageDays(lastActivity(th)) ?? 0; }
export function isStale(ctx, th) {
  if (th.status === CLOSED_THREAD || th.status === SPECTATOR) return false;
  return threadAge(th) >= freshness(ctx, th.project).stale_days;
}
export function isQuiet(ctx, th) {
  const f = freshness(ctx, th.project);
  const a = threadAge(th);
  return a >= f.quiet_days && a < f.stale_days;
}
const liveThreads = (ctx, slugs) => (ctx.ov?.threads || []).filter(inScope(slugs)).filter((th) => th.status !== CLOSED_THREAD && !isStale(ctx, th));
export const yourTurn = (ctx, slugs) => liveThreads(ctx, slugs).filter((th) => turnOf(ctx, th) === 'mine')
  .sort((a, b) => threadAge(b) - threadAge(a));
export const theirTurn = (ctx, slugs) => liveThreads(ctx, slugs).filter((th) => turnOf(ctx, th) === 'theirs');
export const toNudge = (ctx, slugs) => theirTurn(ctx, slugs).filter((th) => threadAge(th) >= freshness(ctx, th.project).nudge_days)
  .sort((a, b) => threadAge(b) - threadAge(a));
export const staleThreads = (ctx, slugs) => (ctx.ov?.threads || []).filter(inScope(slugs)).filter((th) => isStale(ctx, th))
  .sort((a, b) => threadAge(b) - threadAge(a));
export function turnPastSla(ctx, th) {
  return turnOf(ctx, th) === 'mine' && workdaysSince(lastActivity(th)) > freshness(ctx, th.project).turn_sla_workdays;
}

// ---------- tasks ----------
export const isActiveTask = (x) => x.status !== HOLD && !CLOSED_TASK.includes(x.status);
export const activeTasks = (ctx, slugs) => (ctx.ov?.tasks || []).filter(inScope(slugs)).filter(isActiveTask);
export const isOverdue = (x) => Boolean(x.due) && dayOf(x.due) < today();
export const isDueToday = (x) => Boolean(x.due) && dayOf(x.due) === today();
export const overdueTasks = (ctx, slugs) => activeTasks(ctx, slugs).filter(isOverdue).sort((a, b) => dayOf(a.due).localeCompare(dayOf(b.due)));
export const todayTasks = (ctx, slugs) => activeTasks(ctx, slugs).filter(isDueToday);

// ---------- risks ----------
export const riskFields = (ctx) => ctx.cfg?.riskFields || { trigger: false, reviewed: false };
export const activeRisks = (ctx, slugs) => (ctx.ov?.risks || []).filter(inScope(slugs));
export const criticalRisks = (ctx, slugs) => activeRisks(ctx, slugs).filter((r) => r.severity === 'Critical');
export const highRisks = (ctx, slugs) => activeRisks(ctx, slugs).filter((r) => r.severity === 'High');
export function triggerIn(ctx, r) {
  if (!riskFields(ctx).trigger || !r.triggerDate) return null;
  return diffDays(r.triggerDate);
}
export function notReviewedDays(ctx, r) {
  if (!riskFields(ctx).reviewed || !r.lastReviewed) return null;
  const n = ageDays(r.lastReviewed);
  return n >= 14 ? n : null;
}
const SEV = { Critical: 0, High: 1, Medium: 2, Low: 3 };
export function sortRisks(ctx, list) {
  return [...list].sort((a, b) => {
    const ta = triggerIn(ctx, a); const tb = triggerIn(ctx, b);
    if (ta !== tb) return (ta ?? 9999) - (tb ?? 9999);
    return (SEV[a.severity] ?? 9) - (SEV[b.severity] ?? 9);
  });
}
// Risks in the queue: Critical, or a trigger date 7 days away or closer.
export const queueRisks = (ctx, slugs) => activeRisks(ctx, slugs).filter((r) => {
  const n = triggerIn(ctx, r);
  return r.severity === 'Critical' || (n !== null && n <= 7);
});
// Risks to watch on a project: trigger 14 days away or closer; without the
// trigger field, Critical and High.
export function risksToWatch(ctx, slugs) {
  const list = riskFields(ctx).trigger
    ? activeRisks(ctx, slugs).filter((r) => { const n = triggerIn(ctx, r); return n !== null && n <= 14; })
    : activeRisks(ctx, slugs).filter((r) => r.severity === 'Critical' || r.severity === 'High');
  return sortRisks(ctx, list);
}

// ---------- the queue ----------
// Order: overdue and critical first, then your turn by age, then today.
export function queue(ctx, slugs) {
  const out = [];
  const seen = new Set();
  const push = (kind, x, group, key) => { if (!seen.has(x.id)) { seen.add(x.id); out.push({ kind, x, group, key }); } };
  for (const r of queueRisks(ctx, slugs)) {
    const n = triggerIn(ctx, r);
    if (r.severity === 'Critical' || (n !== null && n < 0)) push('risk', r, 0, -1000 + (n ?? 0));
  }
  for (const x of overdueTasks(ctx, slugs)) push('task', x, 0, diffDays(x.due));
  for (const th of yourTurn(ctx, slugs)) push('thread', th, 1, -threadAge(th));
  for (const x of todayTasks(ctx, slugs)) push('task', x, 2, x.priority === 'High' ? 0 : 1);
  for (const r of queueRisks(ctx, slugs)) push('risk', r, 2, 2 + (triggerIn(ctx, r) ?? 0));
  return out.sort((a, b) => a.group - b.group || a.key - b.key);
}

// ---------- metrics: one definition each ----------
// items(ctx, slugs) returns queue entries, so a click on the number shows
// exactly the rows it counted.
const asItems = (kind) => (list) => list.map((x) => ({ kind, x }));
export const METRICS = {
  needs: { label: 'mNeeds', formula: 'fNeeds', items: (ctx, s) => queue(ctx, s) },
  overdue: { label: 'mOverdue', formula: 'fOverdue', items: (ctx, s) => asItems('task')(overdueTasks(ctx, s)) },
  turn: { label: 'mTurn', formula: 'fTurn', items: (ctx, s) => asItems('thread')(yourTurn(ctx, s)) },
  critical: { label: 'mCritical', formula: 'fCritical', items: (ctx, s) => asItems('risk')(criticalRisks(ctx, s)) },
  today: { label: 'mToday', formula: 'fToday', items: (ctx, s) => asItems('task')(todayTasks(ctx, s)) },
};
export const METRIC_KEYS = Object.keys(METRICS);
export function metricCounts(ctx, slugs) {
  return Object.fromEntries(METRIC_KEYS.map((k) => [k, METRICS[k].items(ctx, slugs).length]));
}

// ---------- health: a rule, not a score ----------
export function health(ctx, slug) {
  const s = [slug];
  const crit = criticalRisks(ctx, s);
  const overdue = overdueTasks(ctx, s);
  const overdueHigh = overdue.filter((x) => x.priority === 'High');
  const mine = yourTurn(ctx, s);
  const mineOld = mine.filter((th) => turnPastSla(ctx, th));
  const due = todayTasks(ctx, s);
  const high = highRisks(ctx, s);
  const red = [['crit', crit], ['overdueHigh', overdueHigh], ['turnOld', mineOld]].filter(([, a]) => a.length);
  const amber = [['overdue', overdue], ['today', due], ['high', high], ['turn', mine]].filter(([, a]) => a.length);
  const level = red.length ? 'red' : amber.length ? 'amber' : 'green';
  // Reasons for the one-sentence project line, most serious first, at most 2.
  const reasons = [];
  if (mineOld.length) reasons.push({ key: 'rTurnWaits', n: threadAge(mineOld[0]) });
  else if (mine.length) reasons.push({ key: 'rTurn', n: mine.length });
  if (crit.length) reasons.push({ key: 'rCrit', n: crit.length });
  if (overdue.length) reasons.push({ key: 'rOverdue', n: overdue.length });
  if (due.length) reasons.push({ key: 'rToday', n: due.length });
  if (high.length && !crit.length) reasons.push({ key: 'rHigh', n: high.length });
  return { level, reasons: reasons.slice(0, 2) };
}
export const HEALTH_RANK = { red: 0, amber: 1, green: 2 };

// ---------- next call ----------
// The next meeting today or tomorrow that has not started yet, with 2-3
// things to raise: your-turn threads and risks of its project.
export function nextCall(ctx, slugs) {
  const td = today();
  const tm = addDays(td, 1);
  const now = nowMs();
  const list = (ctx.ov?.meetings || []).filter(inScope(slugs)).filter((m) => {
    if (!m.date) return false;
    const d = dayOf(m.date);
    if (d !== td && d !== tm) return false;
    return hasTime(m.date) ? Date.parse(m.date) >= now - 5 * 60000 : d === tm || d === td;
  }).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const m = list[0];
  if (!m) return null;
  const s = [m.project];
  const raise = [
    ...yourTurn(ctx, s).slice(0, 2).map((x) => ({ kind: 'thread', x })),
    ...sortRisks(ctx, [...criticalRisks(ctx, s), ...highRisks(ctx, s)]).slice(0, 2).map((x) => ({ kind: 'risk', x })),
  ].slice(0, 3);
  return { meeting: m, raise };
}

// ---------- the page sentence ----------
// "2 replies and 3 tasks need you": parts with counts, joined by the view.
export function needsParts(ctx, slugs) {
  const q = queue(ctx, slugs);
  const n = (k) => q.filter((i) => i.kind === k).length;
  return [['pReplies', n('thread')], ['pTasks', n('task')], ['pRisks', n('risk')]].filter(([, c]) => c > 0);
}

// ---------- automation ----------
export const isBadResult = (r) => r === 'Failed' || r === 'Abandoned';
export function failedAutomation(auto, slugs) {
  if (!auto?.configured) return [];
  const set = new Set(slugs);
  return (auto.items || []).filter((x) => x.kind === 'task' && isBadResult(x.lastResult) && (!x.project || set.has(x.project)));
}
