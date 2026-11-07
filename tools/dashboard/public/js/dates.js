// Dates, one rule for the whole app (handoff v2, section 5):
//   under 7 days relative ("today 15:00", "tomorrow", "Mon", "3d"),
//   older "4 Nov", the year only when it differs, overdue "2d late",
//   age "3d" without "ago". No ISO timestamps anywhere.
// Pure functions: no DOM, safe to import in node tests.

import { t, getLang } from './i18n.js';

const ctx = { tz: 'UTC', now: () => new Date() };
export function setDateContext({ tz, now } = {}) {
  if (tz) ctx.tz = tz;
  if (now) ctx.now = now;
}
const locale = () => (getLang() === 'uk' ? 'uk-UA' : 'en-GB');

export const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: ctx.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export const today = () => ymd(ctx.now());
export const nowMs = () => ctx.now().getTime();
export const hasTime = (iso) => typeof iso === 'string' && iso.length > 10;
export function dayOf(iso) {
  if (!iso) return null;
  return hasTime(iso) ? ymd(new Date(iso)) : iso.slice(0, 10);
}
export function addDays(day, n) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const dayNum = (day) => Date.parse(day + 'T00:00:00Z') / 86400000;
// Calendar days from today to iso: negative = in the past.
export function diffDays(iso) {
  const d = dayOf(iso);
  return d === null ? null : Math.round(dayNum(d) - dayNum(today()));
}
// Whole days since iso (0 = today). Never negative.
export function ageDays(iso) {
  const n = diffDays(iso);
  return n === null ? null : Math.max(0, -n);
}
// Working days (Mon to Fri, no holidays) from iso to today.
export function workdaysSince(iso) {
  if (!iso) return 0;
  let d = dayOf(iso);
  const end = today();
  let n = 0;
  for (let i = 0; d < end && i < 2000; i++) {
    d = addDays(d, 1);
    const wd = new Date(d + 'T00:00:00Z').getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}
export function nextWeekday(from, weekday) {
  let d = addDays(from, 1);
  for (let i = 0; i < 7 && new Date(d + 'T00:00:00Z').getUTCDay() !== weekday; i++) d = addDays(d, 1);
  return d;
}

export const timeOf = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: ctx.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
function weekday(iso) {
  const d = hasTime(iso) ? new Date(iso) : new Date(iso.slice(0, 10) + 'T12:00:00Z');
  return new Intl.DateTimeFormat(locale(), { weekday: 'short', timeZone: hasTime(iso) ? ctx.tz : 'UTC' }).format(d).replace('.', '');
}
export function shortDate(iso) {
  const d = hasTime(iso) ? new Date(iso) : new Date(iso.slice(0, 10) + 'T12:00:00Z');
  const opts = { day: 'numeric', month: 'short', timeZone: hasTime(iso) ? ctx.tz : 'UTC' };
  if (dayOf(iso).slice(0, 4) !== today().slice(0, 4)) opts.year = 'numeric';
  return new Intl.DateTimeFormat(locale(), opts).format(d).replace(/\.$/, '');
}

// Age of something that happened: "today", "3d", "4 Nov".
export function fmtAge(iso) {
  const n = ageDays(iso);
  if (n === null) return '';
  if (n === 0) return t('dToday');
  if (n < 7) return t('dAge', { n });
  return shortDate(iso);
}
// A due date: { text, late }.
export function fmtDue(iso) {
  const n = diffDays(iso);
  if (n === null) return { text: '', late: false };
  if (n < 0) return { text: t('dLate', { n: -n }), late: true };
  if (n === 0) return { text: t('dToday'), late: false };
  if (n === 1) return { text: t('dTomorrow'), late: false };
  if (n < 7) return { text: weekday(iso), late: false };
  return { text: shortDate(iso), late: false };
}
// A coming date with "in 2d" (risk trigger): { text, late }.
export function fmtIn(iso) {
  const n = diffDays(iso);
  if (n === null) return { text: '', late: false };
  if (n < 0) return { text: t('dLate', { n: -n }), late: true };
  if (n === 0) return { text: t('dToday'), late: false };
  if (n < 7) return { text: t('dIn', { n }), late: false };
  return { text: shortDate(iso), late: false };
}
// An event (meeting, run): "today 15:00", "tomorrow 10:00", "Mon 10:00", "3d", "4 Nov".
export function fmtWhen(iso) {
  if (!iso) return '';
  const n = diffDays(iso);
  const tm = hasTime(iso) ? ` ${timeOf(iso)}` : '';
  if (n === 0) return t('dToday') + tm;
  if (n === 1) return t('dTomorrow') + tm;
  if (n === -1) return t('dYesterday') + tm;
  if (n > 1 && n < 7) return weekday(iso) + tm;
  if (n < 0 && n > -7) return t('dAge', { n: -n });
  return shortDate(iso);
}
// "in 40 min" / "in 2h" for an event later today.
export function fmtSoon(iso) {
  if (!hasTime(iso)) return '';
  const mins = Math.round((Date.parse(iso) - nowMs()) / 60000);
  if (mins < 0 || diffDays(iso) !== 0) return '';
  if (mins < 60) return t('dInMin', { n: Math.max(1, mins) });
  return t('dInH', { n: Math.round(mins / 60) });
}

// ISO dates and timestamps are cut out of titles before they are shown.
const ISO_RE = /[\s(\[]*\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b[)\]]?/g;
export function cleanTitle(s) {
  if (!s) return '';
  const out = String(s).replace(ISO_RE, '').replace(/\s*[-·,:|/]+\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  return out || String(s).trim();
}
export const hasIso = (s) => /\d{4}-\d{2}-\d{2}/.test(String(s || ''));
