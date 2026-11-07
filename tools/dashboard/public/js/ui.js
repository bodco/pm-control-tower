// UI building blocks of the v2 "calm dashboard": rows, quiet rows, lists,
// section headers, the metric strip, cards, sheets, the side panel, toasts.

import { h, icon, $, isPhone, canHover } from './core.js';
import { t } from './i18n.js';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- toast with undo ----------
let toastTimer;
export function toast(msg, { undo, error = false, ms } = {}) {
  const wrap = $('#toastwrap');
  const life = ms || (undo ? 6000 : error ? 6000 : 2500);
  const bar = undo ? h('i.bar') : null;
  const el = h(`div.toast${error ? '.error' : ''}`, { role: error ? 'alert' : 'status' },
    error ? h('span.dot.bad', { 'aria-hidden': 'true' }) : null,
    h('span.msg', msg),
    undo ? h('button.u', { type: 'button', onclick: () => { clearTimeout(toastTimer); wrap.replaceChildren(); undo(); } }, t('undo')) : null,
    bar);
  wrap.replaceChildren(el);
  if (bar && !reduced()) requestAnimationFrame(() => { bar.style.transition = `transform ${life}ms linear`; bar.style.transform = 'scaleX(0)'; });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => wrap.replaceChildren(), life);
}

// ---------- sheet (phone) / dialog (laptop) ----------
let lastFocus = null;
export function closeSheet() {
  const root = $('#sheet-root');
  if (!root.childElementCount) return;
  root.replaceChildren();
  document.body.classList.remove('has-sheet');
  lastFocus?.focus?.();
}
function trap(container) {
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    const f = [...container.querySelectorAll('button, a[href], input, textarea, select, [tabindex="0"]')].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
}
// kind: 'sheet' (modal: bottom sheet on phone, centered dialog on laptop)
//       'panel' (details: bottom sheet on phone, side panel on laptop)
export function openSheet(title, body, { foot, kind = 'sheet', label } = {}) {
  lastFocus = document.activeElement;
  const asPanel = kind === 'panel' && !isPhone();
  const box = h(`div.${asPanel ? 'panel' : 'sheet'}`, { role: 'dialog', 'aria-modal': 'true', 'aria-label': label || title || t('details') },
    asPanel ? null : h('div.grab', { 'aria-hidden': 'true' }),
    h('div.sheethead', title ? h('h2.st', title) : h('span'), h('span.spacer'),
      h('button.ibtn', { type: 'button', 'aria-label': t('close'), onclick: closeSheet }, icon('x'))),
    h('div.sheetbody', body), foot ? h('div.sheetfoot', foot) : null);
  const scrim = h(`div.scrim${asPanel ? '.is-panel' : ''}`, { onclick: (e) => { if (e.target === scrim) closeSheet(); } }, box);
  trap(box);
  $('#sheet-root').replaceChildren(scrim);
  document.body.classList.add('has-sheet');
  setTimeout(() => (box.querySelector('[autofocus], input, textarea') || box.querySelector('.sheetbody button, .sheetbody a') || box.querySelector('button'))?.focus(), 30);
  return box;
}

