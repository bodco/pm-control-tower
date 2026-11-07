// What a row shows and what can be done with it, per entity, plus the
// sheets: details, status, snooze, stale review, quick add, Inbox routing and
// the ⌘K palette. Every swipe also exists as a button in the details sheet.

import { h, icon, state, ctx, settings, fill } from './core.js';
import { t, tn } from './i18n.js';
import { cleanTitle, fmtDue, fmtAge, fmtIn, fmtWhen, today, addDays, nextWeekday, dayOf } from './dates.js';
import * as L from './logic.js';
import { act, create, loadAll } from './net.js';
import { openSheet, closeSheet, toast, optionList, chips, btn, dot, healthWord } from './ui.js';

let app = { render: () => {}, go: () => {} };
export function setAppHooks(hooks) { app = { ...app, ...hooks }; }

const DEFAULT_STATUSES = ['To Do', 'Open', 'Active'];
export const shortName = (p) => p?.short || (p?.name || '').split(/\s+/)[0] || '';
export function projTag(slug) {
  const p = L.projectOf(ctx(), slug);
  return p ? h('span.pt', dot(p.color), shortName(p)) : null;
}
const optColor = (map, v) => state.cfg?.colors?.[map]?.[v] || 'default';
const openUrl = (u) => { if (u && u !== '#') window.open(u, '_blank', 'noopener'); };
const threadSource = (th) => th.slackLink || th.emailLink || null;
const channel = (th) => (th.types || []).find((x) => /slack|email|mail|teams|telegram/i.test(x)) || (th.slackLink ? 'Slack' : th.emailLink ? 'Email' : null);

// ---------- writes ----------
function setTask(task, body, label) { act({ label, changes: [{ kind: 'tasks', obj: task, body }] }); }
function setThread(th, body, label) { act({ label, changes: [{ kind: 'threads', obj: th, body }] }); }
function setRisk(r, body, label) { act({ label, changes: [{ kind: 'risks', obj: r, body }] }); }
function setDecision(d, body, label) { act({ label, changes: [{ kind: 'decisions', obj: d, body }] }); }

export const taskDone = (x) => setTask(x, { status: 'Done' }, t('tDone'));
export const taskReopen = (x) => setTask(x, { status: 'To Do' }, t('tReopened'));
export function taskSnooze(x, day = addDays(today(), 1)) { setTask(x, { due: day }, t('tSnoozed', { d: fmtDue(day).text })); }
export const threadReplied = (x) => setThread(x, { status: 'Replied' }, t('tReplied'));
export const riskReviewed = (x) => setRisk(x, { reviewed: true }, t('tReviewed'));

export function snoozePicker(x) {
  const td = today();
  const opts = [
    { value: addDays(td, 1), label: t('sTomorrow') },
    { value: nextWeekday(td, 1), label: t('sMonday') },
    { value: addDays(td, 7), label: t('sNextWeek') },
  ];
  // A picked date is applied only with the button: iPhone fills the field and
  // fires "change" while the wheel is still open, so a change is not a choice.
  const date = h('input.input', { type: 'date', 'aria-label': t('sPickDate'), min: addDays(td, 1) });
  const apply = btn(t('sSetDate'), { primary: true, disabled: true, onclick: () => {
    if (!date.value || date.value < td) return;
    closeSheet(); taskSnooze(x, date.value);
  } });
  const sync = () => { apply.disabled = !date.value || date.value < td; };
  date.addEventListener('input', sync);
  date.addEventListener('change', sync);
  openSheet(t('aSnooze'), h('div.stackS', optionList(opts.map((o) => ({ ...o, hint: fmtDue(o.value).text })), null, (v) => { closeSheet(); taskSnooze(x, v); }),
    h('div.fieldl', h('label', { for: 'snoozedate' }, t('sPickDate')), h('div.footrow', date, apply))));
  date.id = 'snoozedate';
}

