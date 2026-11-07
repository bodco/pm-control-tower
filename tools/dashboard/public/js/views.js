// Pages: Today, the queue, Projects, Project (Overview, Work, Log, Risks,
// Current state), Inbox, Automation, Settings, More.

import { h, icon, state, ctx, settings, saveSettings, isPhone, applyLang } from './core.js';
import { t, tn } from './i18n.js';
import { fmtAge, fmtWhen, fmtSoon, cleanTitle, today, dayOf, timeOf } from './dates.js';
import * as L from './logic.js';
import { loadSection, api } from './net.js';
import {
  pageHead, sechead, block, list, row, quiet, alertRow, banner, metricStrip, healthWord, dot, optDot,
  empty, btn, seg, textFilters, skeleton,
} from './ui.js';
import { describe, staleReview, closeOldStale, quickAdd, shortName, palette } from './actions.js';

const rowsOf = (items, opts) => items.map((it) => row(describe(it, opts)));
const projectHref = (slug, tab) => `#/p/${encodeURIComponent(slug)}${tab ? '/' + tab : ''}`;
const QUEUE_MAX = () => (isPhone() ? 5 : 7);

// "2 replies and 3 tasks need you"
function needsSentence(c, slugs) {
  const parts = L.needsParts(c, slugs).map(([k, n]) => tn(k, n));
  if (!parts.length) return t('nothingNeedsYou');
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} ${t('and')} ${parts[parts.length - 1]}`;
  return t('needYou', { what: joined, n: L.queue(c, slugs).length });
}
function dateEyebrow() {
  const s = new Intl.DateTimeFormat(document.documentElement.lang === 'uk' ? 'uk-UA' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: state.cfg?.timezone || 'UTC' }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function freshnessNote() {
  if (state.offline) return null;
  if (!state.savedAt || Date.now() - Date.parse(state.savedAt) < 15 * 60000) return null;
  return t('updatedAt', { t: timeOf(state.savedAt) });
}
export function statusBanners() {
  const out = [];
  if (state.offline) out.push(banner(t('offlineBanner')));
  if (state.loadError) out.push(banner(`${t('notionError')}: ${state.loadError}`, btn(t('retry'), { glyph: 'refresh', onclick: () => window.dispatchEvent(new Event('ct:refresh')) })));
  for (const e of state.ov?.errors || []) out.push(banner(`${t('notionError')} (${e.source}): ${e.error}`, btn(t('retry'), { glyph: 'refresh', onclick: () => window.dispatchEvent(new Event('ct:refresh')) })));
  return out;
}

// ---------- shared blocks ----------
function metricItems(c, slugs, { phone }) {
  const counts = L.metricCounts(c, slugs);
  return L.METRIC_KEYS
    // Phone: four numbers (as on the v2 board); due-today tasks are in the queue anyway.
    .filter((k) => !(phone && k === 'today'))
    .map((k) => ({ key: k, n: counts[k], label: t(L.METRICS[k].label), formula: t(L.METRICS[k].formula) }));
}
function failureRow(slugs) {
  const bad = L.failedAutomation(state.auto, slugs);
  if (!bad.length) return null;
  const a = bad[0];
  const run = (state.auto.runs || []).find((r) => r.automationId === a.id && L.isBadResult(r.result));
  const text = [h('b', a.name), ' ', t('failedAt', { t: a.lastRun ? fmtWhen(a.lastRun) : '' }), run?.summary ? ` ${run.summary}` : '', bad.length > 1 ? ` ${tn('pMoreFailed', bad.length - 1)}` : ''];
  return alertRow({ text, action: btn(t('look'), { href: '#/auto' }) });
}
function nextCallCard(c, slugs) {
  const nc = L.nextCall(c, slugs);
  if (!nc) return null;
  const m = nc.meeting;
  const p = L.projectOf(c, m.project);
  const soon = fmtSoon(m.date);
  const phone = isPhone();
  return h(phone && m.url ? 'a.card' : 'div.card', phone && m.url ? { href: m.url, target: '_blank', rel: 'noopener' } : null,
    h('p.cm', h('span.when', fmtWhen(m.date)), soon ? [h('span.sep'), h('span', soon)] : null, p ? [h('span.sep'), dot(p.color), h('span', shortName(p))] : null),
    h('p.ct', cleanTitle(m.title)),
    nc.raise.length ? h('ul.raise', nc.raise.slice(0, isPhone() ? 2 : 3).map(({ kind, x }) => h('li', kind === 'thread'
      ? t('raiseThread', { title: cleanTitle(x.title), d: fmtAge(L.lastActivity(x)) })
      : t('raiseRisk', { title: cleanTitle(x.title), sev: x.severity || '' })))) : null,
    m.url && !phone ? h('div.cardfoot', btn(t('openMeeting'), { glyph: 'open', href: m.url })) : null);
}
function projectRows(c, slugs) {
  const rows = slugs.map((s) => ({ p: L.projectOf(c, s), hl: L.health(c, s) }))
    .sort((a, b) => L.HEALTH_RANK[a.hl.level] - L.HEALTH_RANK[b.hl.level] || a.p.name.localeCompare(b.p.name));
  const loud = rows.filter((r) => r.hl.level !== 'green');
  const quietOnes = rows.filter((r) => r.hl.level === 'green');
  return [
    ...loud.map(({ p, hl }) => projectRow(p, hl)),
    quietOnes.length ? (state.showQuietProjects
      ? quietOnes.map(({ p, hl }) => projectRow(p, hl))
      : quiet({ glyph: 'projects', text: [h('b', String(quietOnes.length)), ' ', tn('pQuietProjects', quietOnes.length)], onclick: () => { state.showQuietProjects = true; window.dispatchEvent(new Event('ct:render')); } })) : null,
  ];
}
function reasonText(hl) {
  if (!hl.reasons.length) return t('rNone');
  const s = hl.reasons.map((r) => tn(r.key, r.n)).join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function projectRow(p, hl) {
  return h('a.prow', { href: projectHref(p.slug), role: 'listitem' },
    dot(p.color), h('div.rb', h('div.rt', p.name), h('div.rm', h('span', reasonText(hl)))), healthWord(hl.level));
}
function queueBlock(c, slugs, { limit, title = t('needsYou'), filter = 'needs', link = true, projectScope = false } = {}) {
  const items = L.METRICS[filter].items(c, slugs);
  const shown = limit ? items.slice(0, limit) : items;
  const nudge = L.toNudge(c, slugs);
  const stale = L.staleThreads(c, slugs);
  const extra = [];
  if (limit && items.length > shown.length) extra.push(quiet({ glyph: 'more', text: tn('pMore', items.length - shown.length), href: projectScope ? projectHref(slugs[0], 'work') : `#/queue/${filter}` }));
  if (filter === 'needs' && nudge.length) {
    const first = nudge[0];
    extra.push(quiet({ glyph: 'clock', text: [h('b', String(nudge.length)), ' ', tn('pNudge', nudge.length), nudge.length === 1 && !isPhone() ? `: ${cleanTitle(first.title)}, ${fmtAge(L.lastActivity(first))}` : ''], href: projectScope ? projectHref(slugs[0], 'work') + '?f=theirs' : '#/queue/nudge' }));
  }
  if (filter === 'needs' && stale.length) {
    extra.push(quiet({ glyph: 'archive', text: [h('b', String(stale.length)), ' ', tn('pStale', stale.length)], right: h('span.qa', t('review')), onclick: () => staleReview(slugs) }));
  }
  const rows = rowsOf(shown, { showProject: !projectScope });
  if (!rows.length && !extra.length) return null;
  return block(
    sechead(title, items.length || null, link && items.length > shown.length && !isPhone() ? h('a.tlink', { href: `#/queue/${filter}` }, t('fullQueue')) : null),
    list([rows, extra], { label: title }),
    keysHint());
}
function keysHint() {
  if (isPhone() || settings.keysHintSeen) return null;
  return h('p.hint.keyshint', t('keysHint'), ' ', h('button.tlink', { type: 'button', onclick: (e) => { settings.keysHintSeen = true; saveSettings(); e.target.closest('.keyshint').remove(); } }, t('gotIt')));
}

