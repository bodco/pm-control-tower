// PM Control Tower dashboard (PWA), v2 "calm dashboard". Vanilla JS modules,
// no build step. Talks only to its own Worker (/api); the Worker talks to Notion.

import { h, icon, $, $$, state, settings, ctx, isPhone, applyLang } from './core.js';
import { t } from './i18n.js';
import { setDateContext } from './dates.js';
import * as L from './logic.js';
import { loadAll, loadCache, setHooks, flushOutbox, commitNow, outboxSize } from './net.js';
import { toast, closeSheet, openSheet, skeleton, banner, btn } from './ui.js';
import { setAppHooks, quickAdd, palette, taskDone, threadReplied, riskReviewed, snoozePicker, taskSnooze, describe } from './actions.js';
import * as V from './views.js';

// ---------- theme ----------
function applyTheme() {
  const root = document.documentElement;
  if (settings.theme === 'dark' || settings.theme === 'light') root.dataset.theme = settings.theme;
  else delete root.dataset.theme;
  const dark = settings.theme === 'dark' || (settings.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#1e1e20' : '#f5f5f7'));
}

// ---------- routing ----------
function route() {
  const [hashPath, query] = location.hash.replace(/^#\/?/, '').split('?');
  const parts = (hashPath || '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'p' && parts[1]) return { view: 'project', slug: parts[1], tab: parts[2] || 'overview', query };
  if (parts[0] === 'queue') return { view: 'queue', kind: parts[1] || 'needs' };
  if (parts[0] === 'projects') return { view: 'projects' };
  if (parts[0] === 'inbox') return { view: 'inbox' };
  if (parts[0] === 'auto') return { view: 'auto', slug: parts[1] || null };
  if (parts[0] === 'settings') return { view: 'settings' };
  if (parts[0] === 'more') return { view: 'more' };
  return { view: 'today' };
}
const go = (href) => { if (location.hash === href) render(); else location.hash = href; };

// ---------- navigation ----------
function renderNav() {
  const r = route();
  const cur = (cond) => (cond ? 'page' : null);
  const c = ctx();
  const inboxN = (state.inbox || []).length;
  const bad = L.failedAutomation(state.auto, L.visibleSlugs(c)).length;
  const inProjects = r.view === 'projects' || r.view === 'project';
  $('#bnav').replaceChildren(
    h('a', { href: '#/', 'aria-current': cur(r.view === 'today' || r.view === 'queue') }, icon('today'), h('span', t('navToday'))),
    h('a', { href: '#/projects', 'aria-current': cur(inProjects) }, icon('projects'), h('span', t('projects'))),
    h('button.fab', { type: 'button', 'aria-label': t('add'), onclick: () => quickAdd(r.view === 'project' ? { slug: r.slug, kind: state.cfg?.inbox ? 'note' : 'task' } : {}) }, icon('plus')),
    h('a', { href: '#/inbox', 'aria-current': cur(r.view === 'inbox') }, icon('inbox'), h('span', t('navInbox')), inboxN ? h('span.badge', { 'aria-label': t('nItems', { n: inboxN }) }, String(inboxN)) : null),
    h('a', { href: '#/more', 'aria-current': cur(['more', 'settings', 'auto'].includes(r.view)) }, icon('more'), h('span', t('navMore'))));
  if (!state.cfg || !state.ov) return;
  $('#side').replaceChildren(...[
    h('a.brand', { href: '#/' }, h('span.logo', { 'aria-hidden': 'true' }, '🗼'), h('span.name', state.cfg.title || 'Control Tower')),
    h('a.nav', { href: '#/', 'aria-current': cur(r.view === 'today' || r.view === 'queue') }, icon('today'), h('span.lbl', t('navToday'))),
    h('a.nav', { href: '#/inbox', 'aria-current': cur(r.view === 'inbox') }, icon('inbox'), h('span.lbl', t('navInbox')), inboxN ? h('span.c', String(inboxN)) : null),
    h('p.navgroup', t('projects')),
    L.visibleSlugs(c).map((s) => {
      const p = L.projectOf(c, s);
      const n = L.yourTurn(c, [s]).length;
      return h('a.nav', { href: `#/p/${encodeURIComponent(s)}`, 'aria-current': cur(r.slug === s), title: n ? t('turnCount', { n }) : null },
        h('span.dot.pd', { style: { background: p.color || 'var(--o-gray)' }, 'aria-hidden': 'true' }), h('span.lbl', p.name), n ? h('span.c', { 'aria-label': t('turnCount', { n }) }, String(n)) : null);
    }),
    h('span.spacer'),
    state.cfg.automation ? h('a.nav', { href: '#/auto', 'aria-current': cur(r.view === 'auto') }, icon('bolt'), h('span.lbl', t('navAutomation')),
      // On Today the failure row is already on screen: no second red mark.
      bad && r.view !== 'today' ? h('span.dot.bad', { role: 'img', 'aria-label': t('autoFailedDot') }) : null) : null,
    h('a.nav', { href: '#/settings', 'aria-current': cur(r.view === 'settings') }, icon('gear'), h('span.lbl', t('navSettings')), h('span.c', (document.documentElement.lang || 'en').toUpperCase())),
    h('button.nav.kh', { type: 'button', onclick: palette }, h('span.kbd', '⌘K'), h('span.lbl', t('cmdHint'))),
  ].flat(Infinity).filter(Boolean));
  $('#phonebar').replaceChildren(...[h('span.logo', { 'aria-hidden': 'true' }, '🗼'), h('span.name', pageName(r)), h('span.spacer'),
    outboxSize() ? h('span.pendn', { title: t('pendingSync') }, icon('clock'), String(outboxSize())) : null,
    h('button.ibtn.lg', { type: 'button', 'aria-label': t('pkTitle'), onclick: palette }, icon('search'))].filter(Boolean));
}
function pageName(r) {
  if (r.view === 'project') return L.projectOf(ctx(), r.slug)?.name || '';
  return { today: t('navToday'), queue: t('navToday'), projects: t('projects'), inbox: t('navInbox'), auto: t('navAutomation'), settings: t('navSettings'), more: t('navMore') }[r.view] || '';
}

// ---------- render ----------
let seq = 0;
export async function render() {
  const my = ++seq;
  applyTheme();
  const r = route();
  const app = $('#app');
  if (!state.cfg || !state.ov) {
    renderNav();
    if (state.offline && !state.loadError) {
      app.replaceChildren(h('div.page', banner(t('offlineNoCache'), btn(t('retry'), { glyph: 'refresh', onclick: () => refresh() }))));
    } else if (state.loadError) {
      app.replaceChildren(h('div.page', banner(`${t('notionError')}: ${state.loadError}`, btn(t('retry'), { glyph: 'refresh', onclick: () => refresh() }))));
    } else app.replaceChildren(h('div.page', skeleton(6)));
    return;
  }
  try {
    let nodes;
    if (r.view === 'project') nodes = await V.viewProject(r.slug, r.tab, r.query);
    else if (r.view === 'queue') nodes = V.viewQueue(r.kind);
    else if (r.view === 'projects') nodes = V.viewProjects();
    else if (r.view === 'inbox') nodes = V.viewInbox();
    else if (r.view === 'auto') nodes = await V.viewAutomation(r.slug);
    else if (r.view === 'settings') nodes = V.viewSettings();
    else if (r.view === 'more') nodes = V.viewMore();
    else nodes = V.viewToday();
    if (my !== seq) return;
    // Keep focus and scroll when the same page re-renders after an action.
    const key = location.hash;
    const same = app.dataset.key === key;
    const focusedId = document.activeElement?.closest?.('[data-id]')?.dataset.id;
    const focusedInput = document.activeElement?.id;
    const y = window.scrollY;
    app.replaceChildren(h('div.page', nodes.flat(Infinity).filter(Boolean)));
    app.dataset.key = key;
    renderNav();
    if (same) {
      window.scrollTo(0, y);
      if (focusedInput && document.getElementById(focusedInput)) {
        const el = document.getElementById(focusedInput); el.focus(); el.setSelectionRange?.(el.value.length, el.value.length);
      } else if (focusedId) app.querySelector(`[data-id="${CSS.escape(focusedId)}"]`)?.focus();
    }
  } catch (e) {
    if (my !== seq) return;
    app.replaceChildren(h('div.page', banner(`${t('notionError')}: ${e.message}`, btn(t('retry'), { glyph: 'refresh', onclick: () => refresh() }))));
  }
}

async function refresh() {
  commitNow();
  document.body.classList.add('refreshing');
  try {
    await flushOutbox();
    await loadAll(true);
    state.stateDocs.clear();
  } catch (e) {
    if (e.status === 0) state.offline = true; else state.loadError = e.message;
  } finally {
    document.body.classList.remove('refreshing');
    render();
  }
}

// ---------- keyboard (laptop) ----------
function rowsOnPage() { return $$('#app [data-row]'); }
function moveFocus(d) {
  const rows = rowsOnPage();
  if (!rows.length) return;
  const i = rows.indexOf(document.activeElement);
  const next = rows[Math.max(0, Math.min(rows.length - 1, i < 0 ? 0 : i + d))];
  next.focus(); next.scrollIntoView({ block: 'nearest' });
}
function focusedDesc() { return document.activeElement?.closest?.('[data-row]')?._ct || null; }
function onKey(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); closeSheet(); palette(); return; }
  if (e.key === 'Escape') { closeSheet(); return; }
  if ($('#sheet-root').childElementCount) return;
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
  const d = focusedDesc();
  const k = e.key;
  if (k === 'j' || k === 'ArrowDown' && d) { e.preventDefault(); moveFocus(1); }
  else if (k === 'k' || k === 'ArrowUp' && d) { e.preventDefault(); moveFocus(-1); }
  else if (k === 'n' || k === 'N') { e.preventDefault(); const r = route(); quickAdd(r.view === 'project' ? { slug: r.slug, kind: 'task' } : {}); }
  else if (k === '/') {
    const f = $('#workfilter') || $('#skillfilter');
    e.preventDefault();
    if (f) f.focus(); else palette();
  }
  else if (k === '?') { e.preventDefault(); openSheet(t('keys'), V.keysGrid()); }
  else if (!d) return;
  else if (k === 'e' && d.kind === 'task') { e.preventDefault(); d.primary?.run(); }
  else if (k === 'r' && (d.kind === 'thread' || d.kind === 'risk') && d.primary) { e.preventDefault(); d.primary.run(); }
  else if (k === 's' && d.snooze) { e.preventDefault(); d.snooze(); }
  else if (k === 'o' && d.notionUrl) { e.preventDefault(); window.open(d.notionUrl, '_blank', 'noopener'); }
}

// ---------- pull to refresh (phone) ----------
function setupPull() {
  let y0 = null; let dy = 0;
  const ptr = $('#ptr');
  window.addEventListener('touchstart', (e) => { y0 = window.scrollY <= 0 && !$('#sheet-root').childElementCount ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 10) { ptr.classList.add('show'); ptr.textContent = dy > 80 ? t('releaseRefresh') : t('pullRefresh'); }
  }, { passive: true });
  window.addEventListener('touchend', () => {
    if (y0 !== null && dy > 80) refresh();
    ptr.classList.remove('show'); y0 = null; dy = 0;
  });
}