// ---------- descriptors ----------
export function describe(item, { showProject = true, showStatus = false, grouped = false } = {}) {
  const { kind, x } = item;
  const c = ctx();
  const pending = state.pending.has(x.id);
  if (kind === 'task') {
    const active = !L.CLOSED_TASK.includes(x.status);
    const due = x.due ? fmtDue(x.due) : null;
    return {
      id: x.id, kind, glyph: 'checkbox', title: cleanTitle(x.title), pending,
      meta: [showProject ? projTag(x.project) : null, x.priority === 'High' ? t('high') : null,
        !grouped && (showStatus || !DEFAULT_STATUSES.includes(x.status)) && x.status && active ? x.status : null, x.jira || null],
      fact: due ? { text: due.text, cls: due.late && active ? 'late' : '' } : null,
      primary: active ? { label: t('aDone'), glyph: 'check', run: () => taskDone(x) } : { label: t('aReopen'), glyph: 'refresh', run: () => taskReopen(x) },
      snooze: active ? () => taskSnooze(x) : null,
      snoozePick: active ? () => snoozePicker(x) : null,
      sourceUrl: null, notionUrl: x.url,
      open: () => details(item), menu: () => menu(item),
    };
  }
  if (kind === 'thread') {
    const tn0 = L.turnOf(c, x);
    const age = L.threadAge(x);
    return {
      id: x.id, kind, glyph: /mail/i.test(channel(x) || '') ? 'mail' : 'chat', title: cleanTitle(x.title), pending,
      meta: [showProject ? projTag(x.project) : null, channel(x),
        showStatus && !grouped ? turnLabel(tn0, x.status) : null,
        x.hasDraft ? t('draftReady') : null,
        L.isQuiet(c, x) ? t('quiet') : null],
      fact: { text: fmtAge(L.lastActivity(x)) || t('dAge', { n: age }), cls: L.turnPastSla(c, x) ? 'wait' : '' },
      primary: tn0 === 'mine' ? { label: t('aReplied'), glyph: 'check', run: () => threadReplied(x) } : null,
      snooze: null,
      sourceUrl: threadSource(x), notionUrl: x.url,
      open: () => details(item), menu: () => menu(item),
    };
  }
  if (kind === 'risk') {
    const crit = x.severity === 'Critical';
    const n = L.triggerIn(c, x);
    const fin = n !== null ? fmtIn(x.triggerDate) : null;
    const nr = L.notReviewedDays(c, x);
    const colored = crit ? 'crit' : (fin?.late ? 'late' : nr ? 'wait' : null);
    return {
      id: x.id, kind, glyph: 'risk', title: cleanTitle(x.title), pending,
      meta: [crit ? h('span.crit', x.severity) : (x.severity || null), showProject ? projTag(x.project) : null, x.owner || null,
        nr ? h(colored === 'wait' ? 'span.wait' : 'span', t('notReviewed', { n: nr })) : null],
      fact: fin ? { text: fin.text, cls: colored === 'late' ? 'late' : '' } : (x.lastUpdated ? { text: fmtAge(x.lastUpdated) } : null),
      primary: L.riskFields(c).reviewed ? { label: t('aReviewed'), glyph: 'check', run: () => riskReviewed(x) } : null,
      snooze: null, sourceUrl: null, notionUrl: x.url,
      open: () => details(item), menu: () => menu(item),
    };
  }
  if (kind === 'decision') {
    return {
      id: x.id, kind, glyph: 'scale', title: cleanTitle(x.title), pending,
      meta: [t('kDecision'), showProject ? projTag(x.project) : null, x.statedBy || null, x.status && !DEFAULT_STATUSES.includes(x.status) ? x.status : null],
      fact: x.date ? { text: fmtAge(x.date) } : null,
      notionUrl: x.url, open: () => details(item), menu: () => menu(item),
    };
  }
  if (kind === 'meeting') {
    return {
      id: x.id, kind, glyph: 'cal', title: cleanTitle(x.title),
      meta: [t('kMeeting'), showProject ? projTag(x.project) : null, (x.types || [])[0] || null],
      fact: x.date ? { text: fmtWhen(x.date) } : null,
      notionUrl: x.url, sourceUrl: null, open: () => details(item), menu: () => menu(item),
    };
  }
  if (kind === 'report') {
    return {
      id: x.id, kind, glyph: 'doc', title: cleanTitle(x.title),
      meta: [t('kReport'), showProject ? projTag(x.project) : null, x.visibility === 'External' ? t('external') : null],
      fact: x.date ? { text: fmtAge(x.date) } : null,
      notionUrl: x.url, open: () => details(item), menu: () => menu(item),
    };
  }
  if (kind === 'inbox') {
    return {
      id: x.id, kind, glyph: 'note', title: cleanTitle(x.title), pending,
      meta: [x.project ? projTag(x.project) : t('noProject'), x.notes ? x.notes.split('\n')[0].slice(0, 80) : null],
      fact: x.created ? { text: fmtAge(x.created) } : null,
      primary: { label: t('aRoute'), glyph: 'check', run: () => routeInbox(x) },
      notionUrl: x.url, open: () => routeInbox(x), menu: () => menu(item),
    };
  }
  return { id: x.id, title: x.title || '' };
}
function turnLabel(turn, status) {
  return turn === 'mine' ? t('yourTurn') : turn === 'theirs' ? t('theirTurn') : status;
}