// ---------- Today ----------
export function viewToday() {
  const c = ctx();
  const slugs = L.visibleSlugs(c);
  const phone = isPhone();
  const filter = state.filter && L.METRICS[state.filter] ? state.filter : 'needs';
  const items = L.METRICS[filter].items(c, slugs);
  const head = pageHead({
    eyebrow: [dateEyebrow(), freshnessNote() ? ` · ${freshnessNote()}` : ''].join(''),
    title: needsSentence(c, slugs),
    right: phone ? null : btn(t('add'), { primary: true, glyph: 'plus', kbd: 'N', onclick: () => quickAdd() }),
  });
  const strip = metricStrip(metricItems(c, slugs, { phone }), filter, (k) => { state.filter = k === state.filter || k === 'needs' ? null : k; window.dispatchEvent(new Event('ct:render')); });
  let queueNode;
  if (!items.length && filter === 'needs') {
    const nc = L.nextCall(c, slugs);
    const inboxN = (state.inbox || []).length;
    queueNode = block(h('div.empty',
      h('p', t('emptyQueue')),
      nc ? h('p.sub', t('emptyNext', { what: cleanTitle(nc.meeting.title), when: fmtWhen(nc.meeting.date) })) : null,
      inboxN ? h('p', btn(tn('sortInbox', inboxN), { href: '#/inbox' })) : null));
  } else {
    queueNode = queueBlock(c, slugs, { limit: QUEUE_MAX(), filter, title: filter === 'needs' ? t('needsYou') : t(L.METRICS[filter].label) });
  }
  const call = nextCallCard(c, slugs);
  const proj = list(projectRows(c, slugs), { label: t('projects') });
  const callBlock = call ? block(sechead(t('nextCall')), call) : null;
  const projBlock = proj ? block(sechead(t('projects'), null, phone ? null : h('a.tlink', { href: '#/projects' }, t('all'))), proj) : null;
  if (phone) {
    return [head, strip, statusBanners(), h('div.stack.top', callBlock, failureRow(slugs), queueNode, projBlock)];
  }
  return [head, strip, statusBanners(), h('div.cols',
    h('div.stack', failureRow(slugs), queueNode),
    h('div.stack', callBlock, projBlock))];
}