// ---------- page pieces ----------
export function pageHead({ eyebrow, title, lede, right }) {
  return h('header.head',
    h('div.headtext', eyebrow ? h('p.eyebrow', eyebrow) : null, h('h1.title', title), lede ? h('p.lede', lede) : null),
    right ? h('div.headright', right) : null);
}
export function sechead(title, count, extra) {
  return h('div.sh', h('h2', title), count ? h('span.c', String(count)) : null, h('span.spacer'), extra || null);
}
export function block(...kids) { return h('section.block', kids); }
export function list(nodes, { label } = {}) {
  const items = nodes.flat(Infinity).filter(Boolean);
  if (!items.length) return null;
  return h('div.list', { role: 'list', 'aria-label': label || null }, items);
}
export function dot(color, label) {
  return h('span.dot', { style: color ? { background: color } : null, 'aria-hidden': label ? null : 'true', title: label || null });
}
export function optDot(colorName) {
  return h('span.dot', { style: { background: `var(--o-${/^[a-z]+$/.test(colorName || '') && colorName !== 'default' ? colorName : 'gray'})` }, 'aria-hidden': 'true' });
}
export function healthWord(level) {
  const label = { red: t('hRed'), amber: t('hAmber'), green: t('hGreen') }[level];
  return h(`span.health.${level}`, h('i', { 'aria-hidden': 'true' }), label);
}
export function quiet({ glyph = 'clock', text, right, href, onclick, label }) {
  const inner = [h('span.g', icon(glyph)), h('span.qt', text), h('span.qr', right || null, h('span.chev', icon('chev')))];
  return href
    ? h('a.quiet', { href, role: 'listitem', 'aria-label': label || null }, inner)
    : h('button.quiet', { type: 'button', onclick, role: 'listitem', 'aria-label': label || null }, inner);
}
export function alertRow({ text, action }) {
  // The failure is said in words; red stays for the sidebar mark and the run itself.
  return h('div.alert', { role: 'status' }, h('span.g', icon('bolt')), h('span.at', text), h('span.spacer'), action || null);
}
export function banner(text, action) {
  return h('div.banner', { role: 'status' }, h('span.bt', text), action || null);
}
export function skeleton(n = 5) {
  return h('div.list.sk', { 'aria-busy': 'true', 'aria-label': t('loading') }, Array.from({ length: n }, (_, i) =>
    h('div.row', h('span.g'), h('div', h('i.skl', { style: { width: `${70 - i * 8}%` } }), h('i.skl.s', { style: { width: '30%' } })), h('span'))));
}
export function empty(text, sub) {
  return h('div.empty', h('p', text), sub ? h('p.sub', sub) : null);
}
export function btn(label, { primary = false, glyph, onclick, href, kbd, disabled, cls = '' } = {}) {
  const kids = [glyph ? icon(glyph) : null, h('span', label), kbd ? h('span.kbd', kbd) : null];
  const c = `btn${primary ? '.primary' : ''}${cls ? '.' + cls : ''}`;
  return href ? h(`a.${c}`, { href }, kids) : h(`button.${c}`, { type: 'button', onclick, disabled: disabled || null }, kids);
}

// ---------- metric strip (doubles as the queue filter) ----------
export function metricStrip(items, selected, onPick) {
  return h('div.metrics', { role: 'group', 'aria-label': t('filterQueue') }, items.map((m) => h(`button.metric${m.n ? '' : '.zero'}`, {
    type: 'button', 'aria-pressed': String(m.key === selected), title: m.formula, 'data-metric': m.key,
    onclick: () => onPick(m.key),
  }, h('b.num', String(m.n)), h('span', m.label))));
}

// ---------- the row ----------
// desc = { id, glyph, title, meta: [], fact: {text, cls}, pending, primary: {label, glyph, run},
//          snooze, sourceUrl, open(), menu() }
export function row(desc) {
  const acts = h('div.acts', { role: 'group', 'aria-label': t('actions') },
    desc.primary ? ibtn(desc.primary.label, desc.primary.glyph || 'check', desc.primary.run, 'primary') : null,
    desc.snooze ? ibtn(t('aSnooze'), 'snooze', desc.snooze) : null,
    desc.sourceUrl ? h('a.ibtn', { href: desc.sourceUrl, target: '_blank', rel: 'noopener', 'aria-label': t('aOpenSource'), title: t('aOpenSource'), onclick: (e) => e.stopPropagation() }, icon('open')) : null,
    desc.menu ? ibtn(t('aMore'), 'more', desc.menu) : null);
  const fact = desc.pending
    ? h('span.rr', { title: t('pendingSync') }, h('span.pend', icon('clock')), desc.fact?.text || '')
    : desc.fact?.text ? h(`span.rr${desc.fact.cls ? '.' + desc.fact.cls : ''}`, desc.fact.text) : h('span.rr');
  const meta = (desc.meta || []).filter(Boolean);
  const el = h('div.row', {
    role: 'listitem', tabindex: '0', 'data-row': '', 'data-id': desc.id,
    'aria-label': [desc.title, ...meta.map((m) => (typeof m === 'string' ? m : m.textContent)), desc.fact?.text].filter(Boolean).join(', '),
    onclick: (e) => { if (!e.target.closest('.acts, a')) desc.open?.(); },
    onkeydown: (e) => { if (e.key === 'Enter' && e.target === el) { e.preventDefault(); desc.open?.(); } },
  },
  h('span.g', desc.glyph === 'checkbox' ? h('span.cb', { 'aria-hidden': 'true' }) : icon(desc.glyph || 'more')),
  h('div.rb', h('div.rt', desc.title), meta.length ? h('div.rm', meta.map((m, i) => [i ? h('span.sep', { 'aria-hidden': 'true' }) : null, typeof m === 'string' ? h('span', m) : m])) : null),
  h('div.re', fact, acts));
  el._ct = desc;
  return withGestures(el, desc);
}
function ibtn(label, glyph, run, extra) {
  return h(`button.ibtn${extra ? '.' + extra : ''}`, { type: 'button', 'aria-label': label, title: label, onclick: (e) => { e.stopPropagation(); run(); } }, icon(glyph));
}

