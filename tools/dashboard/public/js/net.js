// Network: reads with a local cache (shown at once, then refreshed), and
// writes that wait for the undo toast. A change is applied locally right
// away; Notion is written when the 6 s toast ends. Offline, the write goes to
// an outbox and syncs when the connection returns. A record changed in Notion
// in the meantime wins: the action is dropped and the user is told.

import { state, store } from './core.js';
import { t } from './i18n.js';

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

let rerender = () => {};
let toaster = () => {};
export function setHooks({ render, toast }) { if (render) rerender = render; if (toast) toaster = toast; }

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-CT-Request': '1' },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch (e) {
    throw new ApiError(e.message || 'Network error', 0);
  }
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new ApiError(data.error || `${res.status} ${res.statusText}`, res.status);
  if (method === 'GET') {
    const cachedAt = res.headers.get('X-CT-Cached-At');
    state.offline = Boolean(cachedAt) || !navigator.onLine;
    if (!cachedAt) state.savedAt = new Date().toISOString();
  }
  return data;
}

// ---------- reads with a local cache ----------
const CACHE_KEYS = { cfg: 'ct.c.cfg', ov: 'ct.c.ov', inbox: 'ct.c.inbox', auto: 'ct.c.auto' };
export function loadCache() {
  const c = store.get('ct.c.meta', null);
  if (!c) return false;
  for (const [k, key] of Object.entries(CACHE_KEYS)) state[k] = store.get(key, null);
  state.savedAt = c.savedAt;
  return Boolean(state.cfg && state.ov);
}
function saveCache() {
  for (const [k, key] of Object.entries(CACHE_KEYS)) if (state[k]) store.set(key, state[k]);
  store.set('ct.c.meta', { savedAt: state.savedAt });
}
export async function loadAll(fresh = false) {
  const q = fresh ? '?fresh=1' : '';
  state.cfg = await api('/api/config');
  const [ov, inbox, auto] = await Promise.all([
    api('/api/overview' + q),
    state.cfg.inbox ? api('/api/inbox').then((x) => x.items).catch(() => state.inbox) : Promise.resolve(null),
    state.cfg.automation ? api('/api/automation' + q).catch(() => state.auto) : Promise.resolve(null),
  ]);
  state.ov = ov; state.inbox = inbox; state.auto = auto;
  state.loadError = null;
  state.sections.clear();
  applyPendingLocally();
  saveCache();
}
export async function loadSection(slug, section, { all = false, fresh = false } = {}) {
  const key = `${slug}/${section}/${all}`;
  if (!state.sections.has(key) || fresh) {
    state.sections.set(key, await api(`/api/p/${slug}/${section}?${all ? 'all=1&' : ''}${fresh ? 'fresh=1' : ''}`));
  }
  return state.sections.get(key);
}

// Change every cached copy of a record, so all lists stay consistent.
export function patchLocal(id, changes) {
  const touch = (arr) => (arr || []).forEach((x) => { if (x && x.id === id) Object.assign(x, changes); });
  if (state.ov) ['tasks', 'threads', 'risks', 'decisions', 'done', 'meetings', 'reports'].forEach((k) => touch(state.ov[k]));
  touch(state.inbox);
  for (const v of state.sections.values()) Object.values(v || {}).forEach((a) => Array.isArray(a) && touch(a));
}

// ---------- deferred writes with undo ----------
// op = { label, changes: [{ kind, obj, body }], extra?: { apply, revert } }
//   kind: tasks | threads | risks | decisions | inbox-route | tasks-create
const UNDO_MS = 6000;
let current = null;

function localBody(kind, body) {
  const b = { ...body };
  delete b.expectEdited;
  if (b.touch) { delete b.touch; b.manualAt = new Date().toISOString(); }
  if (b.reviewed) { delete b.reviewed; b.lastReviewed = new Date().toISOString().slice(0, 10); }
  if (kind === 'threads' && b.status) b.manualAt = new Date().toISOString();
  return b;
}