// The full list behind a number (and the "to nudge" list).
export function viewQueue(kind) {
  const c = ctx();
  const slugs = L.visibleSlugs(c);
  const back = h('a.back', { href: '#/' }, icon('back'), t('navToday'));
  if (kind === 'nudge') {
    const items = L.toNudge(c, slugs).map((x) => ({ kind: 'thread', x }));
    return [back, pageHead({ title: tn('pNudge', items.length), lede: t('nudgeLede') }), statusBanners(),
      h('div.stack.top', items.length ? block(list(rowsOf(items))) : h('div.empty', h('p', t('emptyList'))))];
  }
  const k = L.METRICS[kind] ? kind : 'needs';
  const items = L.METRICS[k].items(c, slugs);
  return [back, pageHead({ title: t(L.METRICS[k].label), lede: t(L.METRICS[k].formula) }), statusBanners(),
    h('div.stack.top', items.length ? block(list(rowsOf(items))) : h('div.empty', h('p', t('emptyList'))), keysHint())];
}

// ---------- Projects ----------
export function viewProjects() {
  const c = ctx();
  const slugs = L.visibleSlugs(c);
  const rows = slugs.map((s) => ({ p: L.projectOf(c, s), hl: L.health(c, s) }))
    .sort((a, b) => L.HEALTH_RANK[a.hl.level] - L.HEALTH_RANK[b.hl.level] || a.p.name.localeCompare(b.p.name));
  const hidden = (c.cfg.projects || []).filter((p) => settings.hidden.includes(p.slug));
  return [pageHead({ title: t('projects'), lede: tn('pProjects', slugs.length) }), statusBanners(),
    h('div.stack.top',
      rows.length ? block(list(rows.map(({ p, hl }) => projectRow(p, hl)))) : h('div.empty', h('p', t('noProjects'))),
      hidden.length ? block(sechead(t('hiddenProjects')), list(hidden.map((p) => h('a.prow', { href: projectHref(p.slug), role: 'listitem' }, dot(p.color), h('div.rb', h('div.rt', p.name)), h('span'))))) : null)];
}

// ---------- Project ----------
const TABS = ['overview', 'work', 'log', 'risks'];
async function currentStateDoc(slug) {
  if (state.stateDocs.has(slug)) return state.stateDocs.get(slug);
  const doc = await loadSection(slug, 'state').catch(() => null);
  state.stateDocs.set(slug, doc);
  return doc;
}
function firstSentence(blocks) {
  for (const b of blocks || []) {
    if (['paragraph', 'callout', 'quote', 'bulleted_list_item'].includes(b.type)) {
      const s = (b.rich || []).map((r) => r.text).join('').trim();
      if (s.length > 20) {
        const m = s.match(/^(.{20,220}?[.!?])(\s|$)/);
        return m ? m[1] : s.slice(0, 220);
      }
    }
    if (b.children) { const x = firstSentence(b.children); if (x) return x; }
  }
  return null;
}