// Swipe right = primary action, swipe left = snooze (a long swipe opens the
// date choice), long press = menu. Mouse users get hover actions instead.
function withGestures(row, desc) {
  if (canHover() && !isPhone()) return row;
  const right = desc.primary?.run;
  const left = desc.snooze;
  const wrap = h('div.swipewrap', { role: 'none' },
    h('div.swipebg', { 'aria-hidden': 'true' },
      h('div.l', icon(desc.primary?.glyph || 'check'), desc.primary?.label || ''),
      h('div.r', left ? t('aSnooze') : '', left ? icon('snooze') : null)),
    row);
  let sx = 0; let sy = 0; let dx = 0; let tracking = false; let decided = false; let horiz = false; let lp;
  const reset = () => { row.style.transform = ''; wrap.classList.remove('dragging', 'go-l', 'go-r'); };
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('button, a, input')) return;
    sx = e.clientX; sy = e.clientY; dx = 0; tracking = true; decided = false; horiz = false;
    lp = setTimeout(() => { tracking = false; reset(); desc.menu?.(); }, 550);
  });
  row.addEventListener('pointermove', (e) => {
    if (!tracking) return;
    const mx = e.clientX - sx; const my = e.clientY - sy;
    if (Math.abs(mx) > 8 || Math.abs(my) > 8) clearTimeout(lp);
    if (!decided && (Math.abs(mx) > 10 || Math.abs(my) > 10)) { decided = true; horiz = Math.abs(mx) > Math.abs(my); }
    if (!horiz) return;
    dx = mx;
    if (dx < 0 && !left) dx = Math.max(dx, -16);
    if (dx > 0 && !right) dx = Math.min(dx, 16);
    wrap.classList.add('dragging');
    wrap.classList.toggle('go-r', dx > 0);
    wrap.classList.toggle('go-l', dx < 0);
    row.style.transform = `translateX(${dx}px)`;
  });
  const end = () => {
    clearTimeout(lp);
    if (!tracking) return;
    tracking = false;
    const w = row.offsetWidth || 360;
    reset();
    if (!horiz) return;
    if (dx > Math.min(110, w * 0.3) && right) right();
    else if (dx < -w * 0.6 && left && desc.snoozePick) desc.snoozePick();
    else if (dx < -Math.min(110, w * 0.3) && left) left();
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', () => { clearTimeout(lp); tracking = false; reset(); });
  row.addEventListener('contextmenu', (e) => { if (desc.menu) { e.preventDefault(); desc.menu(); } });
  return wrap;
}

// Option list for a sheet: every option a button, the Notion color as a dot.
export function optionList(options, current, onPick) {
  return h('div.optlist', { role: 'listbox' }, options.map((o) => h('button.opt', {
    type: 'button', role: 'option', 'aria-selected': String(o.value === current),
    onclick: () => onPick(o.value),
  }, o.color !== undefined ? optDot(o.color) : null, h('span.ol', o.label), o.value === current ? h('span.ok', icon('check')) : (o.hint ? h('span.oh', o.hint) : null))));
}
export function chips(options, current, onPick, { label } = {}) {
  return h('div.chiprow', { role: 'group', 'aria-label': label || null }, options.map((o) => h('button.chip', {
    type: 'button', 'aria-pressed': String(o.value === current), onclick: () => onPick(o.value),
  }, o.color ? dot(o.color) : null, o.label)));
}
export function seg(options, current, onPick, { label } = {}) {
  return h('div.seg', { role: 'group', 'aria-label': label || null }, options.map((o) => h('button', {
    type: 'button', 'aria-pressed': String(o.value === current), onclick: () => onPick(o.value),
  }, o.label, o.n ? h('span.c', String(o.n)) : null)));
}
export function textFilters(options, current, onPick) {
  return h('div.tfilters', { role: 'group' }, options.map((o) => h('button', {
    type: 'button', 'aria-pressed': String(o.value === current), onclick: () => onPick(o.value),
  }, o.label)));
}