// ---------- boot ----------
async function boot() {
  applyLang();
  applyTheme();
  setHooks({ render, toast });
  setAppHooks({ render, go });
  const cached = loadCache();
  if (cached) { setDateContext({ tz: state.cfg.timezone }); state.offline = !navigator.onLine; }
  render();
  window.addEventListener('hashchange', () => { closeSheet(); state.filter = state.filter && route().view === 'today' ? state.filter : null; render().then(() => window.scrollTo(0, 0)); });
  window.addEventListener('ct:render', () => render());
  window.addEventListener('ct:refresh', () => refresh());
  window.addEventListener('ct:theme', applyTheme);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  window.addEventListener('online', async () => { state.offline = false; await flushOutbox(); refresh(); });
  window.addEventListener('offline', () => { state.offline = true; render(); });
  window.addEventListener('pagehide', commitNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') commitNow(); });
  document.addEventListener('keydown', onKey);
  setupPull();
  try {
    await flushOutbox();
    await loadAll(false);
    setDateContext({ tz: state.cfg.timezone });
  } catch (e) {
    if (e.status === 0 || !navigator.onLine) state.offline = true;
    else state.loadError = e.message;
  }
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Exposed for quick checks in the browser console and the screenshot script.
window.__ct = { state, describe, taskDone, threadReplied, riskReviewed, snoozePicker, taskSnooze, render, isPhone };
boot();