export async function viewProject(slug, tab, query) {
  const c = ctx();
  const p = L.projectOf(c, slug);
  if (!p) return [banner(t('unknownProject', { s: slug }))];
  tab = TABS.includes(tab) || tab === 'state' ? tab : 'overview';
  const s = [slug];
  const hl = L.health(c, slug);
  const phone = isPhone();
  const doc = p.hasCurrentState ? await currentStateDoc(slug) : null;
  const lede = firstSentence(doc?.blocks) || reasonText(hl);
  const workN = L.activeTasks(c, s).length + (c.ov.threads || []).filter((x) => x.project === slug && !L.isStale(c, x) && x.status !== L.SPECTATOR).length;
  const riskN = L.activeRisks(c, s).length;
  const back = phone ? h('a.back', { href: tab === 'overview' ? '#/projects' : projectHref(slug) }, icon('back'), tab === 'overview' ? t('projects') : p.name) : null;
  const menuBtn = h('button.ibtn.lg', { type: 'button', 'aria-label': t('projectMenu'), onclick: () => projectMenu(p) }, icon('more'));
  const head = pageHead({
    eyebrow: h('span.eb', dot(p.color), healthWord(hl.level)),
    title: tab === 'overview' || !phone ? p.name : t(`tab_${tab}`),
    lede: tab === 'overview' || !phone ? lede : null,
    right: [phone ? null : btn(t('add'), { primary: true, glyph: 'plus', kbd: 'N', onclick: () => quickAdd({ slug, kind: 'task' }) }), menuBtn],
  });
  const tabs = phone ? null : h('nav.tabs', { 'aria-label': t('projectSections') }, TABS.map((x) => h('a', { href: projectHref(slug, x === 'overview' ? '' : x), 'aria-current': x === tab ? 'page' : null },
    t(`tab_${x}`), x === 'work' && workN ? h('span.c', String(workN)) : x === 'risks' && riskN ? h('span.c', String(riskN)) : null)));
  let body;
  if (tab === 'overview') body = projectOverview(c, p, doc, { phone, workN, riskN });
  else if (tab === 'work') body = await projectWork(c, p, query);
  else if (tab === 'log') body = await projectLog(c, p, query);
  else if (tab === 'risks') body = await projectRisks(c, p);
  else body = projectState(p, doc);
  return [back, head, tabs, statusBanners(), body];
}
function projectMenu(p) {
  import('./ui.js').then(({ openSheet, closeSheet }) => {
    const go = (href) => () => { closeSheet(); location.hash = href; };
    openSheet(p.name, h('div.links',
      p.hasCurrentState ? h('button.linkrow', { type: 'button', onclick: go(projectHref(p.slug, 'state')) }, icon('doc'), t('currentState')) : null,
      state.cfg.automation ? h('button.linkrow', { type: 'button', onclick: go(`#/auto/${p.slug}`) }, icon('bolt'), t('projectAutomation')) : null,
      h('a.linkrow', { href: `/api/p/${encodeURIComponent(p.slug)}/notion`, target: '_blank', rel: 'noopener' }, icon('open'), t('openNotion'))));
  });
}
function latestRows(c, p) {
  const dec = (c.ov.decisions || []).filter((x) => x.project === p.slug)[0];
  const rep = (c.ov.reports || []).filter((x) => x.project === p.slug)[0];
  const doc = state.stateDocs.get(p.slug);
  const autoItems = (state.auto?.items || []).filter((x) => x.kind === 'task' && x.project === p.slug);
  const autoBad = autoItems.filter((x) => L.isBadResult(x.lastResult)).length;
  return [
    dec ? row(describe({ kind: 'decision', x: dec }, { showProject: false })) : null,
    rep ? row(describe({ kind: 'report', x: rep }, { showProject: false })) : null,
    doc && !doc.missing ? quiet({ glyph: 'doc', text: t('stateUpdated', { d: fmtAge(doc.edited) }), href: projectHref(p.slug, 'state') }) : null,
    autoItems.length ? quiet({ glyph: 'bolt', text: [tn('pScheduled', autoItems.length), autoBad ? [', ', h('span.late', tn('pFailed', autoBad))] : ''], href: `#/auto/${p.slug}` }) : null,
  ];
}
function projectOverview(c, p, doc, { phone, workN, riskN }) {
  const s = [p.slug];
  const move = queueBlock(c, s, { limit: 5, title: t('yourMove'), link: false, projectScope: true });
  // Risks already in "Your move" are not repeated below it.
  const inQueue = new Set(L.queue(c, s).slice(0, 5).map((i) => i.x.id));
  const watch = L.risksToWatch(c, s).filter((r) => !inQueue.has(r.id)).slice(0, 3);
  const riskBlock = watch.length ? block(sechead(t('risksToWatch'), watch.length, phone ? null : h('a.tlink', { href: projectHref(p.slug, 'risks') }, t('allRisks'))),
    list(rowsOf(watch.map((x) => ({ kind: 'risk', x })), { showProject: false }))) : null;
  const call = nextCallCard(c, s);
  const latest = list(latestRows(c, p));
  const isEmpty = !(c.ov.tasks || []).some((x) => x.project === p.slug) && !(c.ov.threads || []).some((x) => x.project === p.slug) && !(c.ov.meetings || []).some((x) => x.project === p.slug);
  if (isEmpty) return h('div.stack.top', h('div.empty', h('p', t('noDataYet')), h('p.sub', t('firstCollection'))));
  if (phone) {
    const everything = list([
      quiet({ glyph: 'check', text: t('tab_work'), right: workN ? h('span.num', String(workN)) : null, href: projectHref(p.slug, 'work') }),
      quiet({ glyph: 'doc', text: t('logLong'), href: projectHref(p.slug, 'log') }),
      quiet({ glyph: 'risk', text: t('tab_risks'), right: riskN ? h('span.num', String(riskN)) : null, href: projectHref(p.slug, 'risks') }),
      p.hasCurrentState ? quiet({ glyph: 'doc', text: t('currentState'), right: doc?.edited ? fmtAge(doc.edited) : null, href: projectHref(p.slug, 'state') }) : null,
      state.cfg.automation ? quiet({ glyph: 'bolt', text: t('navAutomation'), href: `#/auto/${p.slug}` }) : null,
      quiet({ glyph: 'open', text: t('openNotion'), href: `/api/p/${encodeURIComponent(p.slug)}/notion` }),
    ]);
    return h('div.stack.top', call ? block(call) : null, move, riskBlock, block(sechead(t('everything')), everything));
  }
  return h('div.cols',
    h('div.stack', move || h('div.empty', h('p', t('nothingHere'))), riskBlock),
    h('div.stack', call ? block(sechead(t('nextCall')), call) : null, latest ? block(sechead(t('latest')), latest) : null));
}