// ---------- details: tap on phone, click on laptop ----------
export function details(item) {
  const { kind, x } = item;
  const d = describe(item);
  const c = ctx();
  const p = L.projectOf(c, x.project);
  const eyebrow = [p ? h('span.pt', dot(p.color), p.name) : null,
    kind === 'thread' ? channel(x) : null,
    kind === 'thread' ? `${turnLabel(L.turnOf(c, x), x.status)} ${fmtAge(L.lastActivity(x))}` : null,
    kind === 'task' && x.status ? x.status : null,
    kind === 'risk' && x.status ? x.status : null,
    kind === 'decision' && x.date ? fmtAge(x.date) : null,
    kind === 'meeting' && x.date ? fmtWhen(x.date) : null].filter(Boolean);
  const text = kind === 'thread' ? x.description : kind === 'risk' ? x.summary : kind === 'decision' ? x.context : kind === 'meeting' || kind === 'report' ? x.summary : kind === 'inbox' ? x.notes : null;
  const facts = [];
  if (kind === 'task') {
    if (x.due) facts.push([t('fDue'), fmtDue(x.due).text]);
    if (x.priority) facts.push([t('fPriority'), x.priority]);
    if (x.source && !['manual', 'inbox'].includes(x.source)) facts.push([t('fSource'), x.source]);
  }
  if (kind === 'risk') {
    if (x.severity) facts.push([t('fSeverity'), x.severity]);
    if (x.likelihood) facts.push([t('fLikelihood'), x.likelihood]);
    if (x.owner) facts.push([t('fOwner'), x.owner]);
    if (x.triggerDate && L.riskFields(c).trigger) facts.push([t('fTrigger'), fmtIn(x.triggerDate).text]);
    if (x.lastReviewed && L.riskFields(c).reviewed) facts.push([t('fReviewed'), fmtAge(x.lastReviewed)]);
    if (x.mitigation) facts.push([t('fMitigation'), x.mitigation]);
  }
  if (kind === 'decision') {
    if (x.area) facts.push([t('fArea'), x.area]);
    if (x.door) facts.push([t('fDoor'), x.door]);
    if (x.statedBy) facts.push([t('fStatedBy'), x.statedBy]);
  }
  const buttons = [];
  const after = (fn) => () => { closeSheet(); fn(); };
  if (d.primary) buttons.push(btn(d.primary.label, { primary: true, glyph: d.primary.glyph, onclick: after(d.primary.run) }));
  if (kind === 'thread' && x.hasDraft) buttons.push(btn(t('aDraft'), { glyph: 'doc', onclick: () => openUrl(x.url) }));
  if (d.snooze) buttons.push(btn(t('aSnooze'), { glyph: 'snooze', onclick: after(() => snoozePicker(x)) }));
  if (['task', 'thread', 'risk', 'decision'].includes(kind)) buttons.push(btn(t('aStatus'), { glyph: 'more', onclick: after(() => statusSheet(item)) }));
  if (kind === 'thread') buttons.push(btn(t('aMakeTask'), { glyph: 'plus', onclick: after(() => makeTask(x)) }));
  const links = [
    d.sourceUrl ? h('a.linkrow', { href: d.sourceUrl, target: '_blank', rel: 'noopener' }, icon('open'), x.slackLink ? t('openSlack') : t('openMail')) : null,
    x.url ? h('a.linkrow', { href: x.url, target: '_blank', rel: 'noopener' }, icon('open'), t('openNotion')) : null,
  ];
  openSheet(null, h('div.detail',
    h('p.eyebrow.dm', eyebrow.map((e, i) => [i ? h('span.sep', { 'aria-hidden': 'true' }) : null, typeof e === 'string' ? h('span', e) : e])),
    h('h2.dt', d.title),
    text ? h('p.dx', text) : null,
    facts.length ? h('dl.facts', facts.map(([k, v]) => [h('dt', k), h('dd', v)])) : null,
    buttons.length ? h('div.acts2', buttons) : null,
    h('div.links', links)), { kind: 'panel', label: d.title });
}