export function act(op) {
  if (current) commitNow();
  const before = [];
  for (const c of op.changes) {
    c.body = { ...c.body, expectEdited: c.obj.edited || undefined };
    const lb = localBody(c.kind, c.body);
    before.push(Object.fromEntries(Object.keys(lb).map((k) => [k, c.obj[k]])));
    Object.assign(c.obj, lb);
    patchLocal(c.obj.id, lb);
    state.pending.add(c.obj.id);
  }
  op.extra?.apply?.();
  const entry = { op, before, timer: null };
  current = entry;
  entry.timer = setTimeout(() => { if (current === entry) commitNow(); }, UNDO_MS);
  rerender();
  toaster(op.label, {
    undo: () => {
      if (current !== entry) return;
      clearTimeout(entry.timer);
      current = null;
      revert(entry);
      rerender();
    },
    ms: UNDO_MS,
  });
}
function revert(entry) {
  entry.op.changes.forEach((c, i) => {
    Object.assign(c.obj, entry.before[i]);
    patchLocal(c.obj.id, entry.before[i]);
    state.pending.delete(c.obj.id);
  });
  entry.op.extra?.revert?.();
}
export function commitNow() {
  const entry = current;
  if (!entry) return;
  current = null;
  clearTimeout(entry.timer);
  send(entry);
}

const pathFor = (c) => `/api/${c.kind}/${c.obj.id}`;
async function send(entry) {
  const { op } = entry;
  if (!navigator.onLine || state.offline) {
    queueOffline(op);
    return;
  }
  const failed = [];
  for (const c of op.changes) {
    try {
      const res = await api(pathFor(c), { method: 'PATCH', body: c.body });
      const fresh = res.task || res.thread || res.risk || res.decision;
      if (fresh?.edited) { c.obj.edited = fresh.edited; patchLocal(c.obj.id, { edited: fresh.edited }); }
      state.pending.delete(c.obj.id);
      if (res.warning) toaster(res.warning, { error: true });
    } catch (e) {
      if (e.status === 0) { queueOffline({ ...op, changes: [c] }); continue; }
      failed.push({ c, e });
    }
  }
  if (failed.length) {
    const idx = new Map(op.changes.map((c, i) => [c, i]));
    for (const { c } of failed) {
      const prev = entry.before[idx.get(c)];
      Object.assign(c.obj, prev); patchLocal(c.obj.id, prev); state.pending.delete(c.obj.id);
    }
    const conflict = failed.some(({ e }) => e.status === 409);
    toaster(conflict ? t('conflict') : `${t('notSaved')}: ${failed[0].e.message}`, { error: true });
    rerender();
  } else {
    rerender();
  }
}

// ---------- offline outbox ----------
function queueOffline(op) {
  const box = store.get('ct.outbox', []);
  for (const c of op.changes) box.push({ path: pathFor(c), body: c.body, id: c.obj.id, kind: c.kind, local: localBody(c.kind, c.body) });
  store.set('ct.outbox', box);
  rerender();
}
export function outboxSize() { return store.get('ct.outbox', []).length; }
// After a reload, queued changes are re-applied on top of fresh data.
function applyPendingLocally() {
  for (const x of store.get('ct.outbox', [])) { if (x.id) { patchLocal(x.id, x.local); state.pending.add(x.id); } }
}
export async function flushOutbox() {
  const box = store.get('ct.outbox', []);
  if (!box.length || !navigator.onLine) return;
  const left = [];
  let conflicts = 0;
  for (const x of box) {
    try {
      await api(x.path, { method: x.method || 'PATCH', body: x.body });
      if (x.id) state.pending.delete(x.id);
    } catch (e) {
      if (e.status === 0) left.push(x);
      else { conflicts++; state.pending.delete(x.id); }
    }
  }
  store.set('ct.outbox', left);
  if (conflicts) toaster(t('conflict'), { error: true });
  return box.length - left.length;
}

// Writes that create something (no undo: the item simply appears).
// Offline they wait in the outbox like any other change.
export async function create(path, body) {
  if (!navigator.onLine || state.offline) {
    const box = store.get('ct.outbox', []);
    box.push({ method: 'POST', path, body, id: null, local: {} });
    store.set('ct.outbox', box);
    return { queued: true };
  }
  return api(path, { method: 'POST', body });
}