// Work: tasks or threads grouped by their Notion status.
async function projectWork(c, p, query) {
  const params = new URLSearchParams(query || '');
  const sub = state.workSeg?.[p.slug] || (params.get('f') === 'theirs' || params.get('f') === 'mine' ? 'threads' : 'tasks');
  const filter = state.workFilter?.[p.slug] || params.get('f') || 'open';
  const text = (state.workText?.[p.slug] || '').toLowerCase();
  const [tasks, threads] = await Promise.all([loadSection(p.slug, 'tasks'), loadSection(p.slug, 'threads', { all: true })]);
  // Section data may be older than the overview after a local change: patch from the overview.
  const byId = new Map([...(c.ov.tasks || []), ...(c.ov.threads || [])].map((x) => [x.id, x]));
  const fix = (arr) => (arr || []).map((x) => byId.get(x.id) || x);
  const openTasks = fix(tasks.open);
  const openThreads = fix(threads.open);
  const setState = (k, v) => { state[k] = { ...(state[k] || {}), [p.slug]: v }; window.dispatchEvent(new Event('ct:render')); };
  const tf = (x) => !text || cleanTitle(x.title).toLowerCase().includes(text);
  let groups = [];
  let staleList = [];
  if (sub === 'tasks') {
    let items;
    if (filter === 'closed') items = fix(tasks.done);
    else if (filter === 'overdue') items = openTasks.filter((x) => L.isActiveTask(x) && L.isOverdue(x));
    else items = openTasks;
    items = items.filter(tf);
    const order = state.cfg.options.taskStatuses;
    groups = order.map((st) => ({ st, color: state.cfg.colors.taskStatus?.[st], items: items.filter((x) => x.status === st) }))
      .concat([{ st: t('other'), items: items.filter((x) => !order.includes(x.status)) }]);
    groups.forEach((g) => g.items.sort((a, b) => (dayOf(a.due) || '9999').localeCompare(dayOf(b.due) || '9999')));
    groups = groups.map((g) => ({ ...g, rows: rowsOf(g.items.map((x) => ({ kind: 'task', x })), { showProject: false, grouped: true }) }));
  } else {
    let items;
    if (filter === 'closed') items = fix(threads.closed);
    else {
      const live = openThreads.filter((x) => !L.isStale(c, x));
      staleList = openThreads.filter((x) => L.isStale(c, x));
      items = filter === 'mine' ? live.filter((x) => L.turnOf(c, x) === 'mine')
        : filter === 'theirs' ? live.filter((x) => L.turnOf(c, x) === 'theirs') : live;
    }
    items = items.filter(tf);
    const order = state.cfg.options.threadStatuses;
    groups = order.map((st) => ({ st, color: state.cfg.colors.threadStatus?.[st], hint: groupHint(c, st, p.slug), items: items.filter((x) => x.status === st) }))
      .concat([{ st: t('other'), items: items.filter((x) => !order.includes(x.status)) }]);
    groups.forEach((g) => g.items.sort((a, b) => L.threadAge(b) - L.threadAge(a)));
    groups = groups.map((g) => ({ ...g, rows: rowsOf(g.items.map((x) => ({ kind: 'thread', x })), { showProject: false, grouped: true }) }));
  }
  groups = groups.filter((g) => g.rows.length);
  const filterInput = h('label.search', icon('search'), h('input', {
    type: 'search', id: 'workfilter', value: state.workText?.[p.slug] || '', placeholder: t('filter'), 'aria-label': t('filter'),
    oninput: (e) => { state.workText = { ...(state.workText || {}), [p.slug]: e.target.value }; clearTimeout(state._ft); state._ft = setTimeout(() => window.dispatchEvent(new Event('ct:render')), 200); },
  }), isPhone() ? null : h('span.kbd', '/'));
  const tFilters = sub === 'tasks'
    ? [{ value: 'open', label: t('fOpen') }, { value: 'overdue', label: t('mOverdue') }, { value: 'closed', label: t('fDoneWeek') }]
    : [{ value: 'open', label: t('fOpen') }, { value: 'mine', label: t('yourTurn') }, { value: 'theirs', label: t('theirTurn') }, { value: 'closed', label: t('fClosedWeek') }];
  const liveThreadsN = openThreads.filter((x) => !L.isStale(c, x) && x.status !== L.SPECTATOR).length;
  const bulkDays = L.freshness(c, p.slug).stale_bulk_days;
  const oldN = staleList.filter((x) => L.threadAge(x) >= bulkDays).length;
  return h('div.stack.top',
    h('div.toolbar',
      seg([{ value: 'tasks', label: t('tasks'), n: openTasks.filter(L.isActiveTask).length }, { value: 'threads', label: t('threads'), n: liveThreadsN }], sub, (v) => { setState('workSeg', v); state.workFilter = { ...(state.workFilter || {}), [p.slug]: 'open' }; }, { label: t('tab_work') }),
      textFilters(tFilters, filter, (v) => setState('workFilter', v)),
      h('span.spacer'), filterInput),
    groups.length ? h('div.list', { role: 'list' }, groups.map((g) => [
      h('div.grouph', { role: 'presentation' }, optDot(g.color), h('b', g.st), g.hint ? h('span', g.hint) : null, h('span.num', String(g.rows.length))),
      g.rows])) : h('div.empty', h('p', text ? t('emptyFilter') : t('emptyList'))),
    staleList.length && filter !== 'closed' ? h('div.alert.calm', h('span.g', icon('archive')),
      h('span.at', tn('pStaleLong', staleList.length)), h('span.spacer'),
      btn(t('reviewOne'), { onclick: () => staleReview([p.slug]) }),
      oldN ? btn(t('closeOlder', { n: bulkDays }), { onclick: () => closeOldStale([p.slug]) }) : null) : null,
    keysHint());
}
function groupHint(c, status, slug) {
  const tn0 = L.turnOf(c, { status, project: slug });
  if (tn0 === 'mine') return t('yourTurn').toLowerCase();
  if (tn0 === 'theirs') return t('theirTurn').toLowerCase();
  if (status === 'Replied') return t('hintReplied');
  return null;
}

