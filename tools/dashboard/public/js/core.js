// Small shared pieces: element builder, icons, per-device settings, app state.

import { setLang } from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// h('div.cls', {attrs}, ...children). Text is always escaped.
export function h(tag, attrs, ...kids) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk, sv); }
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false || kid === '') continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// replaceChildren that skips empty values, like h() does.
export function fill(el, ...kids) {
  el.replaceChildren(...kids.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false && k !== '').map((k) => (k instanceof Node ? k : document.createTextNode(String(k)))));
  return el;
}

// Outline glyphs on a 20px grid, stroke = currentColor (from the v2 canvas).
const P = {
  today: 'M3.5 9.5L10 4l6.5 5.5V16a1 1 0 01-1 1H12v-4.5H8V17H4.5a1 1 0 01-1-1z',
  inbox: 'M3 11l2-6.5h10L17 11v5H3zM3 11h4l1 2h4l1-2h4',
  projects: 'M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z',
  plus: 'M10 4.5v11M4.5 10h11',
  more: 'M5 10h.01M10 10h.01M15 10h.01',
  bolt: 'M11 2.5L4.5 11.5h5l-1 6 6.5-9h-5z',
  gear: 'M10 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4',
  chat: 'M3.5 5h13v8.5H8L4.5 16v-2.5h-1z',
  mail: 'M3 4.5h14v11H3zM3.5 5.5L10 10.5l6.5-5',
  risk: 'M10 3.5l7 12.5H3zM10 8.5v3.2M10 13.8v.1',
  check: 'M4.5 10.5l3.5 3.5 7.5-8',
  snooze: 'M10 5a6 6 0 110 12 6 6 0 010-12zM10 8v3l2 1.2M4 4.5l2-1.5M16 4.5l-2-1.5',
  open: 'M8 4.5H4.5v11h11V12M11 3.5h5.5V9M16.5 3.5L9 11',
  clock: 'M10 3.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM10 6.5V10l2.5 1.5',
  archive: 'M3 4h14v3.5H3zM4.5 7.5V16h11V7.5M8 10.5h4',
  chev: 'M8 5.5l4.5 4.5L8 14.5',
  back: 'M12 5L7 10l5 5',
  doc: 'M5.5 3h6l3 3v11h-9zM11.5 3v3h3',
  cal: 'M3.5 5h13v11.5h-13zM3.5 8.5h13M7 3v3.5M13 3v3.5',
  scale: 'M10 3.5v13M4.5 6.5h11M4.5 6.5l-2.5 5h5zM15.5 6.5l-2.5 5h5z',
  search: 'M8.5 3.5a5 5 0 110 10 5 5 0 010-10zM12.2 12.2L16.5 16.5',
  x: 'M5.5 5.5l9 9M14.5 5.5l-9 9',
  refresh: 'M15.5 10a5.5 5.5 0 11-1.8-4.1M15.5 4v3.5H12',
  skill: 'M10 2.5l2 5 5.5.5-4.2 3.6 1.3 5.4L10 14.2 5.4 17l1.3-5.4L2.5 8l5.5-.5z',
  note: 'M5 3.5h10v13H5zM7.5 7h5M7.5 10h5M7.5 13h3',
  globe: 'M10 3a7 7 0 110 14 7 7 0 010-14zM3 10h14M10 3c2 2 2.8 4.5 2.8 7S12 15 10 17c-2-2-2.8-4.5-2.8-7S8 5 10 3z',
  key: 'M3 6h14v8H3zM6 9h.01M9 9h.01M12 9h.01M6.5 11.5h7',
};
export function icon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 20 20');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', P[name] || P.more);
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', name === 'more' ? '2.6' : '1.6');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  s.append(p);
  return s;
}

// ---------- per-device storage (never required to work) ----------
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable or full */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
export const settings = Object.assign({ lang: null, theme: 'system', hidden: [], swapTurn: false, keysHintSeen: false }, store.get('ct.settings', {}));
// Which projects are on the board is stored in Notion now (Projects > Dashboard),
// so an old per-device list must not hide anything.
settings.hidden = [];
export function saveSettings() { store.set('ct.settings', settings); }
export function applyLang() {
  const lang = settings.lang || (navigator.language || 'en').slice(0, 2);
  setLang(lang === 'uk' ? 'uk' : 'en');
  document.documentElement.lang = lang === 'uk' ? 'uk' : 'en';
}

// Shared app state. ov = /api/overview, cfg = /api/config.
export const state = {
  cfg: null, ov: null, inbox: null, auto: null, sections: new Map(), stateDocs: new Map(),
  offline: false, savedAt: null, loadError: null, pending: new Set(), filter: null, focusIdx: -1,
};
export const ctx = () => ({ cfg: state.cfg, ov: state.ov, hidden: settings.hidden, swapTurn: settings.swapTurn });
export const isPhone = () => window.matchMedia('(max-width: 899px)').matches;
export const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