// Long press / "More": status from the Notion options, plus the rest.
export function menu(item) { statusSheet(item, { withLinks: true }); }
export function statusSheet(item, { withLinks = false } = {}) {
  const { kind, x } = item;
  const o = state.cfg.options || {};
  const groups = [];
  const pick = (fn) => (v) => { closeSheet(); fn(v); };
  if (kind === 'task') {
    groups.push([t('fStatus'), optionList(o.taskStatuses.map((s) => ({ value: s, label: s, color: optColor('taskStatus', s) })), x.status, pick((v) => setTask(x, { status: v }, t('tStatus', { s: v }))))]);
    groups.push([t('fPriority'), optionList(o.priorities.map((s) => ({ value: s, label: s, color: optColor('priority', s) })), x.priority, pick((v) => setTask(x, { priority: v }, t('tSaved'))))]);
  } else if (kind === 'thread') {
    groups.push([t('fStatus'), optionList(o.threadStatuses.map((s) => ({ value: s, label: s, color: optColor('threadStatus', s), hint: hintFor(s) })), x.status, pick((v) => setThread(x, { status: v }, t('tStatus', { s: v }))))]);
  } else if (kind === 'risk') {
    groups.push([t('fStatus'), optionList(o.riskStatuses.map((s) => ({ value: s, label: s, color: optColor('riskStatus', s) })), x.status, pick((v) => setRisk(x, { status: v }, t('tStatus', { s: v }))))]);
    groups.push([t('fSeverity'), optionList(o.severities.map((s) => ({ value: s, label: s, color: optColor('severity', s) })), x.severity, pick((v) => setRisk(x, { severity: v }, t('tSaved'))))]);
  } else if (kind === 'decision') {
    groups.push([t('fStatus'), optionList(o.decisionStatuses.map((s) => ({ value: s, label: s, color: optColor('decisionStatus', s) })), x.status, pick((v) => setDecision(x, { status: v }, t('tStatus', { s: v }))))]);
  }
  const extra = withLinks ? h('div.links',
    kind === 'thread' ? h('button.linkrow', { type: 'button', onclick: () => { closeSheet(); makeTask(x); } }, icon('plus'), t('aMakeTask')) : null,
    kind === 'inbox' ? h('button.linkrow', { type: 'button', onclick: () => { closeSheet(); routeInbox(x); } }, icon('check'), t('aRoute')) : null,
    x.url ? h('a.linkrow', { href: x.url, target: '_blank', rel: 'noopener' }, icon('open'), t('openNotion')) : null) : null;
  openSheet(cleanTitle(x.title), h('div.stackS', groups.map(([label, node]) => h('div.og', h('p.ogl', label), node)), extra));
}
function hintFor(status) {
  const c = ctx();
  const tn0 = L.turnOf(c, { status, project: null });
  return tn0 === 'mine' ? t('yourTurn') : tn0 === 'theirs' ? t('theirTurn') : null;
}

// A thread becomes a task in the same project (the thread stays as it is).
async function makeTask(th) {
  try {
    const r = await create('/api/tasks', { title: cleanTitle(th.title), project: th.project, description: th.url ? `From thread: ${th.url}` : undefined });
    toast(r.queued ? t('queuedOffline') : t('tCreated'));
    if (!r.queued) loadAll(true).then(app.render).catch(() => {});
  } catch (e) { toast(`${t('notSaved')}: ${e.message}`, { error: true }); }
}