// Log: meetings, decisions and reports in one stream.
async function projectLog(c, p) {
  const kind = state.logKind?.[p.slug] || 'all';
  const [m, d, r] = await Promise.all([loadSection(p.slug, 'meetings'), loadSection(p.slug, 'decisions'), loadSection(p.slug, 'reports')]);
  const items = [
    ...(kind === 'all' || kind === 'meeting' ? m.items.map((x) => ({ kind: 'meeting', x })) : []),
    ...(kind === 'all' || kind === 'decision' ? d.items.map((x) => ({ kind: 'decision', x })) : []),
    ...(kind === 'all' || kind === 'report' ? r.items.map((x) => ({ kind: 'report', x })) : []),
  ].sort((a, b) => String(b.x.date || '').localeCompare(String(a.x.date || '')));
  const upcoming = items.filter((i) => i.x.date && dayOf(i.x.date) > today());
  const past = items.filter((i) => !upcoming.includes(i));
  return h('div.stack.top',
    h('div.toolbar', textFilters([{ value: 'all', label: t('all') }, { value: 'meeting', label: t('meetings') }, { value: 'decision', label: t('decisions') }, { value: 'report', label: t('reports') }], kind,
      (v) => { state.logKind = { ...(state.logKind || {}), [p.slug]: v }; window.dispatchEvent(new Event('ct:render')); })),
    upcoming.length ? block(sechead(t('upcoming')), list(rowsOf(upcoming.reverse(), { showProject: false }))) : null,
    past.length ? block(upcoming.length ? sechead(t('earlier')) : null, list(rowsOf(past, { showProject: false }))) : h('div.empty', h('p', t('emptyList'))));
}

async function projectRisks(c, p) {
  const data = await loadSection(p.slug, 'risks');
  const byId = new Map((c.ov.risks || []).map((x) => [x.id, x]));
  const items = L.sortRisks(c, data.items.map((x) => byId.get(x.id) || x));
  return h('div.stack.top',
    !L.riskFields(c).trigger ? h('p.hint', t('riskFieldsMissing')) : null,
    items.length ? block(list(rowsOf(items.map((x) => ({ kind: 'risk', x })), { showProject: false }))) : h('div.empty', h('p', t('noRisks'))));
}

function projectState(p, doc) {
  if (!doc || doc.missing) return h('div.empty', h('p', t('noState')));
  return h('div.stack.top', h('p.eyebrow', t('stateUpdated', { d: fmtAge(doc.edited) }), ' · ', h('a.tlink', { href: doc.url, target: '_blank', rel: 'noopener' }, t('openNotion'))),
    h('article.doc', renderBlocks(doc.blocks)));
}
function renderRich(rich) {
  return (rich || []).map((r) => {
    let el = r.href ? h('a', { href: r.href, target: '_blank', rel: 'noopener' }, r.text) : document.createTextNode(r.text || '');
    if (r.c) el = h('code', el);
    if (r.b) el = h('strong', el);
    if (r.i) el = h('em', el);
    if (r.s) el = h('s', el);
    return el;
  });
}
function renderBlocks(blocks) {
  const out = [];
  let lst = null; let lt = null;
  for (const b of blocks || []) {
    if (['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(b.type)) {
      const tag = b.type === 'numbered_list_item' ? 'ol' : 'ul';
      if (!lst || lt !== tag) { lst = h(tag); lt = tag; out.push(lst); }
      const li = b.type === 'to_do' ? h('li.todo', h('input', { type: 'checkbox', disabled: true, checked: b.checked || null, 'aria-label': (b.rich || []).map((r) => r.text).join('') }), ' ', renderRich(b.rich)) : h('li', renderRich(b.rich));
      if (b.children) li.append(...renderBlocks(b.children));
      lst.append(li);
      continue;
    }
    lst = null; lt = null;
    const kids = b.children ? renderBlocks(b.children) : [];
    switch (b.type) {
      case 'heading_1': out.push(h('h2', renderRich(b.rich)), ...kids); break;
      case 'heading_2': out.push(h('h3', renderRich(b.rich)), ...kids); break;
      case 'heading_3': out.push(h('h4', renderRich(b.rich)), ...kids); break;
      case 'paragraph': out.push(h('p', renderRich(b.rich)), ...kids); break;
      case 'quote': out.push(h('blockquote', renderRich(b.rich), kids)); break;
      case 'callout': out.push(h('div.callout', b.icon ? h('span', b.icon) : null, h('div', renderRich(b.rich), kids))); break;
      case 'toggle': out.push(h('details', h('summary', renderRich(b.rich)), kids)); break;
      case 'code': out.push(h('pre', h('code', (b.rich || []).map((r) => r.text).join('')))); break;
      case 'divider': out.push(h('hr')); break;
      case 'group': out.push(...kids); break;
      case 'child_page': case 'child_database': out.push(h('p.unsupported', `▸ ${b.title}`)); break;
      default: out.push(h('p.unsupported', `[${b.label || b.type}]`));
    }
  }
  return out;
}

// ---------- Inbox ----------
export function viewInbox() {
  const items = (state.inbox || []).filter((x) => !x.project || !settings.hidden.includes(x.project));
  const head = pageHead({
    title: items.length ? tn('pInbox', items.length) : t('inboxEmpty'),
    lede: t('inboxLede'),
    right: isPhone() ? null : btn(t('add'), { primary: true, glyph: 'plus', kbd: 'N', onclick: () => quickAdd({ kind: 'note' }) }),
  });
  if (!state.cfg.inbox) return [head, h('div.empty', h('p', t('inboxOff')))];
  return [head, statusBanners(), h('div.stack.top', items.length ? block(list(rowsOf(items.map((x) => ({ kind: 'inbox', x }))))) : null)];
}

// ---------- Automation (read-only) ----------
export async function viewAutomation(slug) {
  const c = ctx();
  if (!state.cfg.automation) return [pageHead({ title: t('navAutomation') }), h('div.empty', h('p', t('autoOff')))];
  const a = state.auto || await api('/api/automation');
  state.auto = a;
  if (!a.configured) return [pageHead({ title: t('navAutomation') }), h('div.empty', h('p', t('autoOff')))];
  const slugs = slug ? [slug] : L.visibleSlugs(c);
  const scope = (x) => (slug ? x.project === slug || !x.project : !x.project || slugs.includes(x.project));
  const tasks = a.items.filter((x) => x.kind === 'task' && scope(x) && x.state !== 'Retired');
  const skills = a.items.filter((x) => x.kind === 'skill' && scope(x) && x.state !== 'Retired');
  const runsToday = (a.runs || []).filter((r) => r.started && dayOf(r.started) === today() && scope(r));
  const bad = L.failedAutomation(a, slugs).filter(scope);
  const p = slug ? L.projectOf(c, slug) : null;
  const title = bad.length ? t('autoTitleBad', { runs: tn('pRuns', runsToday.length), n: bad.length }) : t('autoTitle', { runs: tn('pRuns', runsToday.length) });
  const back = slug ? h('a.back', { href: projectHref(slug) }, icon('back'), p?.name || slug) : null;
  const lastRun = (x) => x.lastRun ? h('span.lr', h('span.dot', { style: { background: L.isBadResult(x.lastResult) ? 'var(--danger)' : 'var(--ok)' }, 'aria-hidden': 'true' }),
    L.isBadResult(x.lastResult) ? h('span.late', `${t('failed')} ${fmtWhen(x.lastRun)}`) : fmtWhen(x.lastRun)) : t('neverRan');
  const groupsFor = [{ label: t('generalAll'), items: tasks.filter((x) => !x.project) },
    ...slugs.map((s) => ({ label: L.projectOf(c, s)?.name, color: L.projectOf(c, s)?.color, items: tasks.filter((x) => x.project === s) }))].filter((g) => g.items.length);
  const table = groupsFor.length ? (isPhone()
    ? h('div.list', { role: 'list' }, groupsFor.map((g) => [h('div.grouph', g.color ? dot(g.color) : null, h('b', g.label)),
      g.items.map((x) => h('div.row.static', { role: 'listitem' }, h('span.g', icon('clock')), h('div.rb', h('div.rt', x.name), h('div.rm', h('span', x.schedule || ''), x.nextRun && Date.parse(x.nextRun) > Date.now() ? [h('span.sep'), h('span', t('nextAt', { t: fmtWhen(x.nextRun) }))] : null)), h('div.re', h('span.rr', lastRun(x)))))]))
    : h('div.list.tablewrap', h('table.t', h('thead', h('tr', h('th', { scope: 'col' }, t('colTask')), h('th', { scope: 'col' }, t('colRuns')), h('th', { scope: 'col' }, t('colNext')), h('th', { scope: 'col' }, t('colLast')))),
      h('tbody', groupsFor.map((g) => [h('tr.grp', h('td', { colspan: 4 }, g.color ? dot(g.color) : null, ' ', g.label)),
        g.items.map((x) => h('tr', h('td', x.url && x.url !== '#' ? h('a', { href: x.url, target: '_blank', rel: 'noopener' }, x.name) : x.name),
          h('td', x.state === 'Paused' ? t('paused') : (x.schedule || '')),
          h('td', x.nextRun && Date.parse(x.nextRun) > Date.now() ? fmtWhen(x.nextRun) : ''),
          h('td', lastRun(x))))]))))) : null;
  const q = (state.skillQ || '').toLowerCase();
  const shownSkills = skills.filter((x) => !q || `${x.name} ${x.summary}`.toLowerCase().includes(q));
  const skillRows = shownSkills.slice(0, q ? 50 : 8).map((x) => h('div.row.static', { role: 'listitem' }, h('span.g', icon('skill')),
    h('div.rb', h('div.rt', x.name), x.summary ? h('div.rm.wrap', h('span', x.summary)) : null),
    h('div.re', h('span.rr', x.project ? shortName(L.projectOf(c, x.project)) : t('anyProject')))));
  return [back,
    pageHead({ eyebrow: t('autoEyebrow'), title, lede: t('autoLede') }), statusBanners(),
    h('div.stack.top',
      bad.length ? block(sechead(t('needsALook'), bad.length), list(bad.map((x) => {
        const run = (a.runs || []).find((r) => r.automationId === x.id && L.isBadResult(r.result));
        return alertRow({ text: [h('b', x.name), ' ', t('failedAt', { t: fmtWhen(x.lastRun) }), run?.summary ? ` ${run.summary}` : ''], action: x.url && x.url !== '#' ? btn(t('openNotion'), { href: x.url }) : null });
      }))) : null,
      table ? block(sechead(t('schedule'), tasks.length), table) : null,
      skills.length ? block(sechead(t('skills'), skills.length, h('label.search', icon('search'), h('input', { type: 'search', id: 'skillfilter', value: state.skillQ || '', placeholder: t('findSkill'), 'aria-label': t('findSkill'),
        oninput: (e) => { state.skillQ = e.target.value; clearTimeout(state._ft); state._ft = setTimeout(() => window.dispatchEvent(new Event('ct:render')), 200); } }))),
      list(skillRows), shownSkills.length > skillRows.length ? h('p.hint', tn('pMoreSkills', shownSkills.length - skillRows.length)) : null) : null)];
}

// ---------- Settings and More ----------
export function viewSettings() {
  const c = ctx();
  const setrow = (label, hint, control) => h('div.setrow', h('div.sl', h('span', label), hint ? h('small', hint) : null), control);
  const sw = (checked, onchange, label) => h('input.switch', { type: 'checkbox', role: 'switch', checked: checked || null, onchange, 'aria-label': label });
  const rerender = () => window.dispatchEvent(new Event('ct:render'));
  return [pageHead({ title: t('navSettings') }), h('div.stack.top',
    block(sechead(t('language')), seg([{ value: 'en', label: 'English' }, { value: 'uk', label: 'Українська' }], settings.lang || document.documentElement.lang, (v) => { settings.lang = v; saveSettings(); applyLang(); rerender(); }, { label: t('language') })),
    block(sechead(t('theme')), seg([{ value: 'system', label: t('themeSystem') }, { value: 'dark', label: t('themeDark') }, { value: 'light', label: t('themeLight') }], settings.theme, (v) => { settings.theme = v; saveSettings(); window.dispatchEvent(new Event('ct:theme')); rerender(); }, { label: t('theme') })),
    block(sechead(t('visibleProjects')), h('p.hint', t('visibleHint')), h('div.list', (c.cfg.projects || []).map((p) => setrow(h('span.pt', dot(p.color), p.name), null,
      sw(!settings.hidden.includes(p.slug), (e) => { settings.hidden = e.target.checked ? settings.hidden.filter((x) => x !== p.slug) : [...new Set([...settings.hidden, p.slug])]; saveSettings(); rerender(); }, p.name))))),
    block(sechead(t('threads')), h('div.list', setrow(t('swapTurn'), t('swapTurnHint', { s: (c.cfg.turn?.mine || []).join(', ') }), sw(settings.swapTurn, (e) => { settings.swapTurn = e.target.checked; saveSettings(); rerender(); }, t('swapTurn'))))),
    isPhone() ? null : block(sechead(t('keys')), keysGrid()),
    block(sechead(t('about')), h('p.hint', t('aboutText'))))];
}
export function keysGrid() {
  const k = (keys, label) => [h('dt', keys.map((x) => h('span.kbd', x))), h('dd', label)];
  return h('dl.keys', k(['J', 'K'], t('kMove')), k(['Enter'], t('kOpen')), k(['E'], t('kDone')), k(['R'], t('kReplied')), k(['S'], t('kSnooze')),
    k(['N'], t('kAdd')), k(['/'], t('kFilter')), k(['⌘', 'K'], t('kPalette')), k(['?'], t('kHelp')), k(['Esc'], t('kClose')));
}
export function viewMore() {
  const bad = L.failedAutomation(state.auto, L.visibleSlugs(ctx())).length;
  return [pageHead({ title: t('navMore') }), h('div.stack.top', block(list([
    state.cfg.automation ? quiet({ glyph: 'bolt', text: t('navAutomation'), right: bad ? h('span.late', tn('pFailed', bad)) : null, href: '#/auto' }) : null,
    quiet({ glyph: 'gear', text: t('navSettings'), href: '#/settings' }),
    quiet({ glyph: 'globe', text: t('language'), right: (settings.lang || document.documentElement.lang) === 'uk' ? 'Українська' : 'English',
      onclick: () => { settings.lang = (settings.lang || document.documentElement.lang) === 'uk' ? 'en' : 'uk'; saveSettings(); applyLang(); window.dispatchEvent(new Event('ct:render')); } }),
    quiet({ glyph: 'search', text: t('pkTitle'), onclick: () => palette() }),
  ])))];
}
export { skeleton };