// ---------- stale review: one card at a time ----------
export function staleReview(slugs) {
  const list = L.staleThreads(ctx(), slugs);
  let i = 0;
  const box = h('div.review');
  const paint = () => {
    if (i >= list.length) { closeSheet(); toast(t('reviewDone')); return; }
    const th = list[i];
    const p = L.projectOf(ctx(), th.project);
    fill(box,
      h('p.eyebrow', t('reviewProgress', { i: i + 1, n: list.length })),
      h('p.eyebrow.dm', p ? h('span.pt', dot(p.color), shortName(p)) : null, channel(th) ? [h('span.sep'), h('span', channel(th))] : null,
        h('span.sep'), h('span', t('lastActivity', { d: fmtAge(L.lastActivity(th)) }))),
      h('h2.dt', cleanTitle(th.title)),
      th.description ? h('p.dx', th.description) : null,
      h('div.acts2',
        btn(t('rvClose'), { onclick: () => { setThread(th, { status: 'Closed' }, t('tClosed')); i++; paint(); } }),
        btn(t('rvKeep'), { onclick: () => { setThread(th, { status: L.SPECTATOR }, t('tKept')); i++; paint(); } }),
        state.cfg.threadManualStatus ? btn(t('rvRelevant'), { onclick: () => { setThread(th, { touch: true }, t('tRelevant')); i++; paint(); } }) : null,
        btn(t('rvSkip'), { onclick: () => { i++; paint(); } })),
      h('p.hint', t('rvHint')));
    box.querySelector('button')?.focus();
  };
  openSheet(t('staleTitle'), box);
  paint();
}
export function closeOldStale(slugs) {
  const c = ctx();
  const old = L.staleThreads(c, slugs).filter((th) => L.threadAge(th) >= L.freshness(c, th.project).stale_bulk_days);
  if (!old.length) return;
  act({ label: tn('tClosedN', old.length), changes: old.map((th) => ({ kind: 'threads', obj: th, body: { status: 'Closed' } })) });
}

// ---------- quick add ----------
// Default: an Inbox note without a project. Chips turn it into a task or a
// decision; those need a project (never guessed; inside a project it is set).
export function quickAdd({ slug = null, kind = 'note' } = {}) {
  const projs = (state.cfg?.projects || []).filter((p) => !settings.hidden.includes(p.slug) || p.slug === slug);
  const st = { kind: state.cfg?.inbox ? kind : 'task', project: slug, due: null };
  const input = h('input.input.big', { type: 'text', maxlength: 300, autocomplete: 'off', autofocus: true, 'aria-label': t('qaPlaceholder'), placeholder: t('qaPlaceholder'),
    enterkeyhint: 'done', onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } } });
  const hint = h('p.hint', { role: 'status' });
  const body = h('div.stackS');
  const td = today();
  const paint = () => {
    const kinds = [state.cfg?.inbox ? { value: 'note', label: t('qaNote') } : null, { value: 'task', label: t('qaTask') }, { value: 'decision', label: t('qaDecision') }].filter(Boolean);
    fill(body, input,
      chips(kinds, st.kind, (v) => { st.kind = v; paint(); }, { label: t('qaKind') }),
      chips(projs.map((p) => ({ value: p.slug, label: shortName(p), color: p.color })), st.project, (v) => { st.project = st.project === v ? null : v; paint(); }, { label: t('fProject') }),
      st.kind === 'task' ? chips([{ value: td, label: t('sToday') }, { value: addDays(td, 1), label: t('sTomorrow') }, { value: nextWeekday(td, 1), label: t('sMonday') }], st.due, (v) => { st.due = st.due === v ? null : v; paint(); }, { label: t('fDue') }) : null,
      hint);
  };
  const save = async () => {
    const title = input.value.trim();
    if (!title) { input.focus(); return; }
    if (st.kind !== 'note' && !st.project) { hint.textContent = t('projectRequired'); hint.className = 'hint err'; return; }
    const path = st.kind === 'note' ? '/api/inbox' : st.kind === 'task' ? '/api/tasks' : '/api/decisions';
    const payload = st.kind === 'note' ? { title, project: st.project || undefined }
      : st.kind === 'task' ? { title, project: st.project, due: st.due || undefined } : { title, project: st.project };
    try {
      const r = await create(path, payload);
      closeSheet();
      toast(r.queued ? t('queuedOffline') : t('tCreated'));
      if (!r.queued) loadAll(true).then(app.render).catch(() => {});
    } catch (e) { hint.textContent = e.message; hint.className = 'hint err'; }
  };
  paint();
  openSheet(t('qaTitle'), body, { foot: h('div.footrow', h('span.hint', t('qaEnter')), h('span.spacer'), btn(t('save'), { primary: true, onclick: save })) });
}

// ---------- Inbox: route a note to Tasks ----------
export function routeInbox(item) {
  const projs = (state.cfg?.projects || []).filter((p) => !settings.hidden.includes(p.slug) || p.slug === item.project);
  const st = { project: item.project || null, due: null, priority: null };
  const td = today();
  const hint = h('p.hint', { role: 'status' });
  const body = h('div.stackS');
  const paint = () => fill(body,
    h('p.dx', cleanTitle(item.title)),
    h('div.og', h('p.ogl', t('fProjectReq')), chips(projs.map((p) => ({ value: p.slug, label: p.name, color: p.color })), st.project, (v) => { st.project = v; paint(); })),
    h('div.og', h('p.ogl', t('fDue')), chips([{ value: td, label: t('sToday') }, { value: addDays(td, 1), label: t('sTomorrow') }, { value: nextWeekday(td, 1), label: t('sMonday') }, { value: addDays(td, 7), label: t('sNextWeek') }], st.due, (v) => { st.due = st.due === v ? null : v; paint(); })),
    h('div.og', h('p.ogl', t('fPriority')), chips((state.cfg.options?.priorities || []).map((v) => ({ value: v, label: v })), st.priority, (v) => { st.priority = st.priority === v ? null : v; paint(); })),
    hint);
  const save = async () => {
    if (!st.project) { hint.textContent = t('projectRequired'); hint.className = 'hint err'; return; }
    try {
      const r = await create(`/api/inbox/${item.id}/route`, { project: st.project, due: st.due || undefined, priority: st.priority || undefined });
      closeSheet();
      toast(r.queued ? t('queuedOffline') : t('tRouted'));
      state.inbox = (state.inbox || []).filter((x) => x.id !== item.id);
      app.render();
      if (!r.queued) loadAll(true).then(app.render).catch(() => {});
    } catch (e) { hint.textContent = e.message; hint.className = 'hint err'; }
  };
  paint();
  openSheet(t('routeTitle'), body, { foot: h('div.footrow', item.url ? h('a.tlink', { href: item.url, target: '_blank', rel: 'noopener' }, t('openNotion')) : null, h('span.spacer'), btn(t('aRoute'), { primary: true, onclick: save })) });
}

// ---------- ⌘K: jump, search, add ----------
export function palette() {
  const c = ctx();
  const input = h('input.input.big', { type: 'search', autocomplete: 'off', autofocus: true, placeholder: t('pkPlaceholder'), 'aria-label': t('pkPlaceholder') });
  const out = h('div.optlist', { role: 'listbox' });
  let sel = 0;
  const base = () => [
    ...L.visibleSlugs(c).map((s) => { const p = L.projectOf(c, s); return { label: p.name, hint: t('pkProject'), color: p.color, run: () => app.go(`#/p/${s}`) }; }),
    { label: t('pkAddNote'), hint: 'N', run: () => quickAdd({ kind: 'note' }) },
    { label: t('pkAddTask'), run: () => quickAdd({ kind: 'task' }) },
    { label: t('pkAddDecision'), run: () => quickAdd({ kind: 'decision' }) },
    { label: t('navInbox'), run: () => app.go('#/inbox') },
    state.cfg?.automation ? { label: t('navAutomation'), run: () => app.go('#/auto') } : null,
    { label: t('navSettings'), run: () => app.go('#/settings') },
  ].filter(Boolean);
  const search = (q) => {
    const s = q.toLowerCase();
    const hits = [];
    const add = (kind, x) => { if (cleanTitle(x.title).toLowerCase().includes(s)) hits.push({ label: cleanTitle(x.title), hint: t(`k${kind[0].toUpperCase()}${kind.slice(1)}`), run: () => details({ kind, x }) }); };
    (c.ov?.tasks || []).forEach((x) => add('task', x));
    (c.ov?.threads || []).forEach((x) => add('thread', x));
    (c.ov?.risks || []).forEach((x) => add('risk', x));
    return [...base().filter((b) => b.label.toLowerCase().includes(s)), ...hits].slice(0, 12);
  };
  let items = base();
  const paint = () => {
    out.replaceChildren(...items.map((it, i) => h('button.opt', { type: 'button', role: 'option', 'aria-selected': String(i === sel), onclick: () => { closeSheet(); it.run(); } },
      it.color ? dot(it.color) : null, h('span.ol', it.label), it.hint ? h('span.oh', it.hint) : null)));
    out.children[sel]?.scrollIntoView?.({ block: 'nearest' });
  };
  input.addEventListener('input', () => { items = input.value.trim() ? search(input.value.trim()) : base(); sel = 0; paint(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); paint(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
    if (e.key === 'Enter' && items[sel]) { e.preventDefault(); closeSheet(); items[sel].run(); }
  });
  paint();
  openSheet(null, h('div.stackS', input, out), { label: t('pkTitle') });
}

export { healthWord, dayOf };
